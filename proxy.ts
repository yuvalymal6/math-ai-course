import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];
const IS_PROD = process.env.NODE_ENV === "production";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("math-auth");
  const gradeCookie = request.cookies.get("math-grade");

  // Debug logging for production cookie issues
  console.log("[proxy]", pathname, {
    "math-auth": authCookie?.value ?? "MISSING",
    "math-grade": gradeCookie?.value ?? "MISSING",
    allCookies: request.cookies.getAll().map((c) => c.name),
  });

  // Not authenticated → redirect to login
  if (!authCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but no grade selected → redirect to onboarding
  if (!pathname.startsWith("/onboarding") && !gradeCookie?.value) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Grade selected but no units → redirect to units selection
  const unitsCookie = request.cookies.get("math-units");
  if (!pathname.startsWith("/onboarding") && gradeCookie?.value && !unitsCookie?.value) {
    return NextResponse.redirect(new URL("/onboarding/units", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
  ],
};
