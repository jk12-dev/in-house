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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Calendar,
  FileText,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  BarChart3,
} from "lucide-react";

/* ── 타입 ── */
interface Cycle {
  id: string;
  title: string;
  type: string;
  status: "draft" | "active" | "completed" | "cancelled";
  start_date: string;
  end_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  cycle_id: string | null;
  items: unknown[];
}

/* ── 상태 뱃지 ── */
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "초안", color: "text-gray-700", bg: "bg-gray-100" },
  active: { label: "진행 중", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "완료", color: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { label: "취소", color: "text-red-700", bg: "bg-red-50" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

/* ── 메인 컴포넌트 ── */
export function CycleList({
  type,
  title,
  description,
}: {
  type: "360" | "performance";
  title: string;
  description: string;
}) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    start_date: "",
    end_date: "",
    description: "",
    template_id: "",
  });
  const [saving, setSaving] = useState(false);

  /* ── 데이터 조회 ── */
  const fetchData = useCallback(async () => {
    try {
      const [cyclesRes, templatesRes] = await Promise.all([
        fetch(`/api/evaluation-cycles?type=${type}`),
        fetch("/api/evaluation-templates"),
      ]);
      const cyclesData = await cyclesRes.json();
      const templatesData = await templatesRes.json();
      setCycles(cyclesData.cycles || []);
      setTemplates(templatesData.templates || []);
    } catch {
      console.error("데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 연결된 양식 이름 찾기 ── */
  const getLinkedTemplate = (cycleId: string) =>
    templates.find((t) => t.cycle_id === cycleId);

  /* ── 신규 생성 ── */
  const startCreate = () => {
    setEditingId("new");
    setForm({ title: "", start_date: "", end_date: "", description: "", template_id: "" });
  };

  /* ── 편집 시작 ── */
  const startEdit = (cycle: Cycle) => {
    const linked = getLinkedTemplate(cycle.id);
    setEditingId(cycle.id);
    setForm({
      title: cycle.title,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      description: cycle.description || "",
      template_id: linked?.id || "",
    });
  };

  /* ── 취소 ── */
  const cancelEdit = () => {
    setEditingId(null);
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    if (!form.title.trim() || !form.start_date || !form.end_date) return;
    setSaving(true);

    try {
      if (editingId === "new") {
        await fetch("/api/evaluation-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            type,
            start_date: form.start_date,
            end_date: form.end_date,
            description: form.description.trim() || null,
            template_id: form.template_id || null,
          }),
        });
      } else {
        await fetch(`/api/evaluation-cycles/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            start_date: form.start_date,
            end_date: form.end_date,
            description: form.description.trim() || null,
            template_id: form.template_id || null,
          }),
        });
      }
      cancelEdit();
      await fetchData();
    } catch {
      console.error("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  /* ── 상태 변경 ── */
  const changeStatus = async (id: string, newStatus: string) => {
    const labels: Record<string, string> = {
      active: "진행 중으로 변경하시겠습니까? 평가가 시작됩니다.",
      completed: "완료로 변경하시겠습니까? 평가가 마감됩니다.",
      cancelled: "취소하시겠습니까?",
    };
    if (!confirm(labels[newStatus] || "상태를 변경하시겠습니까?")) return;

    try {
      await fetch(`/api/evaluation-cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchData();
    } catch {
      console.error("상태 변경 실패");
    }
  };

  /* ── 삭제 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("이 평가 회차를 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/evaluation-cycles/${id}`, { method: "DELETE" });
      await fetchData();
    } catch {
      console.error("삭제 실패");
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-64" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ── 생성/편집 폼 ── */
  if (editingId !== null) {
    // 양식 선택용: 연결 안 된 양식 + 현재 편집 중인 회차에 연결된 양식
    const availableTemplates = templates.filter(
      (t) => !t.cycle_id || t.cycle_id === editingId
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editingId === "new" ? "새 평가 회차" : "회차 편집"}
            </h1>
            <p className="text-muted-foreground">평가 기간과 양식을 설정하세요.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4 mr-1" />취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.start_date || !form.end_date}
              className="bg-[#2332D9] hover:bg-[#1b28b0]"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="cycle-title">회차 제목</Label>
              <Input
                id="cycle-title"
                placeholder="예: 2026년 상반기 다면평가"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="max-w-md"
              />
            </div>

            {/* 기간 */}
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="start-date">시작일</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-44"
                />
              </div>
              <span className="pb-2 text-muted-foreground">~</span>
              <div className="space-y-2">
                <Label htmlFor="end-date">종료일</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-44"
                />
              </div>
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="cycle-desc">설명 (선택)</Label>
              <textarea
                id="cycle-desc"
                placeholder="평가 회차에 대한 안내 사항"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="flex w-full max-w-lg rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* 양식 연결 */}
            <div className="space-y-2">
              <Label htmlFor="template-select">평가 양식 연결</Label>
              <select
                id="template-select"
                value={form.template_id}
                onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">양식 미연결</option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.items.length}개 항목)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                평가 양식 페이지에서 먼저 양식을 만들어야 선택할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── 목록 화면 ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={startCreate} className="bg-[#2332D9] hover:bg-[#1b28b0]">
          <Plus className="h-4 w-4 mr-1" />
          새 평가 회차
        </Button>
      </div>

      {cycles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium mb-1">아직 평가 회차가 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              새 평가 회차를 만들어 평가를 시작하세요.
            </p>
            <Button onClick={startCreate} className="bg-[#2332D9] hover:bg-[#1b28b0]">
              <Plus className="h-4 w-4 mr-1" />
              첫 회차 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const linked = getLinkedTemplate(cycle.id);

            return (
              <Card key={cycle.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{cycle.title}</CardTitle>
                      <StatusBadge status={cycle.status} />
                    </div>
                    <div className="flex items-center gap-1">
                      {/* 상태 변경 버튼 */}
                      {cycle.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeStatus(cycle.id, "active")}
                          className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          시작
                        </Button>
                      )}
                      {cycle.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeStatus(cycle.id, "completed")}
                          className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          완료
                        </Button>
                      )}
                      {(cycle.status === "draft" || cycle.status === "active") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeStatus(cycle.id, "cancelled")}
                          className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          취소
                        </Button>
                      )}
                      {(cycle.status === "draft" || cycle.status === "active") && (
                        <>
                          <div className="w-px h-5 bg-border mx-1" />
                          <Link href={`/${type === "360" ? "review-360" : "performance"}/${cycle.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-[#2332D9] hover:text-[#1b28b0] hover:bg-blue-50"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              배정 관리
                            </Button>
                          </Link>
                        </>
                      )}
                      {(cycle.status === "active" || cycle.status === "completed") && (
                        <>
                          <div className="w-px h-5 bg-border mx-1" />
                          <Link href={`/results?cycle_id=${cycle.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-[#2332D9] hover:text-[#1b28b0] hover:bg-blue-50"
                            >
                              <BarChart3 className="h-3 w-3 mr-1" />
                              결과 보기
                            </Button>
                          </Link>
                        </>
                      )}
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button variant="ghost" size="icon" onClick={() => startEdit(cycle)} className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cycle.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(cycle.start_date)} ~ {formatDate(cycle.end_date)}
                    </span>
                    {linked && (
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {linked.name}
                      </span>
                    )}
                  </div>
                  {cycle.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {cycle.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
