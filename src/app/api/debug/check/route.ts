import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  // 1. 네이버 웍스에서 첫 번째 유저의 organizations 구조 확인
  const domainId = process.env.NAVER_WORKS_DOMAIN_ID!;
  const res = await fetch(
    `https://www.worksapis.com/v1.0/users?domainId=${domainId}`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );
  const worksData = await res.json();
  const firstUser = worksData.users?.[0];

  // 2. Supabase에 저장된 데이터 확인
  const { data: dbUsers } = await supabaseAdmin
    .from("users")
    .select("name, department, department_id, position")
    .limit(3);

  return NextResponse.json({
    worksFirstUserOrganizations: firstUser?.organizations,
    worksFirstUserName: firstUser?.userName,
    dbUsers,
  });
}
