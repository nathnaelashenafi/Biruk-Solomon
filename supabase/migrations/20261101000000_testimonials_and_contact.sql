-- Testimonial invitations, testimonials, contact inquiries and supporting tables.
-- Every table is private (RLS on, no policies). Only the Edge Functions (service role)
-- touch them. The public website reads approved testimonials through one view.
create extension if not exists pgcrypto;

create table public.testimonial_invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,                       -- SHA-256 of the token; the token itself is never stored
  intended_name text not null check (char_length(intended_name) between 1 and 100),
  intended_company text check (intended_company is null or char_length(intended_company) <= 120),
  intended_email text check (intended_email is null or char_length(intended_email) <= 254),
  status text not null default 'unused' check (status in ('unused', 'used', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  cancelled_at timestamptz,
  created_by_telegram_user_id bigint not null
);
create index testimonial_invitations_active_idx on public.testimonial_invitations (status, expires_at);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.testimonial_invitations (id),
  full_name text not null check (char_length(full_name) between 1 and 100),
  position text not null check (char_length(position) between 1 and 120),
  company text check (company is null or char_length(company) <= 120),
  linkedin_url text check (linkedin_url is null or (char_length(linkedin_url) <= 300 and linkedin_url ~* '^https://([a-z0-9-]+\.)?linkedin\.com/')),
  service_or_project text not null check (char_length(service_or_project) between 1 and 160),
  testimonial_text text not null check (char_length(testimonial_text) between 20 and 1500),
  profile_image_path text,                               -- private bucket
  company_logo_path text,                                -- private bucket
  profile_image_public_path text,                        -- public bucket, set only on approval
  company_logo_public_path text,                         -- public bucket, set only on approval
  consent_given boolean not null check (consent_given),
  consent_timestamp timestamptz not null,
  consent_version text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by bigint,
  rejected_at timestamptz,
  rejected_by bigint,
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notification_attempts int not null default 0,
  last_notification_attempt_at timestamptz
);
create index testimonials_status_idx on public.testimonials (status, submitted_at desc);

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  subject text check (subject is null or char_length(subject) <= 150),
  message text not null check (char_length(message) between 1 and 3000),
  created_at timestamptz not null default now(),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notification_attempts int not null default 0,
  last_notification_attempt_at timestamptz
);
create index contact_inquiries_notify_idx on public.contact_inquiries (notification_status, created_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_telegram_user_id bigint,
  action text not null,
  subject_id uuid,
  details jsonb
);
create table public.bot_sessions (
  telegram_user_id bigint primary key,
  step text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.telegram_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now()
);
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);

-- Fixed-window rate limiter. Returns true while the caller is within the limit.
create function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean language plpgsql as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  h int;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into h;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return h <= p_max;
end $$;

create function public.create_invitation(p_token_hash text, p_name text, p_company text, p_email text, p_admin bigint)
returns jsonb language plpgsql as $$
declare inv public.testimonial_invitations;
begin
  insert into public.testimonial_invitations
    (token_hash, intended_name, intended_company, intended_email, expires_at, created_by_telegram_user_id)
  values (p_token_hash, p_name, p_company, p_email, now() + interval '1 hour', p_admin)
  returning * into inv;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'invitation_created', inv.id);
  return jsonb_build_object('id', inv.id, 'expires_at', inv.expires_at);
end $$;

create function public.cancel_invitation(p_id uuid, p_admin bigint)
returns text language plpgsql as $$
begin
  update public.testimonial_invitations set status = 'cancelled', cancelled_at = now()
   where id = p_id and status = 'unused';
  if not found then return 'not_cancellable'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'invitation_cancelled', p_id);
  return 'ok';
end $$;

create function public.check_invitation(p_token_hash text)
returns jsonb language plpgsql stable as $$
declare inv public.testimonial_invitations;
begin
  select * into inv from public.testimonial_invitations where token_hash = p_token_hash;
  if not found then return jsonb_build_object('state', 'invalid'); end if;
  if inv.status = 'used' then return jsonb_build_object('state', 'used'); end if;
  if inv.status = 'cancelled' then return jsonb_build_object('state', 'cancelled'); end if;
  if inv.expires_at <= now() then return jsonb_build_object('state', 'expired'); end if;
  return jsonb_build_object('state', 'valid', 'intended_name', inv.intended_name, 'intended_company', inv.intended_company);
end $$;

-- Claims the invitation and stores the testimonial in ONE transaction.
-- The row lock makes concurrent submissions queue up; the second one sees "used".
create function public.submit_testimonial(
  p_token_hash text, p_full_name text, p_position text, p_company text, p_linkedin text,
  p_service text, p_text text, p_profile_path text, p_logo_path text, p_consent_version text
) returns uuid language plpgsql as $$
declare inv public.testimonial_invitations; new_id uuid;
begin
  select * into inv from public.testimonial_invitations where token_hash = p_token_hash for update;
  if not found then raise exception 'invalid_invitation'; end if;
  if inv.status = 'used' then raise exception 'used_invitation'; end if;
  if inv.status = 'cancelled' then raise exception 'cancelled_invitation'; end if;
  if inv.expires_at <= now() then raise exception 'expired_invitation'; end if;
  insert into public.testimonials
    (invitation_id, full_name, position, company, linkedin_url, service_or_project, testimonial_text,
     profile_image_path, company_logo_path, consent_given, consent_timestamp, consent_version)
  values (inv.id, p_full_name, p_position, p_company, p_linkedin, p_service, p_text,
     p_profile_path, p_logo_path, true, now(), p_consent_version)
  returning id into new_id;
  update public.testimonial_invitations set status = 'used', used_at = now() where id = inv.id;
  insert into public.audit_log (action, subject_id) values ('testimonial_submitted', new_id);
  return new_id;
end $$;

create function public.approve_testimonial(p_id uuid, p_admin bigint, p_profile_public text, p_logo_public text)
returns text language plpgsql as $$
begin
  update public.testimonials
     set status = 'approved', approved_at = now(), approved_by = p_admin,
         profile_image_public_path = p_profile_public, company_logo_public_path = p_logo_public
   where id = p_id and status = 'pending';
  if not found then return 'not_pending'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'testimonial_approved', p_id);
  return 'ok';
end $$;

create function public.reject_testimonial(p_id uuid, p_admin bigint)
returns text language plpgsql as $$
begin
  update public.testimonials set status = 'rejected', rejected_at = now(), rejected_by = p_admin
   where id = p_id and status = 'pending';
  if not found then return 'not_pending'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'testimonial_rejected', p_id);
  return 'ok';
end $$;

-- The only thing the public website can read.
create view public.public_testimonials as
  select id, full_name, position, company, linkedin_url, service_or_project, testimonial_text,
         profile_image_public_path, company_logo_public_path, approved_at
    from public.testimonials where status = 'approved';

alter table public.testimonial_invitations enable row level security;
alter table public.testimonials enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.audit_log enable row level security;
alter table public.bot_sessions enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.rate_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant select on public.public_testimonials to anon, authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- No storage policies on purpose: anonymous users can neither list nor upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('testimonial-private', 'testimonial-private', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('testimonial-public',  'testimonial-public',  true,  2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
