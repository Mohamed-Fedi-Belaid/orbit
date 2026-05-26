
-- Enums
create type public.app_role as enum ('admin', 'user');
create type public.project_status as enum ('active', 'on_hold', 'completed', 'archived');
create type public.task_status as enum ('todo', 'in_progress', 'in_review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile + role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  status public.project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create policy "Owners view their projects"
  on public.projects for select to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(), 'admin'));
create policy "Owners insert their projects"
  on public.projects for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owners update their projects"
  on public.projects for update to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(), 'admin'));
create policy "Owners delete their projects"
  on public.projects for delete to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(), 'admin'));

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date timestamptz,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create policy "Users view own or assigned tasks"
  on public.tasks for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = assignee_id or public.has_role(auth.uid(), 'admin'));
create policy "Users insert their tasks"
  on public.tasks for insert to authenticated with check (auth.uid() = owner_id);
create policy "Users update own or assigned tasks"
  on public.tasks for update to authenticated
  using (auth.uid() = owner_id or auth.uid() = assignee_id or public.has_role(auth.uid(), 'admin'));
create policy "Owners delete their tasks"
  on public.tasks for delete to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(), 'admin'));

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

create policy "View comments on visible tasks"
  on public.comments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id
    and (t.owner_id = auth.uid() or t.assignee_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "Insert own comments"
  on public.comments for insert to authenticated with check (auth.uid() = author_id);
create policy "Update own comments"
  on public.comments for update to authenticated using (auth.uid() = author_id);
create policy "Delete own comments"
  on public.comments for delete to authenticated
  using (auth.uid() = author_id or public.has_role(auth.uid(), 'admin'));

-- Tags
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);
alter table public.tags enable row level security;
create policy "Owner manages tags"
  on public.tags for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Task tags
create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);
alter table public.task_tags enable row level security;
create policy "Manage task_tags via task ownership"
  on public.task_tags for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()));

-- Indexes
create index idx_projects_owner on public.projects(owner_id);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_owner on public.tasks(owner_id);
create index idx_tasks_assignee on public.tasks(assignee_id);
create index idx_tasks_status on public.tasks(status);
create index idx_comments_task on public.comments(task_id);
