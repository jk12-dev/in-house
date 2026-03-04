import { cookies } from "next/headers";

export interface Session {
  userId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  accessToken: string;
  refreshToken: string;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) return null;

  try {
    return JSON.parse(sessionCookie.value) as Session;
  } catch {
    return null;
  }
}
