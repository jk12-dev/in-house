"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RefreshCw, Users, Search, ChevronDown, ChevronRight } from "lucide-react";

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

type ViewMode = "list" | "department";
type SortKey = "name" | "employee_number" | "department" | "position" | "role";
type SortDir = "asc" | "desc";

export default function EmployeesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

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
  }, []);

  const roleOptions = [
    { value: "admin", label: "관리자" },
    { value: "manager", label: "매니저" },
    { value: "employee", label: "직원" },
  ];

  const handleToggleActive = async (userId: string, userName: string, currentActive: boolean) => {
    const action = currentActive ? "퇴사 처리" : "재직 복원";
    if (!confirm(`${userName}님을 ${action}하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/members/${userId}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u))
        );
        if (currentActive) setShowInactive(true);
      }
    } catch {
      console.error("상태 변경 실패");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch {
      console.error("역할 변경 실패");
    }
  };

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
      const valA = (a[sortKey] || "").toLowerCase();
      const valB = (b[sortKey] || "").toLowerCase();
      const cmp = valA.localeCompare(valB, "ko");
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
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "ko"));
  }, [processedUsers]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="pb-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </span>
    </th>
  );

  const UserRow = ({ user }: { user: UserRow }) => (
    <tr className={`border-b last:border-0 ${!user.is_active ? "opacity-50" : ""}`}>
      <td className="py-3 pr-4 text-muted-foreground tabular-nums">{user.employee_number || "—"}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="text-xs">
              {user.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
      {viewMode === "list" && (
        <td className="py-3 pr-4">{user.department || "—"}</td>
      )}
      <td className="py-3 pr-4">{user.position || "—"}</td>
      <td className="py-3 pr-4">
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(user.id, e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3">
        <div className="flex items-center">
          <button
            onClick={() => handleToggleActive(user.id, user.name, user.is_active)}
            className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: user.is_active ? "#34C759" : "#E5E5EA" }}
            role="switch"
            aria-checked={user.is_active}
          >
            <span
              className="pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out"
              style={{ transform: user.is_active ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
          <span className={`ml-2 text-xs ${user.is_active ? "text-green-600" : "text-muted-foreground"}`}>
            {user.is_active ? "재직" : "퇴사"}
          </span>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">직원 관리</h1>
          <p className="text-muted-foreground">
            네이버 웍스에서 구성원 정보를 동기화하고 관리합니다.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "웍스에서 동기화"}
        </Button>
      </div>

      {syncResult && (
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          {syncResult}
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
                  onClick={() => setViewMode("list")}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  목록
                </button>
                <button
                  onClick={() => setViewMode("department")}
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <SortHeader label="사번" field="employee_number" />
                    <SortHeader label="이름" field="name" />
                    <th className="pb-3 pr-4 font-medium">이메일</th>
                    <SortHeader label="부서" field="department" />
                    <SortHeader label="직급" field="position" />
                    <SortHeader label="역할" field="role" />
                    <th className="pb-3 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {processedUsers.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              {groupedByDept.map(([dept, members]) => (
                <div key={dept} className="rounded-lg border">
                  <button
                    onClick={() => toggleDeptCollapse(dept)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {collapsedDepts.has(dept) ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{dept}</span>
                    <span className="text-xs text-muted-foreground">{members.length}명</span>
                  </button>
                  {!collapsedDepts.has(dept) && (
                    <div className="border-t px-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {members.map((user) => (
                            <UserRow key={user.id} user={user} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
