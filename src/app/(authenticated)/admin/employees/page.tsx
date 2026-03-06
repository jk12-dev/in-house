"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Users, Search, ChevronDown, ChevronRight, GripVertical } from "lucide-react";

interface UserRow {
  id: string;
  naver_works_id: string;
  employee_number: string | null;
  email: string;
  name: string;
  department: string | null;
  position: string | null;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
  updated_at: string;
}

interface PendingChange {
  role?: string;
  is_active?: boolean;
}

type ViewMode = "list" | "department";
type SortKey = "name" | "employee_number" | "department" | "position" | "role";
type SortDir = "asc" | "desc";

const POSITION_ORDER: Record<string, number> = {
  "대표": 1,
  "C-Level": 2,
  "이사": 3,
  "수석": 4,
  "부장": 5,
  "차장": 6,
  "과장": 7,
  "대리": 8,
  "사원": 9,
  "인턴": 10,
};

const roleOptions = [
  { value: "admin", label: "관리자" },
  { value: "manager", label: "매니저" },
  { value: "employee", label: "직원" },
];

const statusOptions = [
  { value: "active", label: "재직" },
  { value: "inactive", label: "퇴사" },
];

function SortableDeptCard({
  id,
  deptLabel,
  memberCount,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  deptLabel: string;
  memberCount: number;
  collapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-lg border bg-background transition-shadow ${isDragging ? "shadow-lg opacity-70 z-10" : ""}`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 rounded-t-lg">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-muted"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{deptLabel}</span>
          <span className="text-xs text-muted-foreground ml-1">{memberCount}명</span>
        </button>
      </div>
      {!collapsed && <div className="px-1">{children}</div>}
    </div>
  );
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [deptOrder, setDeptOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const changeCount = Object.keys(pendingChanges).length;

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("employees-view", mode);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      console.error("구성원 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const deactivatedMsg = data.synced.deactivated > 0
          ? `, 퇴사자 ${data.synced.deactivated}명 비활성화`
          : "";
        setSyncResult(
          `동기화 완료: 부서 ${data.synced.departments}개, 구성원 ${data.synced.members}명${deactivatedMsg}`
        );
        fetchUsers();
        setPendingChanges({});
      } else {
        setSyncResult(`동기화 실패: ${data.error}`);
      }
    } catch {
      setSyncResult("동기화 중 오류가 발생했습니다");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const savedView = localStorage.getItem("employees-view") as ViewMode;
    if (savedView) setViewMode(savedView);
    const savedOrder = localStorage.getItem("dept-order");
    if (savedOrder) setDeptOrder(JSON.parse(savedOrder));
  }, []);

  // 로컬 변경 (아직 서버 반영 안 됨)
  const setLocalChange = useCallback((userId: string, field: "role" | "is_active", value: string | boolean) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setPendingChanges((prev) => {
      const existing = prev[userId] || {};
      const updated = { ...existing, [field]: value };

      // 원래 값과 같으면 해당 필드 삭제
      const originalValue = field === "is_active" ? user.is_active : user.role;
      if (updated[field] === originalValue) {
        delete updated[field];
      }

      // 변경 사항이 없으면 해당 유저 엔트리 삭제
      if (Object.keys(updated).length === 0) {
        const next = { ...prev };
        delete next[userId];
        return next;
      }

      return { ...prev, [userId]: updated };
    });
  }, [users]);

  const handleDiscardChanges = () => {
    setPendingChanges({});
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(pendingChanges);
      const results = await Promise.all(
        entries.map(async ([userId, changes]) => {
          const promises: Promise<Response>[] = [];
          if (changes.role !== undefined) {
            promises.push(
              fetch(`/api/members/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: changes.role }),
              })
            );
          }
          if (changes.is_active !== undefined) {
            promises.push(
              fetch(`/api/members/${userId}/active`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: changes.is_active }),
              })
            );
          }
          return Promise.all(promises);
        })
      );

      // 성공 시 로컬 상태 반영
      const allOk = results.every((resList) => resList.every((r) => r.ok));
      if (allOk) {
        setUsers((prev) =>
          prev.map((u) => {
            const changes = pendingChanges[u.id];
            if (!changes) return u;
            return {
              ...u,
              ...(changes.role !== undefined && { role: changes.role }),
              ...(changes.is_active !== undefined && { is_active: changes.is_active }),
            };
          })
        );
        setPendingChanges({});
      }
    } catch {
      console.error("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // 현재 표시할 값 (pending 포함)
  const getDisplayValue = (user: UserRow, field: "role" | "is_active") => {
    const changes = pendingChanges[user.id];
    if (changes && changes[field] !== undefined) return changes[field];
    return user[field];
  };

  const isChanged = (userId: string) => !!pendingChanges[userId];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleDeptCollapse = (dept: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  const processedUsers = useMemo(() => {
    let result = showInactive ? users : users.filter((u) => u.is_active);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.employee_number || "").toLowerCase().includes(q) ||
          (u.department || "").toLowerCase().includes(q) ||
          (u.position || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp: number;
      if (sortKey === "position") {
        const posA = POSITION_ORDER[a.position || ""] ?? 99;
        const posB = POSITION_ORDER[b.position || ""] ?? 99;
        cmp = posA - posB;
        if (cmp === 0) {
          cmp = (a.employee_number || "").localeCompare(b.employee_number || "");
        }
      } else {
        const valA = (a[sortKey] || "").toLowerCase();
        const valB = (b[sortKey] || "").toLowerCase();
        cmp = valA.localeCompare(valB, "ko");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, showInactive, searchQuery, sortKey, sortDir]);

  const groupedByDept = useMemo(() => {
    const groups: Record<string, UserRow[]> = {};
    for (const user of processedUsers) {
      const dept = user.department || "미배정";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(user);
    }
    return Object.entries(groups).sort(([, aMembers], [, bMembers]) => {
      const minA = Math.min(...aMembers.map(u => parseInt(u.employee_number || "999999")));
      const minB = Math.min(...bMembers.map(u => parseInt(u.employee_number || "999999")));
      return minA - minB;
    });
  }, [processedUsers]);

  const orderedDepts = useMemo(() => {
    if (deptOrder.length === 0) return groupedByDept;
    const orderMap = new Map(deptOrder.map((d, i) => [d, i]));
    return [...groupedByDept].sort(([a], [b]) => {
      const oA = orderMap.get(a) ?? 999;
      const oB = orderMap.get(b) ?? 999;
      if (oA !== oB) return oA - oB;
      return a.localeCompare(b, "ko");
    });
  }, [groupedByDept, deptOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = orderedDepts.map(([d]) => d);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      setDeptOrder(newOrder);
      localStorage.setItem("dept-order", JSON.stringify(newOrder));
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <span
      className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {label}
      <span className="text-xs" style={{ color: sortKey === field ? "#212121" : "#DADADA" }}>
        {sortKey === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </span>
  );

  const UserRowComponent = ({ user }: { user: UserRow }) => {
    const displayRole = getDisplayValue(user, "role") as string;
    const displayActive = getDisplayValue(user, "is_active") as boolean;
    const changed = isChanged(user.id);

    return (
      <tr className={`border-b last:border-0 transition-colors ${changed ? "bg-[#2332D9]/5" : ""} ${!displayActive ? "opacity-50" : ""}`}>
        <td className="py-3 pr-6 text-muted-foreground tabular-nums whitespace-nowrap">{user.employee_number || "—"}</td>
        <td className="py-3 pr-6 font-medium whitespace-nowrap">{user.name}</td>
        {viewMode === "list" && (
          <td className="py-3 pr-6 text-muted-foreground whitespace-nowrap">{user.department || "—"}</td>
        )}
        <td className="py-3 pr-6 whitespace-nowrap">{user.position || "—"}</td>
        <td className="py-3 pr-6 whitespace-nowrap">
          <select
            value={displayRole}
            onChange={(e) => setLocalChange(user.id, "role", e.target.value)}
            className={`rounded-md border bg-background px-2 py-1 text-xs ${
              pendingChanges[user.id]?.role !== undefined ? "border-[#2332D9] text-[#2332D9]" : ""
            }`}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <td className="py-3 pr-6 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: displayActive ? "#34C759" : "#FF3B30" }}
            />
            <select
              value={displayActive ? "active" : "inactive"}
              onChange={(e) => setLocalChange(user.id, "is_active", e.target.value === "active")}
              className={`rounded-md border bg-background px-2 py-1 text-xs ${
                pendingChanges[user.id]?.is_active !== undefined
                  ? "border-[#2332D9] text-[#2332D9]"
                  : ""
              }`}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </td>
        <td className="py-3 text-muted-foreground truncate">{user.email}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">직원 관리</h1>
          <p className="text-muted-foreground">
            네이버 웍스에서 구성원 정보를 동기화하고 관리합니다.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "웍스에서 동기화"}
        </Button>
      </div>

      {syncResult && (
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          {syncResult}
        </div>
      )}

      {/* 변경사항 저장 바 (하단 고정) */}
      {changeCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-full border bg-[#212121] px-6 py-3 shadow-lg">
          <span className="text-sm font-medium text-white">
            {changeCount}건 변경됨
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardChanges}
              disabled={saving}
              className="rounded-full px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
            >
              취소
            </button>
            <Button size="sm" onClick={handleSaveChanges} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              구성원 목록
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border p-0.5 text-xs">
                <button
                  onClick={() => changeViewMode("list")}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  목록
                </button>
                <button
                  onClick={() => changeViewMode("department")}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    viewMode === "department" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  부서별
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="사번, 이름, 이메일, 부서, 직급으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span>재직 {activeCount}명{inactiveCount > 0 ? ` / 퇴사 ${inactiveCount}명` : ""}</span>
              {inactiveCount > 0 && (
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className="text-xs underline hover:text-foreground"
                >
                  {showInactive ? "재직자만" : "전체 보기"}
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              불러오는 중...
            </div>
          ) : processedUsers.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
              {users.length === 0 ? (
                <>
                  <p>동기화된 구성원이 없습니다</p>
                  <p>상단의 &quot;웍스에서 동기화&quot; 버튼을 눌러 시작하세요</p>
                </>
              ) : (
                <p>검색 결과가 없습니다</p>
              )}
            </div>
          ) : viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "11%" }} />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-6 font-medium"><SortHeader label="사번" field="employee_number" /></th>
                    <th className="pb-3 pr-6 font-medium"><SortHeader label="이름" field="name" /></th>
                    <th className="pb-3 pr-6 font-medium"><SortHeader label="부서" field="department" /></th>
                    <th className="pb-3 pr-6 font-medium"><SortHeader label="직급" field="position" /></th>
                    <th className="pb-3 pr-6 font-medium"><SortHeader label="역할" field="role" /></th>
                    <th className="pb-3 pr-6 font-medium">상태</th>
                    <th className="pb-3 font-medium">이메일</th>
                  </tr>
                </thead>
                <tbody>
                  {processedUsers.map((user) => (
                    <UserRowComponent key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedDepts.map(([d]) => d)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {orderedDepts.map(([dept, members]) => {
                    const deptLabel = dept.replace(/\s*\(.*?\)\s*/g, "");
                    return (
                      <SortableDeptCard
                        key={dept}
                        id={dept}
                        deptLabel={deptLabel}
                        memberCount={members.length}
                        collapsed={collapsedDepts.has(dept)}
                        onToggle={() => toggleDeptCollapse(dept)}
                      >
                        <table className="w-full text-sm table-fixed">
                          <colgroup>
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "13%" }} />
                            <col />
                          </colgroup>
                          <tbody>
                            {members.map((user) => (
                              <UserRowComponent key={user.id} user={user} />
                            ))}
                          </tbody>
                        </table>
                      </SortableDeptCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
