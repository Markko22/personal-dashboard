import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isValidAuthToken } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!isValidAuthToken(token)) {
    return NextResponse.redirect(
      new URL("/private/accesso-richiesto", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/personali/:path*", "/tutti/:path*"],
};
