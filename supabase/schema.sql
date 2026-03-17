    -- Workstat schema for Supabase
    create table if not exists public.work_statuses (
    id text primary key,
    project_name text,
    sub_project_name text,
    topic text,
    priority text default 'medium',
    risk_level text default 'green',
    progress integer not null default 0 check (progress >= 0 and progress <= 100),
    completed_work text,
    blockers text,
    next_step text,
    next_step_at text,
    trr_date text,
    trial_prep_start text,
    trial_prep_end text,
    trial_date text,
    sub_project_eta text,
    project_eta text,
    comments text,
    updated_at bigint not null,
    updated_by text
    );

    alter table public.work_statuses add column if not exists priority text default 'medium';
    alter table public.work_statuses add column if not exists risk_level text default 'green';
    alter table public.work_statuses add column if not exists blockers text;
    alter table public.work_statuses add column if not exists trr_date text;
    alter table public.work_statuses add column if not exists trial_prep_start text;
    alter table public.work_statuses add column if not exists trial_prep_end text;
    alter table public.work_statuses add column if not exists trial_date text;

    create index if not exists idx_work_statuses_updated_at
    on public.work_statuses (updated_at desc);

    alter table public.work_statuses enable row level security;

    -- Open policies for anon usage (same behavior as current app without auth)
    drop policy if exists work_statuses_select_all on public.work_statuses;
    create policy work_statuses_select_all
    on public.work_statuses
    for select
    to anon
    using (true);

    drop policy if exists work_statuses_insert_all on public.work_statuses;
    create policy work_statuses_insert_all
    on public.work_statuses
    for insert
    to anon
    with check (true);

    drop policy if exists work_statuses_update_all on public.work_statuses;
    create policy work_statuses_update_all
    on public.work_statuses
    for update
    to anon
    using (true)
    with check (true);

    drop policy if exists work_statuses_delete_all on public.work_statuses;
    create policy work_statuses_delete_all
    on public.work_statuses
    for delete
    to anon
    using (true);
