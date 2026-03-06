"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calculator,
  RefreshCw,
  MessageSquare,
  Save,
} from "lucide-react";

/* ── 타입 ── */
interface Cycle {
  id: string;
  title: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface ResultUser {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
}

interface EvaluationResult {
  id: string;
  cycle_id: string;
  user_id: string;
  total_score: number;
  grade: string;
  summary: string | null;
  feedback: string | null;
  user: ResultUser;
}

interface ResultDetail {
  result: EvaluationResult;
  details: {
    templateItems: { category: string; question: string; type: string; weight: number }[];
    byItem: {
      index: number;
      category: string;
      question: string;
      type: string;
      weight: number;
      avgScore: number;
      scores: number[];
      comments: string[];
    }[];
    byRelation: Record<string, { count: number; avgScore: number }>;
    totalResponses: number;
  };
}

/* ── 등급 스타일 ── */
const gradeConfig: Record<string, { color: string; bg: string }> = {
  S: { color: "text-purple-700", bg: "bg-purple-50" },
  A: { color: "text-blue-700", bg: "bg-blue-50" },
  B: { color: "text-emerald-700", bg: "bg-emerald-50" },
  C: { color: "text-amber-700", bg: "bg-amber-50" },
  D: { color: "text-red-700", bg: "bg-red-50" },
};

function GradeBadge({ grade }: { grade: string }) {
  const config = gradeConfig[grade] || { color: "text-gray-700", bg: "bg-gray-100" };
  return (
    <span className={`inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold ${config.color} ${config.bg}`}>
      {grade}
    </span>
  );
}

/* ── 관계 유형 ── */
const relationLabels: Record<string, string> = {
  self: "자기",
  superior: "상사",
  peer: "동료",
  subordinate: "부하",
};

const relationColors: Record<string, { color: string; bg: string }> = {
  self: { color: "text-gray-700", bg: "bg-gray-100" },
  superior: { color: "text-blue-700", bg: "bg-blue-50" },
  peer: { color: "text-emerald-700", bg: "bg-emerald-50" },
  subordinate: { color: "text-amber-700", bg: "bg-amber-50" },
};

/* ── 날짜 포맷 ── */
function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

/* ── 점수 바 ── */
function ScoreBar({ score, maxScore = 5 }: { score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2332D9] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium w-10 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

/* ── 상세 패널 ── */
function DetailPanel({
  resultId,
  onClose,
}: {
  resultId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/evaluation-results/${resultId}`);
        const data = await res.json();
        setDetail(data);
        setSummary(data.result?.summary || "");
        setFeedback(data.result?.feedback || "");
      } catch {
        console.error("상세 조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [resultId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/evaluation-results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, feedback }),
      });
      if (res.ok) {
        setSaveMsg("저장되었습니다.");
        setTimeout(() => setSaveMsg(""), 2000);
      }
    } catch {
      setSaveMsg("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!detail) return null;

  const { details } = detail;

  return (
    <div className="border-t bg-muted/30 p-5 space-y-5" onClick={(e) => e.stopPropagation()}>
      {/* 관계유형별 평균 */}
      <div>
        <h4 className="text-sm font-semibold mb-2">평가자 유형별 평균</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(details.byRelation).map(([relType, info]) => {
            const rc = relationColors[relType] || { color: "text-gray-700", bg: "bg-gray-100" };
            return (
              <div
                key={relType}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${rc.bg}`}
              >
                <span className={`text-xs font-medium ${rc.color}`}>
                  {relationLabels[relType] || relType}
                </span>
                <span className="text-sm font-bold">{info.avgScore.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">({info.count}명)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 항목별 점수 */}
      <div>
        <h4 className="text-sm font-semibold mb-2">항목별 점수</h4>
        <div className="space-y-2">
          {details.byItem
            .filter((item) => item.type === "score")
            .map((item) => (
              <div key={item.index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
                  {item.question}
                </span>
                <ScoreBar score={item.avgScore} />
                <span className="text-xs text-muted-foreground w-12 shrink-0 text-right">
                  ({item.weight}%)
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 코멘트 */}
      {details.byItem.some((item) => item.comments.length > 0) && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            코멘트
          </h4>
          <div className="space-y-2">
            {details.byItem
              .filter((item) => item.comments.length > 0)
              .map((item) => (
                <div key={item.index}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {item.question}
                  </p>
                  <div className="space-y-1">
                    {item.comments.map((c, ci) => (
                      <p key={ci} className="text-sm pl-3 border-l-2 border-gray-200">
                        {c}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 요약/피드백 편집 */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold mb-1 block">종합 평가 요약</label>
          <textarea
            className="w-full rounded-lg border border-input px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[#2332D9] focus:border-transparent"
            placeholder="이 직원의 평가 결과에 대한 종합 요약을 작성하세요..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block">피드백</label>
          <textarea
            className="w-full rounded-lg border border-input px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[#2332D9] focus:border-transparent"
            placeholder="개선 방향이나 피드백을 작성하세요..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2332D9] hover:bg-[#1b28b0]"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "저장 중..." : "저장"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            닫기
          </Button>
          {saveMsg && (
            <span className="text-xs text-emerald-600">{saveMsg}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export function ResultsOverview() {
  const searchParams = useSearchParams();
  const initialCycleId = searchParams.get("cycle_id");

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(initialCycleId || "");
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [stats, setStats] = useState<{ totalAssignments: number; completedAssignments: number; completionRate: number }>({
    totalAssignments: 0,
    completedAssignments: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 회차 목록 로드
  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch("/api/evaluation-cycles");
      const data = await res.json();
      const eligible = (data.cycles || []).filter(
        (c: Cycle) => c.status === "active" || c.status === "completed"
      );
      setCycles(eligible);
      if (!selectedCycleId && eligible.length > 0) {
        setSelectedCycleId(eligible[0].id);
      }
    } catch {
      console.error("회차 조회 실패");
    }
  }, [selectedCycleId]);

  // 결과 로드
  const fetchResults = useCallback(async () => {
    if (!selectedCycleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluation-results?cycle_id=${selectedCycleId}`);
      const data = await res.json();
      setResults(data.results || []);
      setStats(data.stats || { totalAssignments: 0, completedAssignments: 0, completionRate: 0 });
    } catch {
      console.error("결과 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  useEffect(() => {
    if (selectedCycleId) {
      fetchResults();
      setExpandedId(null);
    }
  }, [selectedCycleId, fetchResults]);

  // 집계 실행
  const handleAggregate = async () => {
    if (!selectedCycleId) return;
    setAggregating(true);
    try {
      const res = await fetch("/api/evaluation-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle_id: selectedCycleId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchResults();
      } else {
        alert(data.error || "집계 실패");
      }
    } catch {
      alert("집계 중 오류가 발생했습니다");
    } finally {
      setAggregating(false);
    }
  };

  // 통계 계산
  const avgScore =
    results.length > 0
      ? Math.round(
          (results.reduce((sum, r) => sum + (r.total_score || 0), 0) / results.length) * 100
        ) / 100
      : 0;

  const gradeDistribution: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const r of results) {
    if (r.grade && gradeDistribution[r.grade] !== undefined) {
      gradeDistribution[r.grade]++;
    }
  }

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">평가 결과</h1>
          <p className="text-muted-foreground">
            평가 회차별 결과를 집계하고 확인합니다.
          </p>
        </div>
      </div>

      {/* 회차 선택 + 집계 버튼 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="rounded-lg border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#2332D9] focus:border-transparent"
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
        >
          {cycles.length === 0 && <option value="">회차 없음</option>}
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.status === "active" ? "진행 중" : "완료"})
            </option>
          ))}
        </select>
        {selectedCycle && (
          <span className="text-sm text-muted-foreground">
            {formatDate(selectedCycle.start_date)} ~ {formatDate(selectedCycle.end_date)}
          </span>
        )}
        <div className="ml-auto">
          <Button
            onClick={handleAggregate}
            disabled={aggregating || !selectedCycleId}
            className="bg-[#2332D9] hover:bg-[#1b28b0]"
            size="sm"
          >
            {aggregating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                집계 중...
              </>
            ) : results.length > 0 ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                재집계
              </>
            ) : (
              <>
                <Calculator className="h-3.5 w-3.5 mr-1.5" />
                결과 집계
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {!loading && selectedCycleId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 평균 점수 */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2332D9]/10">
                  <Star className="h-5 w-5 text-[#2332D9]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">평균 점수</p>
                  <p className="text-2xl font-bold">
                    {results.length > 0 ? avgScore.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 평가 완료율 */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">평가 완료율</p>
                  <p className="text-2xl font-bold">
                    {stats.completionRate}%
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({stats.completedAssignments}/{stats.totalAssignments})
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 등급 분포 */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">등급 분포</p>
                  <div className="flex gap-2">
                    {["S", "A", "B", "C", "D"].map((g) => (
                      <div key={g} className="text-center">
                        <span className="text-xs text-muted-foreground">{g}</span>
                        <p className="text-sm font-bold">{gradeDistribution[g]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 결과 목록 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium mb-1">
              {selectedCycleId ? "집계된 결과가 없습니다" : "회차를 선택하세요"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedCycleId
                ? "'결과 집계' 버튼을 클릭하여 평가 결과를 생성하세요."
                : "상단에서 평가 회차를 선택하면 결과를 확인할 수 있습니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[1fr_100px_60px_60px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>이름</span>
            <span className="text-right">총점</span>
            <span className="text-center">등급</span>
            <span className="text-center">응답</span>
            <span />
          </div>

          {results.map((result) => (
            <div key={result.id}>
              <Card
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedId(expandedId === result.id ? null : result.id)
                }
              >
                <CardContent className="py-3">
                  <div className="grid grid-cols-[1fr_100px_60px_60px_40px] gap-2 items-center">
                    {/* 사용자 정보 */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2332D9]/10 text-[#2332D9] text-sm font-medium shrink-0">
                        {result.user?.name?.slice(0, 1) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {result.user?.name || "알 수 없음"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.user?.department || "미지정"}
                          {result.user?.position
                            ? ` · ${result.user.position}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* 총점 */}
                    <div className="text-right">
                      <span className="text-lg font-bold">
                        {result.total_score?.toFixed(2) || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground"> / 5</span>
                    </div>

                    {/* 등급 */}
                    <div className="flex justify-center">
                      <GradeBadge grade={result.grade} />
                    </div>

                    {/* 피드백 표시 */}
                    <div className="flex justify-center">
                      {result.summary || result.feedback ? (
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs text-emerald-700 bg-emerald-50">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* 확장 아이콘 */}
                    <div className="flex justify-center">
                      {expandedId === result.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>

                {/* 상세 패널 */}
                {expandedId === result.id && (
                  <DetailPanel
                    resultId={result.id}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
