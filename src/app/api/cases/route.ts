import { NextRequest, NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/cases?conversationId=xxx
export async function GET(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );
  }

  const caseData = await prisma.case.findUnique({
    where: { conversationId },
  });

  return NextResponse.json({ case: caseData });
}

// POST /api/cases - Create a case for a conversation
export async function POST(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, country, gender, ageRange, problemDescription } =
    await req.json();
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );
  }

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: { userId: user.id, conversationId },
    },
  });
  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Check if case already exists
  const existing = await prisma.case.findUnique({
    where: { conversationId },
  });
  if (existing) {
    return NextResponse.json({ error: "Case already exists" }, { status: 409 });
  }

  const caseData = await prisma.case.create({
    data: {
      conversationId,
      patientId: user.id,
      country: country || null,
      gender: gender || null,
      ageRange: ageRange || null,
      problemDescription: problemDescription || null,
    },
  });

  return NextResponse.json({ case: caseData });
}

// PATCH /api/cases - Update case fields
export async function PATCH(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, country, gender, ageRange, problemDescription, xrayUrl } =
    await req.json();
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );
  }

  const caseData = await prisma.case.update({
    where: { conversationId },
    data: {
      ...(country !== undefined && { country }),
      ...(gender !== undefined && { gender }),
      ...(ageRange !== undefined && { ageRange }),
      ...(problemDescription !== undefined && { problemDescription }),
      ...(xrayUrl !== undefined && { xrayUrl }),
    },
  });

  return NextResponse.json({ case: caseData });
}
