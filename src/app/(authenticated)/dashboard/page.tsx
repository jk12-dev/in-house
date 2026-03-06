"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Building2,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  UserCog,
  FolderTree,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  department: string | null;
  role: string;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [membersRes, deptsRes] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/departments"),
        ]);
        const membersData = await membersRes.json();
        const deptsData = await deptsRes.json();
        setUsers(membersData.users || []);
        setDepartments(deptsData.departments || []);
      } catch {
        console.error("대시보드 데이터 로드 실패");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 통계 계산
  const activeUsers = users.filter((u) => u.is_active);
  const managerCount = activeUsers.filter(
    (u) => u.role === "admin" || u.role === "manager"
  ).length;

  // 부서별 인원 (재직자 기준)
  const deptCounts: { name: string; count: number }[] = [];
  const deptMap = new Map<string, number>();
  for (const user of activeUsers) {
    const dept = user.department || "미배정";
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
  }
  for (const [name, count] of deptMap) {
    deptCounts.push({ name, count });
  }
  deptCounts.sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...deptCounts.map((d) => d.count), 1);

  // 통계 카드 데이터
  const stats = [
    {
      title: "전체 직원",
      value: activeUsers.length,
      description: "재직 중",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "부서",
      value: departments.length,
      description: "개 조직",
      icon: Building2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "관리자",
      value: managerCount,
      description: "Admin + Manager",
      icon: ShieldCheck,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "평가 현황",
      value: "—",
      description: "준비 중",
      icon: ClipboardList,
      color: "text-gray-400",
      bgColor: "bg-gray-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground">
          조직 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* 부서별 인원 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">부서별 인원 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-24 shrink-0" />
                  <Skeleton className="h-6 flex-1 rounded" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : deptCounts.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              부서 데이터가 없습니다. 직원 관리에서 동기화해주세요.
            </div>
          ) : (
            <div className="space-y-2.5">
              {deptCounts.map((dept) => {
                // 부서명에서 영문 괄호 제거
                const label = dept.name.replace(/\s*\(.*?\)\s*$/, "");
                const pct = (dept.count / maxCount) * 100;
                return (
                  <div key={dept.name} className="flex items-center gap-3">
                    <span className="text-sm w-28 shrink-0 truncate text-right text-muted-foreground">
                      {label}
                    </span>
                    <div className="flex-1 h-7 bg-muted/40 rounded overflow-hidden relative">
                      <div
                        className="h-full rounded bg-[#2332D9]/80 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right tabular-nums">
                      {dept.count}명
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 빠른 작업 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/employees" className="group">
          <Card className="transition-shadow hover:shadow-md h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg p-2.5 bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <UserCog className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">직원 관리</p>
                <p className="text-xs text-muted-foreground">
                  직원 정보 조회 및 권한 설정
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/departments" className="group">
          <Card className="transition-shadow hover:shadow-md h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg p-2.5 bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <FolderTree className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">부서 관리</p>
                <p className="text-xs text-muted-foreground">
                  조직도 확인 및 부서별 현황
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <div className="opacity-50 cursor-not-allowed">
          <Card className="h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg p-2.5 bg-gray-100">
                <ClipboardList className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">평가 시작</p>
                <p className="text-xs text-muted-foreground">
                  준비 중
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
