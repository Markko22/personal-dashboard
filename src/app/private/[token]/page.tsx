import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getExpectedAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = {
  params: { token: string };
};

export default async function PrivateAuthPage({ params }: Props) {
  const expectedToken = getExpectedAuthToken();

  if (!expectedToken || params.token !== expectedToken) {
    notFound();
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, params.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/tutti");
}
