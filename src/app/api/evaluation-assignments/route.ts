import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: 해당 회차의 배정 목록
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const cycleId = request.nextUrl.searchParams.get("cycle_id");
  if (!cycleId) {
    return NextResponse.json({ error: "cycle_id는 필수입니다" }, { status: 400 });
  }

  const { data: assignments, error } = await supabaseAdmin
    .from("evaluation_assignments")
    .select(
      `
      *,
      evaluator:users!evaluation_assignments_evaluator_id_fkey(id, name, department, position, avatar_url),
      evaluatee:users!evaluation_assignments_evaluatee_id_fkey(id, name, department, position, avatar_url)
    `
    )
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments });
}

// POST: 배정 생성 (단건/다건)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const { cycle_id, assignments } = body;

  if (!cycle_id) {
    return NextResponse.json({ error: "cycle_id는 필수입니다" }, { status: 400 });
  }
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: "배정 목록이 필요합니다" }, { status: 400 });
  }

  // 유효성 검증
  for (const a of assignments) {
    if (!a.evaluator_id || !a.evaluatee_id || !a.relation_type) {
      return NextResponse.json(
        { error: "각 배정에 evaluator_id, evaluatee_id, relation_type이 필요합니다" },
        { status: 400 }
      );
    }
  }

  // 기존 배정 조회 (중복 방지)
  const { data: existing } = await supabaseAdmin
    .from("evaluation_assignments")
    .select("evaluator_id, evaluatee_id, relation_type")
    .eq("cycle_id", cycle_id);

  const existingSet = new Set(
    (existing || []).map(
      (e) => `${e.evaluator_id}|${e.evaluatee_id}|${e.relation_type}`
    )
  );

  // 중복 제외한 새 배정만 필터링
  const newAssignments = assignments
    .filter(
      (a: { evaluator_id: string; evaluatee_id: string; relation_type: string }) =>
        !existingSet.has(`${a.evaluator_id}|${a.evaluatee_id}|${a.relation_type}`)
    )
    .map((a: { evaluator_id: string; evaluatee_id: string; relation_type: string }) => ({
      cycle_id,
      evaluator_id: a.evaluator_id,
      evaluatee_id: a.evaluatee_id,
      relation_type: a.relation_type,
    }));

  if (newAssignments.length === 0) {
    return NextResponse.json(
      { message: "모든 배정이 이미 존재합니다", created: 0 },
      { status: 200 }
    );
  }

  const { data: created, error } = await supabaseAdmin
    .from("evaluation_assignments")
    .insert(newAssignments)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { assignments: created, created: created?.length || 0 },
    { status: 201 }
  );
}
