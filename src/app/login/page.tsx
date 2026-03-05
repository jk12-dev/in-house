import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F6F2] px-4">
      <div className="w-full max-w-sm text-center">
        <h1
          className="mb-2 text-3xl tracking-tight text-[#212121]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          likethix Garden
        </h1>
        <p className="mb-10 text-sm text-[#999999]">
          사내 인사평가 시스템
        </p>

        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/api/auth">
            <svg
              className="mr-2 h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            네이버 웍스로 로그인
          </Link>
        </Button>

        <p className="mt-6 text-xs text-[#999999]">
          회사 네이버 웍스 계정으로만 로그인할 수 있습니다
        </p>
      </div>
    </div>
  );
}
