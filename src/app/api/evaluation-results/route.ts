import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: 회차별 결과 목록
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const cycleId = request.nextUrl.searchParams.get("cycle_id");
  if (!cycleId) {
    return NextResponse.json({ error: "cycle_id는 필수입니다" }, { status: 400 });
  }

  // 결과 목록 + 사용자 정보 join
  const { data: results, error } = await supabaseAdmin
    .from("evaluation_results")
    .select(
      `
      *,
      user:users!evaluation_results_user_id_fkey(id, name, department, position, avatar_url)
    `
    )
    .eq("cycle_id", cycleId)
    .order("total_score", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 해당 회차의 배정 통계 (완료율 계산용)
  const { data: assignments } = await supabaseAdmin
    .from("evaluation_assignments")
    .select("id, status")
    .eq("cycle_id", cycleId);

  const totalAssignments = assignments?.length || 0;
  const completedAssignments =
    assignments?.filter((a) => a.status === "completed").length || 0;

  return NextResponse.json({
    results: results || [],
    stats: {
      totalAssignments,
      completedAssignments,
      completionRate:
        totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0,
    },
  });
}

// POST: 결과 집계 실행
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const { cycle_id } = body;

  if (!cycle_id) {
    return NextResponse.json({ error: "cycle_id는 필수입니다" }, { status: 400 });
  }

  // 1. 회차 + 연결된 템플릿 조회
  const { data: cycle } = await supabaseAdmin
    .from("evaluation_cycles")
    .select("id, title, type, status")
    .eq("id", cycle_id)
    .single();

  if (!cycle) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다" }, { status: 404 });
  }

  // 템플릿 조회 (cycle_id로 연결된 것)
  const { data: template } = await supabaseAdmin
    .from("evaluation_templates")
    .select("id, items")
    .eq("cycle_id", cycle_id)
    .single();

  const templateItems: { category: string; question: string; type: string; weight: number }[] =
    template?.items || [];

  // score 타입 항목만 필터 + 총 가중치 계산
  const scoreItems = templateItems.filter((item) => item.type === "score");
  const totalWeight = scoreItems.reduce((sum, item) => sum + (item.weight || 0), 0);

  // 2. 해당 회차의 모든 배정 + 제출된 응답 조회
  const { data: assignments } = await supabaseAdmin
    .from("evaluation_assignments")
    .select("id, evaluatee_id, relation_type")
    .eq("cycle_id", cycle_id);

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "배정이 없습니다" }, { status: 400 });
  }

  const assignmentIds = assignments.map((a) => a.id);

  const { data: responses } = await supabaseAdmin
    .from("evaluation_responses")
    .select("id, assignment_id, scores, submitted_at")
    .in("assignment_id", assignmentIds)
    .not("submitted_at", "is", null);

  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: "제출된 응답이 없습니다" }, { status: 400 });
  }

  // 3. assignment_id → evaluatee_id 매핑
  const assignmentMap: Record<string, { evaluatee_id: string; relation_type: string }> = {};
  for (const a of assignments) {
    assignmentMap[a.id] = { evaluatee_id: a.evaluatee_id, relation_type: a.relation_type };
  }

  // 4. 피평가자별로 응답 그룹핑
  const evaluateeResponses: Record<
    string,
    { scores: { item_id: number; score: number; comment?: string }[]; relation_type: string }[]
  > = {};

  for (const r of responses) {
    const assignment = assignmentMap[r.assignment_id];
    if (!assignment) continue;

    const { evaluatee_id, relation_type } = assignment;
    if (!evaluateeResponses[evaluatee_id]) {
      evaluateeResponses[evaluatee_id] = [];
    }
    evaluateeResponses[evaluatee_id].push({
      scores: r.scores || [],
      relation_type,
    });
  }

  // 5. 피평가자별 가중평균 계산
  const resultsToUpsert: {
    cycle_id: string;
    user_id: string;
    total_score: number;
    grade: string;
  }[] = [];

  for (const [userId, responsesList] of Object.entries(evaluateeResponses)) {
    let totalScore = 0;

    if (scoreItems.length > 0 && totalWeight > 0) {
      // 항목별 평균 점수 계산
      for (const item of scoreItems) {
        const itemIdx = templateItems.indexOf(item);
        const scores: number[] = [];

        for (const resp of responsesList) {
          const scoreEntry = resp.scores.find(
            (s: { item_id: number; score?: number }) => s.item_id === itemIdx && s.score != null
          );
          if (scoreEntry && scoreEntry.score != null) {
            scores.push(scoreEntry.score);
          }
        }

        const itemAvg = scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;

        totalScore += itemAvg * (item.weight / totalWeight);
      }
    } else {
      // 템플릿이 없으면 전체 score 평균
      const allScores: number[] = [];
      for (const resp of responsesList) {
        for (const s of resp.scores) {
          if (s.score != null) allScores.push(s.score);
        }
      }
      totalScore = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : 0;
    }

    // 소수점 2자리 반올림
    totalScore = Math.round(totalScore * 100) / 100;

    // 등급 산출
    let grade: string;
    if (totalScore >= 4.5) grade = "S";
    else if (totalScore >= 3.5) grade = "A";
    else if (totalScore >= 2.5) grade = "B";
    else if (totalScore >= 1.5) grade = "C";
    else grade = "D";

    resultsToUpsert.push({ cycle_id, user_id: userId, total_score: totalScore, grade });
  }

  // 6. 기존 결과 삭제 후 재생성 (재집계)
  await supabaseAdmin
    .from("evaluation_results")
    .delete()
    .eq("cycle_id", cycle_id);

  const { data: created, error } = await supabaseAdmin
    .from("evaluation_results")
    .insert(resultsToUpsert)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `${created?.length || 0}명의 결과가 집계되었습니다`,
    count: created?.length || 0,
  });
}
