import { redirect } from "next/navigation";

// 네이버 웍스 로그인 페이지로 리다이렉트
export async function GET() {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email directory.read user.read",
    state: crypto.randomUUID(),
  });

  redirect(
    `https://auth.worksmobile.com/oauth2/v2.0/authorize?${params.toString()}`
  );
}
