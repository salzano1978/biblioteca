-- Esegui tutto nello SQL Editor di Supabase.

create table libraries (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'La nostra libreria',
  invite_code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,8),
  created_by uuid not null default auth.uid(),
  created_at timestamptz default now()
);

create table members (
  library_id uuid references libraries(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (library_id, user_id)
);

create table books (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references libraries(id) on delete cascade,
  isbn text,
  title text not null,
  authors text,
  publisher text,
  year text,
  cover_url text,
  location text,            -- es. "Salotto > Scaffale 2"
  notes text,
  description text,         -- trama
  categories text,          -- generi separati da virgola
  page_count int,
  language text,
  read_status text check (read_status in ('da_leggere','in_lettura','letto')),
  rating smallint check (rating between 1 and 5),
  loaned_to text,
  loaned_at date,
  added_by uuid default auth.uid(),
  created_at timestamptz default now()
);
create index on books (library_id, title);

alter table libraries enable row level security;
alter table members   enable row level security;
alter table books     enable row level security;

create or replace function is_member(lib uuid) returns boolean
language sql security definer set search_path = public as
$$ select exists (select 1 from members where library_id = lib and user_id = auth.uid()) $$;

-- Crea libreria e ti aggiunge come membro
create or replace function create_library(lib_name text) returns libraries
language plpgsql security definer set search_path = public as $$
declare l libraries;
begin
  insert into libraries(name, created_by) values (lib_name, auth.uid()) returning * into l;
  insert into members(library_id, user_id) values (l.id, auth.uid());
  return l;
end $$;

-- Entra in una libreria con il codice invito
create or replace function join_library(code text) returns libraries
language plpgsql security definer set search_path = public as $$
declare l libraries;
begin
  select * into l from libraries where invite_code = lower(trim(code));
  if l.id is null then raise exception 'Codice non valido'; end if;
  insert into members(library_id, user_id) values (l.id, auth.uid()) on conflict do nothing;
  return l;
end $$;

create policy "lib: vedi le tue" on libraries for select using (is_member(id));
create policy "members: vedi i tuoi" on members for select using (user_id = auth.uid());
create policy "books: select" on books for select using (is_member(library_id));
create policy "books: insert" on books for insert with check (is_member(library_id));
create policy "books: update" on books for update using (is_member(library_id));
create policy "books: delete" on books for delete using (is_member(library_id));
