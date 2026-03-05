import { NextRequest, NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher";

// GET /api/conversations/[id]/participants — List participants
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;

  // Verify requesting user is a participant
  const self = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: user.id,
        conversationId,
      },
    },
  });
  if (!self) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: {
      user: { select: { id: true, name: true, avatar: true, role: true } },
    },
  });

  return NextResponse.json({ participants });
}

// POST /api/conversations/[id]/participants — Add a provider
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const { userId: targetUserId } = await req.json();

  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Verify requesting user is a participant
  const self = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: user.id,
        conversationId,
      },
    },
  });
  if (!self) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Only allow adding PROVIDER role users
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, avatar: true, role: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (targetUser.role !== "PROVIDER") {
    return NextResponse.json(
      { error: "Only providers can be added to conversations" },
      { status: 400 }
    );
  }

  // Check if already a participant
  const existing = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: targetUserId,
        conversationId,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already a participant" },
      { status: 409 }
    );
  }

  // Add participant
  await prisma.conversationParticipant.create({
    data: {
      userId: targetUserId,
      conversationId,
    },
  });

  // Broadcast via Pusher
  const pusher = getPusherServer();
  await pusher.trigger(
    `private-conversation-${conversationId}`,
    "participant-added",
    { participant: { user: targetUser } }
  );

  return NextResponse.json({ participant: { user: targetUser } });
}
