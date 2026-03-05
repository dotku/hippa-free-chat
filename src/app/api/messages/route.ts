import { NextRequest, NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher";
import { scanMessage } from "@/lib/phi-detector";

function getCaseDisplayName(caseData: { caseNumber: number; ageRange: string | null; country: string | null } | null): string {
  if (!caseData) return "New Case";
  const parts = [`Case #${String(caseData.caseNumber).padStart(5, "0")}`];
  const details = [caseData.ageRange, caseData.country].filter(Boolean);
  if (details.length > 0) parts.push(`(${details.join(", ")})`);
  return parts.join(" ");
}

// GET /api/messages?conversationId=xxx
export async function GET(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: user.id,
        conversationId,
      },
    },
  });
  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = 50;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, name: true, avatar: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const result = hasMore ? messages.slice(0, limit) : messages;

  // Anonymize patient senders for providers
  if (user.role === "PROVIDER") {
    const caseData = await prisma.case.findUnique({
      where: { conversationId },
      select: { caseNumber: true, ageRange: true, country: true },
    });
    const caseLabel = getCaseDisplayName(caseData);

    for (const msg of result) {
      if (msg.sender.role === "PATIENT") {
        msg.sender.name = caseLabel;
        msg.sender.avatar = null;
      }
    }
  }

  return NextResponse.json({
    messages: result.reverse(),
    nextCursor: hasMore ? result[0].id : null,
  });
}

// POST /api/messages - Send a message (with PHI scan)
export async function POST(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, content, attachmentUrl, attachmentName, attachmentType } = await req.json();
  if (!conversationId || (!content?.trim() && !attachmentUrl)) {
    return NextResponse.json({ error: "conversationId and content or attachment required" }, { status: 400 });
  }

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: user.id,
        conversationId,
      },
    },
  });
  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // PHI scan (only scan text content)
  const textContent = content?.trim() || "";
  const scanResult = textContent
    ? await scanMessage(textContent)
    : { safe: true as const, reason: "", categories: [] as string[], confidence: 0 };

  if (!scanResult.safe) {
    // Log blocked message for audit
    await prisma.blockedMessage.create({
      data: {
        originalContent: textContent,
        reason: scanResult.reason || "PHI detected",
        categories: scanResult.categories || [],
        senderId: user.id,
        conversationId,
      },
    });

    return NextResponse.json({
      blocked: true,
      reason: scanResult.reason,
      categories: scanResult.categories,
    });
  }

  // Save message
  const message = await prisma.message.create({
    data: {
      content: textContent,
      senderId: user.id,
      conversationId,
      ...(attachmentUrl && { attachmentUrl }),
      ...(attachmentName && { attachmentName }),
      ...(attachmentType && { attachmentType }),
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true, role: true } },
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Broadcast via Pusher
  const pusher = getPusherServer();
  await pusher.trigger(`private-conversation-${conversationId}`, "new-message", {
    id: message.id,
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    attachmentName: message.attachmentName,
    attachmentType: message.attachmentType,
    sender: message.sender,
    createdAt: message.createdAt,
  });

  return NextResponse.json({ message });
}
