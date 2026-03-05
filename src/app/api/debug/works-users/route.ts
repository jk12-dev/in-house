import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const domainId = process.env.NAVER_WORKS_DOMAIN_ID!;
  const res = await fetch(
    `https://www.worksapis.com/v1.0/users?domainId=${domainId}`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
