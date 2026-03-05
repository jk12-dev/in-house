-- =============================================
-- 부서(조직도) 테이블 추가
-- =============================================

create table departments (
  id uuid primary key default gen_random_uuid(),
  naver_works_org_id text unique,
  name text not null,
  description text,
  parent_org_id text,
  display_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table departments enable row level security;
create policy "인증된 사용자 읽기" on departments for select to authenticated using (true);

-- users 테이블에 department_id 컬럼 추가
alter table users add column if not exists department_id text;

-- RLS: 서버에서 upsert 가능하도록 service_role은 자동 우회됨
-- anon/authenticated 유저의 INSERT/UPDATE 정책 (필요시)
create policy "서버 동기화 쓰기" on users for all to service_role using (true);
create policy "서버 동기화 쓰기" on departments for all to service_role using (true);
