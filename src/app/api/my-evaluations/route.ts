import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: 현재 로그인 사용자의 평가 배정 목록
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // naver_works_id → Supabase UUID
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("naver_works_id", session.userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  // 내가 평가자인 배정 목록 (cycle, evaluatee join)
  const { data: assignments, error } = await supabaseAdmin
    .from("evaluation_assignments")
    .select(
      `
      *,
      evaluatee:users!evaluation_assignments_evaluatee_id_fkey(id, name, department, position, avatar_url),
      cycle:evaluation_cycles!evaluation_assignments_cycle_id_fkey(id, title, type, status, start_date, end_date)
    `
    )
    .eq("evaluator_id", currentUser.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // active 회차만 필터
  const activeAssignments = (assignments || []).filter(
    (a) => a.cycle?.status === "active"
  );

  // 해당 배정들의 응답을 별도 조회
  const assignmentIds = activeAssignments.map((a) => a.id);
  let responsesMap: Record<string, { id: string; submitted_at: string | null }> = {};

  if (assignmentIds.length > 0) {
    const { data: responses } = await supabaseAdmin
      .from("evaluation_responses")
      .select("id, assignment_id, submitted_at")
      .in("assignment_id", assignmentIds);

    if (responses) {
      for (const r of responses) {
        responsesMap[r.assignment_id] = { id: r.id, submitted_at: r.submitted_at };
      }
    }
  }

  // 병합
  const evaluations = activeAssignments.map((a) => ({
    ...a,
    response: responsesMap[a.id] || null,
  }));

  return NextResponse.json({ evaluations });
}
