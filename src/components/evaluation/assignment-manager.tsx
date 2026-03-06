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
  Clock,
  FileText,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

/* ── 타입 ── */
interface User {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface Assignment {
  id: string;
  cycle_id: string;
  evaluator_id: string;
  evaluatee_id: string;
  relation_type: string;
  status: string;
  evaluator: {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
    avatar_url: string | null;
  };
  evaluatee: {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
    avatar_url: string | null;
  };
}

interface Cycle {
  id: string;
  title: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  description: string | null;
}

/* ── 관계 유형 설정 ── */
const relationConfig: Record<string, { label: string; color: string; bg: string }> = {
  self: { label: "자기", color: "text-gray-700", bg: "bg-gray-100" },
  superior: { label: "상사", color: "text-blue-700", bg: "bg-blue-50" },
  peer: { label: "동료", color: "text-emerald-700", bg: "bg-emerald-50" },
  subordinate: { label: "부하", color: "text-amber-700", bg: "bg-amber-50" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "초안", color: "text-gray-700", bg: "bg-gray-100" },
  active: { label: "진행 중", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "완료", color: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { label: "취소", color: "text-red-700", bg: "bg-red-50" },
};

function RelationBadge({ type }: { type: string }) {
  const config = relationConfig[type] || relationConfig.peer;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.bg}`}
    >
      {config.label}
    </span>
  );
}

/* ── 메인 컴포넌트 ── */
export function AssignmentManager({
  cycleId,
  backHref,
}: {
  cycleId: string;
  backHref: string;
}) {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 평가자 추가 모달 상태
  const [addingFor, setAddingFor] = useState<string | null>(null); // evaluatee_id
  const [selectedEvaluator, setSelectedEvaluator] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("peer");

  /* ── 데이터 조회 ── */
  const fetchData = useCallback(async () => {
    try {
      const [cyclesRes, membersRes, assignRes] = await Promise.all([
        fetch(`/api/evaluation-cycles?type=`),
        fetch("/api/members"),
        fetch(`/api/evaluation-assignments?cycle_id=${cycleId}`),
      ]);
      const cyclesData = await cyclesRes.json();
      const membersData = await membersRes.json();
      const assignData = await assignRes.json();

      const foundCycle = (cyclesData.cycles || []).find(
        (c: Cycle) => c.id === cycleId
      );
      setCycle(foundCycle || null);
      setUsers((membersData.users || []).filter((u: User) => u.is_active));
      setAssignments(assignData.assignments || []);
    } catch {
      console.error("데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 피평가자별 배정 그룹핑 ── */
  const getAssignmentsForEvaluatee = (evaluateeId: string) =>
    assignments.filter((a) => a.evaluatee_id === evaluateeId);

  /* ── 개별 평가자 추가 ── */
  const handleAddAssignment = async () => {
    if (!addingFor || !selectedEvaluator || !selectedRelation) return;
    setSaving(true);

    try {
      await fetch("/api/evaluation-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: cycleId,
          assignments: [
            {
              evaluator_id: selectedEvaluator,
              evaluatee_id: addingFor,
              relation_type: selectedRelation,
            },
          ],
        }),
      });
      setAddingFor(null);
      setSelectedEvaluator("");
      setSelectedRelation("peer");
      await fetchData();
    } catch {
      console.error("배정 추가 실패");
    } finally {
      setSaving(false);
    }
  };

  /* ── 배정 삭제 ── */
  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await fetch(`/api/evaluation-assignments/${assignmentId}`, {
        method: "DELETE",
      });
      await fetchData();
    } catch {
      console.error("배정 삭제 실패");
    }
  };

  /* ── 전원 자기평가 배정 ── */
  const handleBulkSelf = async () => {
    if (!confirm("모든 재직 직원에게 자기평가를 배정합니다. 진행하시겠습니까?"))
      return;
    setSaving(true);

    try {
      const selfAssignments = users.map((u) => ({
        evaluator_id: u.id,
        evaluatee_id: u.id,
        relation_type: "self",
      }));

      await fetch("/api/evaluation-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: cycleId,
          assignments: selfAssignments,
        }),
      });
      await fetchData();
    } catch {
      console.error("일괄 자기평가 배정 실패");
    } finally {
      setSaving(false);
    }
  };

  /* ── 같은 부서 동료평가 배정 ── */
  const handleBulkPeer = async () => {
    if (
      !confirm(
        "같은 부서 직원끼리 동료평가를 배정합니다. 진행하시겠습니까?"
      )
    )
      return;
    setSaving(true);

    try {
      // 부서별 그룹핑
      const deptGroups: Record<string, User[]> = {};
      users.forEach((u) => {
        const dept = u.department || "미지정";
        if (!deptGroups[dept]) deptGroups[dept] = [];
        deptGroups[dept].push(u);
      });

      const peerAssignments: {
        evaluator_id: string;
        evaluatee_id: string;
        relation_type: string;
      }[] = [];

      Object.values(deptGroups).forEach((deptUsers) => {
        if (deptUsers.length < 2) return; // 1명뿐인 부서는 스킵
        deptUsers.forEach((evaluatee) => {
          deptUsers.forEach((evaluator) => {
            if (evaluator.id !== evaluatee.id) {
              peerAssignments.push({
                evaluator_id: evaluator.id,
                evaluatee_id: evaluatee.id,
                relation_type: "peer",
              });
            }
          });
        });
      });

      if (peerAssignments.length === 0) {
        alert("같은 부서에 2명 이상인 부서가 없습니다.");
        return;
      }

      await fetch("/api/evaluation-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: cycleId,
          assignments: peerAssignments,
        }),
      });
      await fetchData();
    } catch {
      console.error("일괄 동료평가 배정 실패");
    } finally {
      setSaving(false);
    }
  };

  /* ── 날짜 포맷 ── */
  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
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

  if (!cycle) {
    return (
      <div className="space-y-6">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="font-medium mb-1">회차를 찾을 수 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              삭제되었거나 존재하지 않는 평가 회차입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = statusConfig[cycle.status] || statusConfig.draft;

  return (
    <div className="space-y-6">
      {/* 상단: 뒤로가기 + 회차 정보 */}
      <div>
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {cycle.title}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color} ${statusCfg.bg}`}
              >
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(cycle.start_date)} ~ {formatDate(cycle.end_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                배정 {assignments.length}건
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 일괄 배정 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">일괄 배정</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                전체 직원에게 한 번에 평가를 배정합니다. 이미 존재하는 배정은
                자동으로 건너뜁니다.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSelf}
                disabled={saving}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                전원 자기평가
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkPeer}
                disabled={saving}
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                같은 부서 동료평가
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 직원별 배정 현황 */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          직원별 평가 배정 현황
        </h2>

        <div className="space-y-3">
          {users.map((user) => {
            const userAssignments = getAssignmentsForEvaluatee(user.id);
            const isAdding = addingFor === user.id;

            return (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 아바타 */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2332D9]/10 text-[#2332D9] text-sm font-medium">
                        {user.name.slice(0, 1)}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {user.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {user.department || "미지정"}{" "}
                          {user.position ? `· ${user.position}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        평가자 {userAssignments.length}명
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isAdding) {
                            setAddingFor(null);
                          } else {
                            setAddingFor(user.id);
                            setSelectedEvaluator("");
                            setSelectedRelation("peer");
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        {isAdding ? (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            취소
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            평가자 추가
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* 평가자 추가 폼 */}
                  {isAdding && (
                    <div className="flex items-end gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium">평가자</label>
                        <select
                          value={selectedEvaluator}
                          onChange={(e) => setSelectedEvaluator(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">선택하세요</option>
                          {users
                            .filter((u) => {
                              // 이미 같은 관계로 배정된 사람은 제외하지 않음 (다른 관계 가능)
                              return true;
                            })
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.department || "미지정"})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="text-xs font-medium">관계</label>
                        <select
                          value={selectedRelation}
                          onChange={(e) => setSelectedRelation(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="self">자기</option>
                          <option value="superior">상사</option>
                          <option value="peer">동료</option>
                          <option value="subordinate">부하</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAddAssignment}
                        disabled={!selectedEvaluator || saving}
                        className="h-8 bg-[#2332D9] hover:bg-[#1b28b0]"
                      >
                        추가
                      </Button>
                    </div>
                  )}

                  {/* 배정된 평가자 목록 */}
                  {userAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
                        >
                          <RelationBadge type={a.relation_type} />
                          <span className="font-medium text-xs">
                            {a.evaluator.name}
                          </span>
                          <button
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      배정된 평가자가 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
