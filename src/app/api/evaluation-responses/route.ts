import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: 특정 배정의 응답 조회
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const assignmentId = request.nextUrl.searchParams.get("assignment_id");
  if (!assignmentId) {
    return NextResponse.json({ error: "assignment_id는 필수입니다" }, { status: 400 });
  }

  // 현재 사용자 UUID 조회
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("naver_works_id", session.userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  // assignment 소유자 검증
  const { data: assignment } = await supabaseAdmin
    .from("evaluation_assignments")
    .select("evaluator_id")
    .eq("id", assignmentId)
    .single();

  if (!assignment || assignment.evaluator_id !== currentUser.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
  }

  // 응답 조회
  const { data: response } = await supabaseAdmin
    .from("evaluation_responses")
    .select("*")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  return NextResponse.json({ response: response || null });
}

// POST: 새 응답 생성 (임시저장)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const { assignment_id, scores } = body;

  if (!assignment_id) {
    return NextResponse.json({ error: "assignment_id는 필수입니다" }, { status: 400 });
  }

  // 현재 사용자 UUID 조회
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("naver_works_id", session.userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  // assignment 소유자 검증 + cycle status 확인
  const { data: assignment } = await supabaseAdmin
    .from("evaluation_assignments")
    .select(
      `
      evaluator_id,
      cycle:evaluation_cycles!evaluation_assignments_cycle_id_fkey(status)
    `
    )
    .eq("id", assignment_id)
    .single();

  if (!assignment || assignment.evaluator_id !== currentUser.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
  }

  const cycle = assignment.cycle as { status: string } | null;
  if (cycle?.status !== "active") {
    return NextResponse.json({ error: "평가 기간이 아닙니다" }, { status: 400 });
  }

  // 응답 생성
  const { data: response, error } = await supabaseAdmin
    .from("evaluation_responses")
    .insert({
      assignment_id,
      scores: scores || [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 응답이 존재합니다" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // assignment status → in_progress
  await supabaseAdmin
    .from("evaluation_assignments")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", assignment_id);

  return NextResponse.json({ response }, { status: 201 });
}
