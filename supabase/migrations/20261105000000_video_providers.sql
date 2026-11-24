-- TikTok and Instagram videos: cover pictures stored by us, plus the original link for an "Open" button.
alter table public.portfolio_videos drop constraint portfolio_videos_provider_check;
alter table public.portfolio_videos
  add constraint portfolio_videos_provider_check check (provider in ('youtube', 'vimeo', 'tiktok', 'instagram'));

-- Covers may now also live in our own public bucket.
alter table public.portfolio_videos drop constraint portfolio_videos_thumbnail_url_check;
alter table public.portfolio_videos
  add constraint portfolio_videos_thumbnail_url_check check (
    thumbnail_url is null or (
      char_length(thumbnail_url) <= 400
      and thumbnail_url ~ '^https://(i\.ytimg\.com/|i\.vimeocdn\.com/|[a-z0-9-]+\.supabase\.co/storage/v1/object/public/video-covers/)'
    )
  );

alter table public.portfolio_videos
  add column source_url text check (source_url is null or (char_length(source_url) <= 500 and source_url ~ '^https://'));

drop function public.add_video(text, text, text, text, text, text, text, bigint);
create function public.add_video(
  p_provider text, p_video_id text, p_title text, p_studio text, p_category text,
  p_thumbnail text, p_orientation text, p_source_url text, p_admin bigint
) returns text language plpgsql as $$
declare new_id uuid;
begin
  insert into public.portfolio_videos
    (provider, video_id, title, studio, category, thumbnail_url, orientation, source_url, created_by)
  values (p_provider, p_video_id, p_title, p_studio, p_category, p_thumbnail, p_orientation, p_source_url, p_admin)
  on conflict (provider, video_id) do nothing
  returning id into new_id;
  if new_id is null then return 'duplicate'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'video_added', new_id);
  return 'ok';
end $$;

-- new column goes last so the existing view definition stays valid
create or replace view public.public_videos as
  select id, provider, video_id, title, studio, category, thumbnail_url, orientation, created_at, source_url
    from public.portfolio_videos;

revoke all on function public.add_video(text, text, text, text, text, text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.add_video(text, text, text, text, text, text, text, text, bigint) to service_role;
grant select on public.public_videos to anon, authenticated;

-- Public bucket for cover pictures. No storage policies: visitors can open a file by its exact link, nothing more.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('video-covers', 'video-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
