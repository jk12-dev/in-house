"use client";

import { useCallback, useEffect, useState } from "react";
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
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  AlertCircle,
} from "lucide-react";

/* ── 타입 ── */
interface TemplateItem {
  category: string;
  question: string;
  type: "score" | "text";
  weight: number;
}

interface Template {
  id: string;
  name: string;
  items: TemplateItem[];
  cycle_id: string | null;
  created_at: string;
  updated_at: string;
}

/* ── 빈 항목 생성 ── */
function emptyItem(): TemplateItem {
  return { category: "", question: "", type: "score", weight: 0 };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null); // null=목록, "new"=신규, uuid=편집
  const [editName, setEditName] = useState("");
  const [editItems, setEditItems] = useState<TemplateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  /* ── 데이터 조회 ── */
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/evaluation-templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      console.error("양식 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /* ── 신규 생성 모드 ── */
  const startCreate = () => {
    setEditingId("new");
    setEditName("");
    setEditItems([emptyItem()]);
  };

  /* ── 편집 모드 ── */
  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditItems(
      template.items.length > 0
        ? template.items.map((item) => ({ ...item }))
        : [emptyItem()]
    );
  };

  /* ── 편집 취소 ── */
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditItems([]);
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);

    // 빈 항목 제거
    const cleanItems = editItems.filter(
      (item) => item.question.trim() !== ""
    );

    try {
      if (editingId === "new") {
        await fetch("/api/evaluation-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), items: cleanItems }),
        });
      } else {
        await fetch(`/api/evaluation-templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), items: cleanItems }),
        });
      }
      cancelEdit();
      await fetchTemplates();
    } catch {
      console.error("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  /* ── 삭제 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("이 평가 양식을 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/evaluation-templates/${id}`, { method: "DELETE" });
      await fetchTemplates();
    } catch {
      console.error("삭제 실패");
    }
  };

  /* ── 항목 조작 ── */
  const addItem = () => setEditItems([...editItems, emptyItem()]);

  const removeItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: string | number) => {
    setEditItems(
      editItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  /* ── 가중치 합계 ── */
  const totalWeight = editItems.reduce((sum, item) => sum + (item.weight || 0), 0);

  /* ── 카드 펼치기/접기 ── */
  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">평가 양식</h1>
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ── 편집 모드 UI ── */
  if (editingId !== null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editingId === "new" ? "새 평가 양식" : "양식 편집"}
            </h1>
            <p className="text-muted-foreground">
              평가 항목을 구성하세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="bg-[#2332D9] hover:bg-[#1b28b0]"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>

        {/* 양식 이름 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="template-name">양식 이름</Label>
              <Input
                id="template-name"
                placeholder="예: 2026년 상반기 역량평가"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* 가중치 안내 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">가중치 합계:</span>
          <span
            className={`font-semibold ${
              totalWeight === 100
                ? "text-emerald-600"
                : totalWeight > 100
                  ? "text-red-500"
                  : "text-amber-600"
            }`}
          >
            {totalWeight}%
          </span>
          {totalWeight !== 100 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              100%가 되어야 합니다
            </span>
          )}
        </div>

        {/* 평가 항목 리스트 */}
        <div className="space-y-3">
          {editItems.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="pt-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 grid gap-3 md:grid-cols-[1fr_2fr_auto_auto] items-end">
                    {/* 카테고리 */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">카테고리</Label>
                      <Input
                        placeholder="예: 역량"
                        value={item.category}
                        onChange={(e) => updateItem(index, "category", e.target.value)}
                      />
                    </div>
                    {/* 질문 */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">질문</Label>
                      <Input
                        placeholder="예: 업무 전문성이 뛰어나다"
                        value={item.question}
                        onChange={(e) => updateItem(index, "question", e.target.value)}
                      />
                    </div>
                    {/* 유형 */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">유형</Label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(index, "type", e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="score">점수</option>
                        <option value="text">서술형</option>
                      </select>
                    </div>
                    {/* 가중치 */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">가중치(%)</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.weight}
                          onChange={(e) => updateItem(index, "weight", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={editItems.length <= 1}
                          className="h-9 w-9 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 항목 추가 */}
        <Button variant="outline" onClick={addItem} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-1" />
          항목 추가
        </Button>
      </div>
    );
  }

  /* ── 목록 화면 ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">평가 양식</h1>
          <p className="text-muted-foreground">
            평가에 사용할 양식을 관리합니다.
          </p>
        </div>
        <Button onClick={startCreate} className="bg-[#2332D9] hover:bg-[#1b28b0]">
          <Plus className="h-4 w-4 mr-1" />
          새 양식 만들기
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium mb-1">아직 양식이 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              평가에 사용할 양식을 만들어보세요.
            </p>
            <Button onClick={startCreate} className="bg-[#2332D9] hover:bg-[#1b28b0]">
              <Plus className="h-4 w-4 mr-1" />
              첫 양식 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => {
            const expanded = expandedCards.has(tpl.id);
            const weightSum = tpl.items.reduce((s, i) => s + (i.weight || 0), 0);
            const scoreCount = tpl.items.filter((i) => i.type === "score").length;
            const textCount = tpl.items.filter((i) => i.type === "text").length;

            return (
              <Card key={tpl.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(tpl.id)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <span className="text-xs text-muted-foreground ml-2">
                        {tpl.items.length}개 항목
                        {scoreCount > 0 && ` · 점수 ${scoreCount}`}
                        {textCount > 0 && ` · 서술 ${textCount}`}
                        {weightSum > 0 && ` · 가중치 ${weightSum}%`}
                      </span>
                    </button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(tpl)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tpl.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expanded && tpl.items.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40 text-muted-foreground">
                            <th className="text-left px-3 py-2 font-medium">카테고리</th>
                            <th className="text-left px-3 py-2 font-medium">질문</th>
                            <th className="text-center px-3 py-2 font-medium w-20">유형</th>
                            <th className="text-right px-3 py-2 font-medium w-20">가중치</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tpl.items.map((item, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-2 text-muted-foreground">{item.category || "—"}</td>
                              <td className="px-3 py-2">{item.question}</td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                                    item.type === "score"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {item.type === "score" ? "점수" : "서술"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {item.weight > 0 ? `${item.weight}%` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
