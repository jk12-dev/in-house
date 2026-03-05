"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users } from "lucide-react";

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
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  // 부서별 구성원 그룹핑
  const membersByDept = users.reduce<Record<string, UserRow[]>>((acc, user) => {
    const dept = user.department || "미배정";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(user);
    return acc;
  }, {});

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
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-xs text-muted-foreground">구성원</div>
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

      {/* 부서별 구성원 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">부서별 구성원</h2>
        {Object.entries(membersByDept).length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            구성원 데이터가 없습니다
          </div>
        ) : (
          Object.entries(membersByDept).map(([dept, members]) => (
            <Card key={dept}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  {dept}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({members.length}명)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
