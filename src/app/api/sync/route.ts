import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  fetchAllMembers,
  fetchAllOrgUnits,
  toUserRecord,
  toOrgUnitRecord,
} from "@/lib/naver-works";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    // 1. 부서(조직도) 동기화
    const orgUnits = await fetchAllOrgUnits(session.accessToken);
    const orgRecords = orgUnits.map(toOrgUnitRecord);

    if (orgRecords.length > 0) {
      const { error: orgError } = await supabaseAdmin
        .from("departments")
        .upsert(orgRecords, { onConflict: "naver_works_org_id" });

      if (orgError) {
        console.error("부서 동기화 오류:", orgError);
        return NextResponse.json(
          { error: "부서 동기화 실패", detail: orgError.message },
          { status: 500 }
        );
      }
    }

    // 2. 구성원 동기화
    const members = await fetchAllMembers(session.accessToken);
    const userRecords = members.map(toUserRecord);
    const worksIds = userRecords.map((r) => r.naver_works_id);

    if (userRecords.length > 0) {
      // 수동 퇴사 처리된 사용자 목록 조회 (동기화로 덮어쓰지 않음)
      const { data: manuallyDeactivated } = await supabaseAdmin
        .from("users")
        .select("naver_works_id")
        .eq("is_active", false);

      const manuallyDeactivatedIds = new Set(
        (manuallyDeactivated || []).map((u) => u.naver_works_id)
      );

      // 수동 퇴사자는 제외하고 upsert
      const activeRecords = userRecords
        .filter((r) => !manuallyDeactivatedIds.has(r.naver_works_id))
        .map((r) => ({ ...r, is_active: true }));

      // 수동 퇴사자는 is_active 제외하고 정보만 업데이트
      const inactiveRecords = userRecords.filter((r) =>
        manuallyDeactivatedIds.has(r.naver_works_id)
      );

      if (activeRecords.length > 0) {
        const { error: userError } = await supabaseAdmin
          .from("users")
          .upsert(activeRecords, { onConflict: "naver_works_id" });

        if (userError) {
          console.error("구성원 동기화 오류:", userError);
          return NextResponse.json(
            { error: "구성원 동기화 실패", detail: userError.message },
            { status: 500 }
          );
        }
      }

      // 수동 퇴사자 정보 업데이트 (is_active는 건드리지 않음)
      for (const record of inactiveRecords) {
        await supabaseAdmin
          .from("users")
          .update({
            email: record.email,
            name: record.name,
            department: record.department,
            department_id: record.department_id,
            position: record.position,
            employee_number: record.employee_number,
            avatar_url: record.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq("naver_works_id", record.naver_works_id);
      }

      // 웍스에 없고 + 아직 활성 상태인 사용자 → 비활성화 (완전 삭제된 퇴사자)
      const { data: deactivated } = await supabaseAdmin
        .from("users")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("is_active", true)
        .not("naver_works_id", "in", `(${worksIds.join(",")})`)
        .select("id");

      return NextResponse.json({
        success: true,
        synced: {
          departments: orgRecords.length,
          members: userRecords.length,
          deactivated: deactivated?.length || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      synced: {
        departments: orgRecords.length,
        members: 0,
        deactivated: 0,
      },
    });
  } catch (error) {
    console.error("동기화 오류:", error);
    return NextResponse.json(
      { error: "동기화 중 오류 발생", detail: String(error) },
      { status: 500 }
    );
  }
}
