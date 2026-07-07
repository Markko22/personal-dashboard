import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  getExpectedAuthToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { token: string };
};

export function GET(request: Request, { params }: RouteContext) {
  const expectedToken = getExpectedAuthToken();

  if (!expectedToken || params.token !== expectedToken) {
    return NextResponse.redirect(new URL("/aziendali", request.url));
  }

  const response = NextResponse.redirect(new URL("/tutti", request.url));
  response.cookies.set(AUTH_COOKIE_NAME, params.token, AUTH_COOKIE_OPTIONS);
  return response;
}
