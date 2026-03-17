    -- Workstat schema for Supabase
    create table if not exists public.work_statuses (
    id text primary key,
    project_name text,
    sub_project_name text,
    topic text,
    progress integer not null default 0 check (progress >= 0 and progress <= 100),
    completed_work text,
    next_step text,
    next_step_at text,
    sub_project_eta text,
    project_eta text,
    comments text,
    updated_at bigint not null,
    updated_by text
    );

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
