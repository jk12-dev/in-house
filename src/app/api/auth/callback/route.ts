import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    // 1. 인가 코드로 액세스 토큰 발급
    const tokenRes = await fetch(
      "https://auth.worksmobile.com/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.NAVER_WORKS_CLIENT_ID!,
          client_secret: process.env.NAVER_WORKS_CLIENT_SECRET!,
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL!}/api/auth/callback`,
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token error:", tokenData);
      return NextResponse.redirect(
        new URL("/login?error=token_failed", request.url)
      );
    }

    // 2. 액세스 토큰으로 사용자 정보 조회
    const userRes = await fetch("https://www.worksapis.com/v1.0/users/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();

    if (!userRes.ok) {
      console.error("User info error:", userData);
      return NextResponse.redirect(
        new URL("/login?error=user_info_failed", request.url)
      );
    }

    // 3. 로그인한 사용자를 Supabase에 upsert
    const primaryOrg = userData.organizations?.find((o: { primary: boolean }) => o.primary) || userData.organizations?.[0];
    const primaryOrgUnit = primaryOrg?.orgUnits?.find((u: { primary: boolean }) => u.primary) || primaryOrg?.orgUnits?.[0];
    const userName = (userData.userName?.lastName || "") + (userData.userName?.firstName || "");

    await supabaseAdmin
      .from("users")
      .upsert(
        {
          naver_works_id: userData.userId,
          email: userData.email || "",
          name: userName,
          department: primaryOrgUnit?.orgUnitName || null,
          department_id: primaryOrgUnit?.orgUnitId || null,
          position: primaryOrg?.levelName || null,
          avatar_url: userData.photoUrl || null,
        },
        { onConflict: "naver_works_id" }
      );

    // 4. 세션 쿠키에 사용자 정보 저장
    const session = {
      userId: userData.userId,
      name: userName,
      email: userData.email || "",
      department: primaryOrgUnit?.orgUnitName || "",
      position: primaryOrg?.levelName || "",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=unknown", request.url)
    );
  }
}
