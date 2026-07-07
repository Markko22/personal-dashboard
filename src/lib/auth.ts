import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "dashboard_auth";

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
};

export function getExpectedAuthToken(): string | undefined {
  return process.env.PRIVATE_PAGE_TOKEN;
}

export function isValidAuthToken(token: string | undefined): boolean {
  const expected = getExpectedAuthToken();
  return Boolean(expected && token && token === expected);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAuthToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}
