-- ============================================================================
-- Kalibrate — migración inicial (S0)
-- ============================================================================
-- Crea las tablas mínimas para el MVP: users (perfil) y goals (objetivos).
-- Las demás tablas (weight_logs, food_entries, menstrual_events, etc.) se
-- crean en migraciones posteriores cuando los sprints correspondientes las
-- necesiten.
--
-- Convenciones:
-- - Todas las tablas tienen RLS habilitado.
-- - Política base: el usuario solo puede leer/escribir filas con su user_id.
-- - Timestamps en UTC (timestamptz).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type biological_sex as enum ('male', 'female');

create type activity_level as enum (
  'sedentary',
  'light',
  'moderate',
  'high',
  'very_high'
);

create type life_phase as enum (
  'fertile_regular',
  'fertile_irregular',
  'hormonal_contraception',
  'perimenopause',
  'menopause'
);

create type hormonal_method as enum (
  'combined_pill',
  'progestin_only',
  'iud_hormonal',
  'iud_copper',
  'implant',
  'injection',
  'patch',
  'none'
);

create type goal_type as enum ('lose', 'maintain', 'gain');

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
-- Perfil base. Una fila por auth.users.id.
-- Se popula durante el onboarding.
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,

  biological_sex biological_sex not null,
  birth_date date not null,
  height_cm numeric(5,2) not null check (height_cm > 50 and height_cm < 250),

  activity_factor activity_level not null default 'moderate',
  body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct > 3 and body_fat_pct < 60)),

  -- Solo aplica para biological_sex = 'female'.
  life_phase life_phase,
  hormonal_method hormonal_method,

  timezone text not null default 'America/Santiago',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Coherencia: life_phase solo para mujeres.
  constraint life_phase_only_female check (
    life_phase is null or biological_sex = 'female'
  ),
  constraint hormonal_method_only_female check (
    hormonal_method is null or biological_sex = 'female'
  )
);

comment on table public.users is 'Perfil base del usuario. Una fila por auth user.';
comment on column public.users.body_fat_pct is 'Opcional. Si presente, se usa Katch-McArdle en vez de Mifflin-St Jeor.';
comment on column public.users.life_phase is 'Solo female. Determina si se aplica modelo de ciclo menstrual.';

-- ----------------------------------------------------------------------------
-- goals
-- ----------------------------------------------------------------------------
-- Histórico de objetivos. Una fila por objetivo activo a la vez.
-- Permite auditar cambios de objetivo y detectar duración acumulada en déficit
-- (input para sugerir diet breaks).
-- ----------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  goal_type goal_type not null,
  target_rate_kg_per_week numeric(3,2) not null
    check (target_rate_kg_per_week between -1.5 and 1.5),

  started_on date not null default current_date,
  ended_on date,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  -- Solo un objetivo activo por usuario.
  constraint one_active_goal_per_user
    exclude using gist (user_id with =) where (is_active)
);

create index goals_user_active_idx on public.goals (user_id) where is_active;

comment on table public.goals is 'Histórico de objetivos. Solo uno activo por usuario.';
comment on column public.goals.target_rate_kg_per_week is 'Negativo para perder, positivo para ganar. Cap a ±1.5 kg/semana.';

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.goals enable row level security;

-- users: el usuario solo accede a su propia fila.
create policy users_select_own
  on public.users for select
  using (id = auth.uid());

create policy users_insert_own
  on public.users for insert
  with check (id = auth.uid());

create policy users_update_own
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- goals: el usuario solo accede a sus propios objetivos.
create policy goals_select_own
  on public.goals for select
  using (user_id = auth.uid());

create policy goals_insert_own
  on public.goals for insert
  with check (user_id = auth.uid());

create policy goals_update_own
  on public.goals for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy goals_delete_own
  on public.goals for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Extensión btree_gist requerida para el constraint exclude.
-- ----------------------------------------------------------------------------
create extension if not exists btree_gist;
