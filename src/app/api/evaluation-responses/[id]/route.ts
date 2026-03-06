import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH: 응답 수정 (임시저장 업데이트 / 최종 제출)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // 현재 사용자 UUID 조회
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("naver_works_id", session.userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  // 응답 조회 + assignment join으로 소유자 확인
  const { data: existingResponse } = await supabaseAdmin
    .from("evaluation_responses")
    .select(
      `
      *,
      assignment:evaluation_assignments!evaluation_responses_assignment_id_fkey(
        id, evaluator_id,
        cycle:evaluation_cycles!evaluation_assignments_cycle_id_fkey(status)
      )
    `
    )
    .eq("id", id)
    .single();

  if (!existingResponse) {
    return NextResponse.json({ error: "응답을 찾을 수 없습니다" }, { status: 404 });
  }

  const assignment = existingResponse.assignment as {
    id: string;
    evaluator_id: string;
    cycle: { status: string } | null;
  } | null;

  if (!assignment || assignment.evaluator_id !== currentUser.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
  }

  // 이미 제출된 응답은 수정 불가
  if (existingResponse.submitted_at) {
    return NextResponse.json({ error: "이미 제출된 평가입니다" }, { status: 400 });
  }

  // 업데이트 데이터 구성
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.scores !== undefined) {
    updates.scores = body.scores;
  }

  // 최종 제출
  if (body.submit === true) {
    updates.submitted_at = new Date().toISOString();
  }

  const { data: response, error } = await supabaseAdmin
    .from("evaluation_responses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 제출 시 assignment status → completed
  if (body.submit === true && assignment) {
    await supabaseAdmin
      .from("evaluation_assignments")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", assignment.id);
  }

  return NextResponse.json({ response });
}
