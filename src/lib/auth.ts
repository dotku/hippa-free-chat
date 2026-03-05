import { auth0 } from "./auth0";
import { prisma } from "./prisma";

export async function getRequiredUser() {
  let session;
  try {
    session = await auth0.getSession();
  } catch {
    return null;
  }
  if (!session?.user) return null;

  const { sub, email, name, picture } = session.user;
  const userEmail = email || `${sub}@auth0.local`;

  // Find by Auth0 ID first
  let user = await prisma.user.findUnique({
    where: { auth0Id: sub },
  });

  if (!user) {
    // Check if a pre-seeded record exists for this email (e.g. provider)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingByEmail) {
      // Link Auth0 ID to the pre-seeded record
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          auth0Id: sub,
          name: name || existingByEmail.name,
          avatar: (picture as string) || existingByEmail.avatar,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          auth0Id: sub,
          email: userEmail,
          name: name || userEmail.split("@")[0] || "User",
          avatar: (picture as string) || null,
        },
      });
    }
  }

  return user;
}
