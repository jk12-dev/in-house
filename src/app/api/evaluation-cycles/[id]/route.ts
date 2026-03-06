import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH: 평가 회차 수정 / 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.status !== undefined) updates.status = body.status;
  if (body.start_date !== undefined) updates.start_date = body.start_date;
  if (body.end_date !== undefined) updates.end_date = body.end_date;
  if (body.description !== undefined) updates.description = body.description?.trim() || null;

  const { data: cycle, error } = await supabaseAdmin
    .from("evaluation_cycles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 양식 연결 변경
  if (body.template_id !== undefined) {
    // 기존 연결 해제
    await supabaseAdmin
      .from("evaluation_templates")
      .update({ cycle_id: null, updated_at: new Date().toISOString() })
      .eq("cycle_id", id);

    // 새 연결
    if (body.template_id) {
      await supabaseAdmin
        .from("evaluation_templates")
        .update({ cycle_id: id, updated_at: new Date().toISOString() })
        .eq("id", body.template_id);
    }
  }

  return NextResponse.json({ cycle });
}

// DELETE: 평가 회차 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;

  // 연결된 양식의 cycle_id를 null로
  await supabaseAdmin
    .from("evaluation_templates")
    .update({ cycle_id: null, updated_at: new Date().toISOString() })
    .eq("cycle_id", id);

  const { error } = await supabaseAdmin
    .from("evaluation_cycles")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
