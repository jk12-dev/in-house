import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ClipboardCheck, Star, Clock } from "lucide-react";

const stats = [
  {
    title: "전체 직원",
    value: "—",
    description: "Supabase 연동 후 표시",
    icon: Users,
  },
  {
    title: "진행 중 평가",
    value: "—",
    description: "Supabase 연동 후 표시",
    icon: ClipboardCheck,
  },
  {
    title: "완료된 평가",
    value: "—",
    description: "Supabase 연동 후 표시",
    icon: Star,
  },
  {
    title: "대기 중 평가",
    value: "—",
    description: "Supabase 연동 후 표시",
    icon: Clock,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground">
          인사평가 시스템 현황을 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription className="text-xs">
                {stat.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>
            Supabase 연동 후 최근 평가 활동이 여기에 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            데이터베이스 연동 후 활성화됩니다
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
