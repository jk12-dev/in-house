"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Save,
  Send,
} from "lucide-react";

/* ── 타입 ── */
interface TemplateItem {
  category: string;
  question: string;
  type: "score" | "text";
  weight: number;
}

interface Score {
  item_id: number;
  score: number | null;
  comment: string;
}

interface Evaluation {
  id: string;
  cycle_id: string;
  evaluatee_id: string;
  relation_type: string;
  status: string;
  evaluatee: {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
  };
  cycle: {
    id: string;
    title: string;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  response: {
    id: string;
    submitted_at: string | null;
  } | null;
}

interface Template {
  id: string;
  name: string;
  cycle_id: string | null;
  items: TemplateItem[];
}

interface ResponseData {
  id: string;
  assignment_id: string;
  scores: Score[];
  submitted_at: string | null;
}

/* ── 관계 유형 ── */
const relationLabels: Record<string, string> = {
  self: "자기평가",
  superior: "상사평가",
  peer: "동료평가",
  subordinate: "부하평가",
};

/* ── 점수 라벨 ── */
const scoreLabels: Record<number, string> = {
  1: "매우 부족",
  2: "부족",
  3: "보통",
  4: "우수",
  5: "매우 우수",
};

/* ── 날짜 포맷 ── */
function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

/* ── 메인 컴포넌트 ── */
export function EvaluationForm({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  /* ── 데이터 로딩 ── */
  const fetchData = useCallback(async () => {
    try {
      const [evalRes, templateRes, responseRes] = await Promise.all([
        fetch("/api/my-evaluations"),
        fetch("/api/evaluation-templates"),
        fetch(`/api/evaluation-responses?assignment_id=${assignmentId}`),
      ]);

      const evalData = await evalRes.json();
      const templateData = await templateRes.json();
      const responseData = await responseRes.json();

      // 해당 배정 찾기
      const found = (evalData.evaluations || []).find(
        (e: Evaluation) => e.id === assignmentId
      );
      setEvaluation(found || null);

      // 해당 회차의 양식 찾기
      if (found) {
        const tmpl = (templateData.templates || []).find(
          (t: Template) => t.cycle_id === found.cycle_id
        );
        setTemplate(tmpl || null);

        // 기존 응답이 있으면 로드
        const existingResponse = responseData.response as ResponseData | null;
        if (existingResponse) {
          setResponseId(existingResponse.id);
          setSubmitted(!!existingResponse.submitted_at);

          // 기존 scores로 초기화 (template items 기준)
          if (tmpl) {
            const initScores = tmpl.items.map((_: TemplateItem, idx: number) => {
              const existing = (existingResponse.scores || []).find(
                (s: Score) => s.item_id === idx
              );
              return {
                item_id: idx,
                score: existing?.score ?? null,
                comment: existing?.comment ?? "",
              };
            });
            setScores(initScores);
          }
        } else if (tmpl) {
          // 새 응답: 빈 scores 초기화
          setScores(
            tmpl.items.map((_: TemplateItem, idx: number) => ({
              item_id: idx,
              score: null,
              comment: "",
            }))
          );
        }
      }
    } catch {
      console.error("데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 점수 업데이트 ── */
  const updateScore = (idx: number, score: number) => {
    setScores((prev) =>
      prev.map((s) => (s.item_id === idx ? { ...s, score } : s))
    );
    setSaveMessage("");
  };

  /* ── 코멘트 업데이트 ── */
  const updateComment = (idx: number, comment: string) => {
    setScores((prev) =>
      prev.map((s) => (s.item_id === idx ? { ...s, comment } : s))
    );
    setSaveMessage("");
  };

  /* ── 임시저장 ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      if (!responseId) {
        // 첫 저장: POST
        const res = await fetch("/api/evaluation-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment_id: assignmentId, scores }),
        });
        const data = await res.json();
        if (res.ok) {
          setResponseId(data.response.id);
          setSaveMessage("임시저장되었습니다.");
        } else {
          setSaveMessage(`저장 실패: ${data.error}`);
        }
      } else {
        // 수정: PATCH
        const res = await fetch(`/api/evaluation-responses/${responseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores }),
        });
        if (res.ok) {
          setSaveMessage("임시저장되었습니다.");
        } else {
          const data = await res.json();
          setSaveMessage(`저장 실패: ${data.error}`);
        }
      }
    } catch {
      setSaveMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  /* ── 제출 ── */
  const handleSubmit = async () => {
    if (!template) return;

    // 필수값 검증: score 타입 항목에 score가 입력되었는지
    const missingItems = template.items
      .map((item, idx) => ({ item, idx }))
      .filter(
        ({ item, idx }) =>
          item.type === "score" && !scores[idx]?.score
      );

    if (missingItems.length > 0) {
      setSaveMessage("모든 점수 항목을 입력해주세요.");
      return;
    }

    if (!confirm("제출하면 수정할 수 없습니다. 제출하시겠습니까?")) return;

    setSubmitting(true);
    setSaveMessage("");

    try {
      if (!responseId) {
        // 첫 저장 + 제출
        const postRes = await fetch("/api/evaluation-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment_id: assignmentId, scores }),
        });
        const postData = await postRes.json();

        if (postRes.ok) {
          await fetch(`/api/evaluation-responses/${postData.response.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scores, submit: true }),
          });
          setResponseId(postData.response.id);
          setSubmitted(true);
        }
      } else {
        // 기존 응답 제출
        const res = await fetch(`/api/evaluation-responses/${responseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores, submit: true }),
        });
        if (res.ok) {
          setSubmitted(true);
        }
      }
    } catch {
      setSaveMessage("제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-64" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="space-y-6">
        <Link href="/my-evaluations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            나의 평가
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="font-medium mb-1">평가를 찾을 수 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              삭제되었거나 평가 기간이 종료된 항목입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <Link href="/my-evaluations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            나의 평가
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="font-medium mb-1">평가 양식이 설정되지 않았습니다</h3>
            <p className="text-sm text-muted-foreground">
              관리자에게 문의하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 뒤로가기 */}
      <Link href="/my-evaluations">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          나의 평가
        </Button>
      </Link>

      {/* 제출 완료 배너 */}
      {submitted && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">
            이 평가는 제출 완료되었습니다.
          </p>
        </div>
      )}

      {/* 평가 정보 헤더 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2332D9]/10 text-[#2332D9] text-lg font-medium">
              {evaluation.evaluatee.name.slice(0, 1)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {evaluation.evaluatee.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {evaluation.evaluatee.department || "미지정"}
                {evaluation.evaluatee.position
                  ? ` · ${evaluation.evaluatee.position}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-medium">
                  {relationLabels[evaluation.relation_type] ||
                    evaluation.relation_type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {evaluation.cycle.title}
                </span>
                <span>
                  {formatDate(evaluation.cycle.start_date)} ~{" "}
                  {formatDate(evaluation.cycle.end_date)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 평가 항목들 */}
      <div className="space-y-4">
        {template.items.map((item, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">
                    {item.category}
                  </p>
                  <CardTitle className="text-base">{item.question}</CardTitle>
                </div>
                {item.weight > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {item.weight}%
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* 점수 선택 (score 타입) */}
              {item.type === "score" && (
                <div>
                  <div className="flex gap-2 mb-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateScore(idx, n)}
                        disabled={submitted}
                        className={`
                          h-10 w-10 rounded-full text-sm font-medium transition-all
                          ${
                            scores[idx]?.score === n
                              ? "bg-[#2332D9] text-white shadow-sm"
                              : "border border-input bg-transparent hover:bg-[#2332D9]/10 disabled:opacity-50"
                          }
                        `}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1" style={{ maxWidth: "210px" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className="w-10 text-center">
                        {scoreLabels[n]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 코멘트 */}
              <textarea
                placeholder={
                  item.type === "text"
                    ? "의견을 작성하세요"
                    : "의견을 작성하세요 (선택)"
                }
                value={scores[idx]?.comment || ""}
                onChange={(e) => updateComment(idx, e.target.value)}
                disabled={submitted}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 하단 버튼 영역 */}
      {!submitted && (
        <div className="flex items-center justify-between pt-2 pb-8">
          <div>
            {saveMessage && (
              <p
                className={`text-sm ${
                  saveMessage.includes("실패") || saveMessage.includes("오류") || saveMessage.includes("입력")
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {saveMessage}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || submitting}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "저장 중..." : "임시저장"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="bg-[#2332D9] hover:bg-[#1b28b0]"
            >
              <Send className="h-4 w-4 mr-1" />
              {submitting ? "제출 중..." : "제출하기"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
