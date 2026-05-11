import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/reports") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Dashboard routes require a token stored in a cookie OR allow client-side redirect
  // Since JWT is stored in localStorage (client-only), we can't check it here.
  // The individual dashboard pages handle the redirect via useAuth.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
