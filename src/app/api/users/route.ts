import { NextRequest, NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/users?search=xxx - Search users for starting conversations
export async function GET(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") || "";
  const role = req.nextUrl.searchParams.get("role");

  // Patients can only see providers (privacy protection)
  const roleFilter =
    user.role === "PATIENT"
      ? { role: "PROVIDER" as const }
      : role
        ? { role: role as "PATIENT" | "PROVIDER" | "ADMIN" }
        : {};

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: user.id } },
        roleFilter,
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
