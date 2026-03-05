import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth0 } from "@/lib/auth0";
import { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(req: NextRequest) {
  // Auth0 handles /auth/* routes (login, callback, logout, etc.)
  if (
    req.nextUrl.pathname.startsWith("/auth/") ||
    req.nextUrl.pathname === "/auth"
  ) {
    return auth0.middleware(req);
  }

  // For all other routes, apply i18n middleware (redirects / → /en, etc.)
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
