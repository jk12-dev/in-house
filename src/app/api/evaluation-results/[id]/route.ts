import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: 개인 상세 결과
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;

  // 결과 + 사용자 정보
  const { data: result } = await supabaseAdmin
    .from("evaluation_results")
    .select(
      `
      *,
      user:users!evaluation_results_user_id_fkey(id, name, department, position, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (!result) {
    return NextResponse.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 });
  }

  // 해당 회차의 템플릿 조회
  const { data: template } = await supabaseAdmin
    .from("evaluation_templates")
    .select("id, name, items")
    .eq("cycle_id", result.cycle_id)
    .single();

  const templateItems: { category: string; question: string; type: string; weight: number }[] =
    template?.items || [];

  // 해당 피평가자의 모든 배정 + 제출 응답 조회
  const { data: assignments } = await supabaseAdmin
    .from("evaluation_assignments")
    .select("id, relation_type")
    .eq("cycle_id", result.cycle_id)
    .eq("evaluatee_id", result.user_id);

  const assignmentIds = (assignments || []).map((a) => a.id);
  const assignmentRelation: Record<string, string> = {};
  for (const a of assignments || []) {
    assignmentRelation[a.id] = a.relation_type;
  }

  let submittedResponses: {
    assignment_id: string;
    scores: { item_id: number; score?: number; comment?: string }[];
  }[] = [];

  if (assignmentIds.length > 0) {
    const { data: responses } = await supabaseAdmin
      .from("evaluation_responses")
      .select("assignment_id, scores")
      .in("assignment_id", assignmentIds)
      .not("submitted_at", "is", null);

    submittedResponses = responses || [];
  }

  // 항목별 점수 집계
  const byItem: {
    index: number;
    category: string;
    question: string;
    type: string;
    weight: number;
    avgScore: number;
    scores: number[];
    comments: string[];
  }[] = templateItems.map((item, idx) => {
    const scores: number[] = [];
    const comments: string[] = [];

    for (const resp of submittedResponses) {
      const entry = (resp.scores || []).find(
        (s: { item_id: number; score?: number; comment?: string }) => s.item_id === idx
      );
      if (entry) {
        if (entry.score != null) scores.push(entry.score);
        if (entry.comment?.trim()) comments.push(entry.comment.trim());
      }
    }

    return {
      index: idx,
      category: item.category,
      question: item.question,
      type: item.type,
      weight: item.weight,
      avgScore: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0,
      scores,
      comments,
    };
  });

  // 관계 유형별 평균 점수
  const byRelation: Record<string, { count: number; avgScore: number }> = {};
  const relationScores: Record<string, number[]> = {};

  for (const resp of submittedResponses) {
    const relType = assignmentRelation[resp.assignment_id] || "unknown";
    if (!relationScores[relType]) relationScores[relType] = [];

    const scoreItems = templateItems
      .map((item, idx) => ({ item, idx }))
      .filter((x) => x.item.type === "score");

    const totalWeight = scoreItems.reduce((sum, x) => sum + (x.item.weight || 0), 0);

    let respScore = 0;
    if (totalWeight > 0) {
      for (const { item, idx } of scoreItems) {
        const entry = (resp.scores || []).find(
          (s: { item_id: number; score?: number }) => s.item_id === idx
        );
        const score = entry?.score || 0;
        respScore += score * ((item.weight || 0) / totalWeight);
      }
    }

    relationScores[relType].push(Math.round(respScore * 100) / 100);
  }

  for (const [relType, scores] of Object.entries(relationScores)) {
    byRelation[relType] = {
      count: scores.length,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    };
  }

  return NextResponse.json({
    result,
    details: {
      templateItems,
      byItem,
      byRelation,
      totalResponses: submittedResponses.length,
    },
  });
}

// PATCH: summary, feedback 수정
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

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.summary !== undefined) updates.summary = body.summary;
  if (body.feedback !== undefined) updates.feedback = body.feedback;

  const { data: result, error } = await supabaseAdmin
    .from("evaluation_results")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result });
}
