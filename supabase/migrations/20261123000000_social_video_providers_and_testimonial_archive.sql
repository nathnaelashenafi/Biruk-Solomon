-- Add native social video providers and reversible testimonial archiving.
-- Forward-only migration; the existing production migration remains untouched.

alter table public.portfolio_videos
  drop constraint if exists portfolio_videos_provider_check;
alter table public.portfolio_videos
  add constraint portfolio_videos_provider_check
  check (provider in ('youtube', 'vimeo', 'tiktok', 'instagram'));

-- Instagram shortcode is stored with a post_/reel_/tv_ prefix so the native
-- player URL can be reconstructed without adding another column.
alter table public.portfolio_videos
  add constraint portfolio_videos_social_id_check
  check (
    (provider = 'instagram' and video_id ~ '^(post|reel|tv)_[A-Za-z0-9_-]{5,20}$')
    or (provider = 'tiktok' and video_id ~ '^[0-9]{6,25}$')
    or (provider = 'youtube' and video_id ~ '^[A-Za-z0-9_-]{11}$')
    or (provider = 'vimeo' and video_id ~ '^[0-9]{6,12}$')
  );

-- Existing thumbnail constraint intentionally remains limited to trusted
-- YouTube/Vimeo hosts. Social providers use their own native preview.
alter table public.testimonials
  drop constraint if exists testimonials_status_check;
alter table public.testimonials
  add constraint testimonials_status_check
  check (status in ('pending', 'approved', 'rejected', 'archived'));

alter table public.testimonials
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by bigint;

create or replace function public.archive_testimonial(p_id uuid, p_admin bigint)
returns text language plpgsql as $$
begin
  update public.testimonials
     set status = 'archived', archived_at = now(), archived_by = p_admin
   where id = p_id and status = 'approved';
  if not found then return 'not_archivable'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id)
    values (p_admin, 'testimonial_archived', p_id);
  return 'ok';
end $$;

-- Restore to pending, not directly to public: a human must explicitly re-approve it.
create or replace function public.restore_testimonial(p_id uuid, p_admin bigint)
returns text language plpgsql as $$
begin
  update public.testimonials
     set status = 'pending', archived_at = null, archived_by = null,
         approved_at = null, approved_by = null,
         profile_image_public_path = null, company_logo_public_path = null
   where id = p_id and status = 'archived';
  if not found then return 'not_restorable'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id)
    values (p_admin, 'testimonial_restored_to_pending', p_id);
  return 'ok';
end $$;

create or replace view public.public_testimonials as
  select id, full_name, position, company, linkedin_url, service_or_project, testimonial_text,
         profile_image_public_path, company_logo_public_path, approved_at
    from public.testimonials where status = 'approved';

revoke all on function public.archive_testimonial(uuid, bigint) from public, anon, authenticated;
revoke all on function public.restore_testimonial(uuid, bigint) from public, anon, authenticated;
grant execute on function public.archive_testimonial(uuid, bigint) to service_role;
grant execute on function public.restore_testimonial(uuid, bigint) to service_role;
