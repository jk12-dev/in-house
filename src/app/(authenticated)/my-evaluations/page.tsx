"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Clock,
  ChevronRight,
} from "lucide-react";

/* ── 타입 ── */
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

/* ── 관계 유형 ── */
const relationLabels: Record<string, string> = {
  self: "자기평가",
  superior: "상사평가",
  peer: "동료평가",
  subordinate: "부하평가",
};

/* ── 상태 뱃지 ── */
function StatusBadge({ response }: { response: Evaluation["response"] }) {
  if (!response) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100">
        미작성
      </span>
    );
  }
  if (!response.submitted_at) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50">
        작성 중
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50">
      제출 완료
    </span>
  );
}

/* ── 날짜 포맷 ── */
function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

/* ── 메인 ── */
export default function MyEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/my-evaluations");
      const data = await res.json();
      setEvaluations(data.evaluations || []);
    } catch {
      console.error("데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 회차별 그룹핑
  const groupedByCycle = evaluations.reduce(
    (acc, ev) => {
      const key = ev.cycle_id;
      if (!acc[key]) acc[key] = { cycle: ev.cycle, items: [] };
      acc[key].items.push(ev);
      return acc;
    },
    {} as Record<string, { cycle: Evaluation["cycle"]; items: Evaluation[] }>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">나의 평가</h1>
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">나의 평가</h1>
        <p className="text-muted-foreground">
          배정된 평가를 확인하고 입력합니다.
        </p>
      </div>

      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium mb-1">배정된 평가가 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              현재 진행 중인 평가 회차에 배정된 항목이 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.values(groupedByCycle).map(({ cycle, items }) => (
            <div key={cycle.id}>
              {/* 회차 헤더 */}
              <div className="mb-3">
                <h2 className="text-lg font-semibold">{cycle.title}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(cycle.start_date)} ~{" "}
                  {formatDate(cycle.end_date)}
                </p>
              </div>

              {/* 평가 카드 목록 */}
              <div className="space-y-2">
                {items.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/my-evaluations/${ev.id}`}
                  >
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* 아바타 */}
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2332D9]/10 text-[#2332D9] text-sm font-medium">
                              {ev.evaluatee.name.slice(0, 1)}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {ev.evaluatee.name}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {ev.evaluatee.department || "미지정"}
                                {ev.evaluatee.position
                                  ? ` · ${ev.evaluatee.position}`
                                  : ""}{" "}
                                ·{" "}
                                <span className="font-medium">
                                  {relationLabels[ev.relation_type] ||
                                    ev.relation_type}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge response={ev.response} />
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
