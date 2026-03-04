-- =============================================
-- In-House 인사평가 시스템 DB 초기 설정
-- =============================================

-- 1. 사용자 테이블
create table users (
  id uuid primary key default gen_random_uuid(),
  naver_works_id text unique,
  email text unique not null,
  name text not null,
  department text,
  position text,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  manager_id uuid references users(id),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 평가 회차 테이블
create table evaluation_cycles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('360', 'performance')),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'cancelled')),
  start_date date not null,
  end_date date not null,
  description text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. 평가 양식 테이블
create table evaluation_templates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references evaluation_cycles(id) on delete cascade,
  name text not null,
  items jsonb not null default '[]',
  -- items 예시: [{"category": "역량", "question": "업무 전문성", "type": "score", "weight": 20}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. 평가 배정 테이블
create table evaluation_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references evaluation_cycles(id) on delete cascade,
  evaluator_id uuid references users(id) not null,
  evaluatee_id uuid references users(id) not null,
  relation_type text not null check (relation_type in ('superior', 'peer', 'subordinate', 'self')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. 평가 응답 테이블
create table evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references evaluation_assignments(id) on delete cascade unique,
  scores jsonb not null default '[]',
  -- scores 예시: [{"item_id": 0, "score": 4, "comment": "잘하고 있음"}]
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. 평가 결과 테이블
create table evaluation_results (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references evaluation_cycles(id) on delete cascade,
  user_id uuid references users(id) not null,
  total_score numeric(5,2),
  grade text check (grade in ('S', 'A', 'B', 'C', 'D')),
  summary text,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. 목표 (MBO) 테이블
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  cycle_id uuid references evaluation_cycles(id) on delete cascade,
  title text not null,
  description text,
  weight integer default 0,
  target_value text,
  actual_value text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'in_progress', 'completed')),
  self_rating integer check (self_rating between 1 and 5),
  manager_rating integer check (manager_rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Row Level Security (RLS) 활성화
-- =============================================
alter table users enable row level security;
alter table evaluation_cycles enable row level security;
alter table evaluation_templates enable row level security;
alter table evaluation_assignments enable row level security;
alter table evaluation_responses enable row level security;
alter table evaluation_results enable row level security;
alter table goals enable row level security;

-- 임시 정책: 모든 인증된 사용자가 읽기 가능 (나중에 세분화)
create policy "인증된 사용자 읽기" on users for select to authenticated using (true);
create policy "인증된 사용자 읽기" on evaluation_cycles for select to authenticated using (true);
create policy "인증된 사용자 읽기" on evaluation_templates for select to authenticated using (true);
create policy "인증된 사용자 읽기" on evaluation_assignments for select to authenticated using (true);
create policy "인증된 사용자 읽기" on evaluation_responses for select to authenticated using (true);
create policy "인증된 사용자 읽기" on evaluation_results for select to authenticated using (true);
create policy "인증된 사용자 읽기" on goals for select to authenticated using (true);
