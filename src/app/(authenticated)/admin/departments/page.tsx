"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, GripVertical, ChevronDown, ChevronRight } from "lucide-react";

interface Department {
  id: string;
  naver_works_org_id: string;
  name: string;
  description: string | null;
  parent_org_id: string | null;
  display_order: number;
}

interface UserRow {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  is_active: boolean;
}

/* ── 드래그 가능한 부서 카드 ── */
function SortableDeptCard({
  id,
  deptName,
  memberCount,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  deptName: string;
  memberCount: number;
  collapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
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
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{deptName}</span>
          <span className="text-xs text-muted-foreground ml-1">
            {memberCount}명
          </span>
        </button>
      </div>
      {!collapsed && children && (
        <div className="p-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptOrder, setDeptOrder] = useState<string[]>([]);
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [deptRes, userRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/members"),
        ]);
        const deptData = await deptRes.json();
        const userData = await userRes.json();
        setDepartments(deptData.departments || []);
        setUsers(userData.users || []);
      } catch {
        console.error("데이터 조회 실패");
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // localStorage에서 저장된 순서 복원
    const savedOrder = localStorage.getItem("dept-page-order");
    if (savedOrder) setDeptOrder(JSON.parse(savedOrder));
  }, []);

  // 재직자만 필터링
  const activeUsers = users.filter((u) => u.is_active);

  // 부서별 구성원 그룹핑 (재직자 기준)
  const membersByDept = useMemo(() => {
    return activeUsers.reduce<Record<string, UserRow[]>>((acc, user) => {
      const dept = user.department || "미배정";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(user);
      return acc;
    }, {});
  }, [activeUsers]);

  // 부서 목록 (구성원 있는 부서만, 순서 반영)
  const orderedDeptEntries = useMemo(() => {
    const entries = Object.entries(membersByDept);
    if (deptOrder.length === 0) return entries;
    const orderMap = new Map(deptOrder.map((d, i) => [d, i]));
    return [...entries].sort(([a], [b]) => {
      const oA = orderMap.get(a) ?? 999;
      const oB = orderMap.get(b) ?? 999;
      return oA - oB;
    });
  }, [membersByDept, deptOrder]);

  const deptIds = useMemo(
    () => orderedDeptEntries.map(([name]) => name),
    [orderedDeptEntries]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = deptIds.indexOf(active.id as string);
      const newIndex = deptIds.indexOf(over.id as string);
      const newOrder = arrayMove(deptIds, oldIndex, newIndex);
      setDeptOrder(newOrder);
      localStorage.setItem("dept-page-order", JSON.stringify(newOrder));
    },
    [deptIds]
  );

  const toggleCollapse = useCallback((dept: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">부서 관리</h1>
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">부서 관리</h1>
        <p className="text-muted-foreground">
          네이버 웍스 조직도 기반으로 부서와 소속 구성원을 확인합니다.
        </p>
      </div>

      {/* 조직 현황 + 부서 목록 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              조직 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">{departments.length}</div>
                <div className="text-xs text-muted-foreground">부서</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">{activeUsers.length}</div>
                <div className="text-xs text-muted-foreground">재직 구성원</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>부서 목록</CardTitle>
            <CardDescription>
              {departments.length === 0
                ? "동기화된 부서가 없습니다. 직원 관리에서 동기화해주세요."
                : `${departments.length}개 부서`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                부서 데이터 없음
              </div>
            ) : (
              <ul className="space-y-1">
                {departments.map((dept) => (
                  <li
                    key={dept.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium">{dept.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {membersByDept[dept.name]?.length || 0}명
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 부서별 구성원 — 드래그 정렬 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">부서별 구성원</h2>
        {orderedDeptEntries.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            구성원 데이터가 없습니다
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={deptIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {orderedDeptEntries.map(([dept, members]) => (
                  <SortableDeptCard
                    key={dept}
                    id={dept}
                    deptName={dept}
                    memberCount={members.length}
                    collapsed={collapsedDepts.has(dept)}
                    onToggle={() => toggleCollapse(dept)}
                  >
                    <div className="flex flex-wrap gap-3">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2"
                        >
                          <span className="text-sm font-medium">{member.name}</span>
                          {member.position && (
                            <span className="text-xs text-muted-foreground">
                              {member.position}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </SortableDeptCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
