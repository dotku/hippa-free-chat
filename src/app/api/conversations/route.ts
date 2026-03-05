import { NextRequest, NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getCaseDisplayName(caseData: { caseNumber: number; ageRange: string | null; country: string | null } | null): string {
  if (!caseData) return "New Case";
  const parts = [`Case #${String(caseData.caseNumber).padStart(5, "0")}`];
  const details = [caseData.ageRange, caseData.country].filter(Boolean);
  if (details.length > 0) parts.push(`(${details.join(", ")})`);
  return parts.join(" ");
}

// GET /api/conversations - List user's conversations
export async function GET() {
  try {
    const user = await getRequiredUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
        case: {
          select: { caseNumber: true, ageRange: true, country: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Anonymize patient data if current user is a PROVIDER
    if (user.role === "PROVIDER") {
      for (const conv of conversations) {
        const caseLabel = getCaseDisplayName(conv.case);
        for (const p of conv.participants) {
          if (p.user.role === "PATIENT") {
            p.user.name = caseLabel;
            p.user.avatar = null;
          }
        }
        for (const msg of conv.messages) {
          if (msg.sender.role === "PATIENT") {
            msg.sender.name = caseLabel;
          }
        }
      }
    }

    return NextResponse.json({ conversations, currentUserId: user.id, currentUserRole: user.role });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participantId } = await req.json();
  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  // Check if conversation already exists between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: participantId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true, role: true } },
        },
      },
    },
  });

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: user.id },
          { userId: participantId },
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true, role: true } },
        },
      },
    },
  });

  return NextResponse.json({ conversation });
}
