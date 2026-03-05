import { createClient } from "@supabase/supabase-js";

// 서버 전용 클라이언트 - RLS를 우회하여 데이터 upsert 가능
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
