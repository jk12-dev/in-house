import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: 평가 회차 목록 (?type=360 | ?type=performance)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type");

  let query = supabaseAdmin
    .from("evaluation_cycles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data: cycles, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cycles });
}

// POST: 평가 회차 생성
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const { title, type, start_date, end_date, description, template_id } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "회차 제목은 필수입니다" }, { status: 400 });
  }
  if (!type || !["360", "performance"].includes(type)) {
    return NextResponse.json({ error: "유효한 평가 유형이 필요합니다" }, { status: 400 });
  }
  if (!start_date || !end_date) {
    return NextResponse.json({ error: "시작일과 종료일은 필수입니다" }, { status: 400 });
  }

  // 세션의 naver_works_id로 Supabase user UUID 조회
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("naver_works_id", session.userId)
    .single();

  // 회차 생성
  const { data: cycle, error } = await supabaseAdmin
    .from("evaluation_cycles")
    .insert({
      title: title.trim(),
      type,
      start_date,
      end_date,
      description: description?.trim() || null,
      created_by: currentUser?.id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 양식 연결 (선택)
  if (template_id && cycle) {
    await supabaseAdmin
      .from("evaluation_templates")
      .update({ cycle_id: cycle.id, updated_at: new Date().toISOString() })
      .eq("id", template_id);
  }

  return NextResponse.json({ cycle }, { status: 201 });
}
