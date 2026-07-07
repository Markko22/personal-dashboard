import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "dashboard_auth";

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
