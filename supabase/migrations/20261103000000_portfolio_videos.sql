-- Portfolio videos, managed by Biruk from the Telegram bot and read by the website.
create table public.portfolio_videos (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('youtube', 'vimeo')),
  video_id text not null check (char_length(video_id) between 1 and 40 and video_id ~ '^[A-Za-z0-9_-]+$'),
  title text not null check (char_length(title) between 1 and 150),
  studio text check (studio is null or char_length(studio) <= 100),
  category text not null check (char_length(category) between 1 and 60),   -- the type of video
  thumbnail_url text check (thumbnail_url is null or (char_length(thumbnail_url) <= 400 and thumbnail_url ~ '^https://(i\.ytimg\.com|i\.vimeocdn\.com)/')),
  orientation text not null default 'landscape' check (orientation in ('landscape', 'portrait')),
  created_at timestamptz not null default now(),
  created_by bigint not null,
  unique (provider, video_id)
);
create index portfolio_videos_order_idx on public.portfolio_videos (created_at desc);
alter table public.portfolio_videos enable row level security;

create function public.add_video(
  p_provider text, p_video_id text, p_title text, p_studio text, p_category text,
  p_thumbnail text, p_orientation text, p_admin bigint
) returns text language plpgsql as $$
declare new_id uuid;
begin
  insert into public.portfolio_videos (provider, video_id, title, studio, category, thumbnail_url, orientation, created_by)
  values (p_provider, p_video_id, p_title, p_studio, p_category, p_thumbnail, p_orientation, p_admin)
  on conflict (provider, video_id) do nothing
  returning id into new_id;
  if new_id is null then return 'duplicate'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'video_added', new_id);
  return 'ok';
end $$;

create function public.remove_video(p_id uuid, p_admin bigint)
returns text language plpgsql as $$
begin
  delete from public.portfolio_videos where id = p_id;
  if not found then return 'not_found'; end if;
  insert into public.audit_log (actor_telegram_user_id, action, subject_id) values (p_admin, 'video_removed', p_id);
  return 'ok';
end $$;

-- The only thing the public website can read.
create view public.public_videos as
  select id, provider, video_id, title, studio, category, thumbnail_url, orientation, created_at
    from public.portfolio_videos;

revoke all on public.portfolio_videos from anon, authenticated;
revoke all on public.public_videos from anon, authenticated;
revoke all on function public.add_video(text, text, text, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.remove_video(uuid, bigint) from public, anon, authenticated;
grant select on public.public_videos to anon, authenticated;
grant all on public.portfolio_videos to service_role;
grant execute on function public.add_video(text, text, text, text, text, text, text, bigint) to service_role;
grant execute on function public.remove_video(uuid, bigint) to service_role;

-- Starting videos (the three already on the site). Remove or replace them from the bot.
insert into public.portfolio_videos (provider, video_id, title, studio, category, thumbnail_url, orientation, created_by, created_at) values
  ('youtube', 'zjoIBRTRosw', 'በእንግሊዝኛ ጊዜን ለመግለጽ የግድ መጠቀም ያለባቹ!', 'Learneta Academy', 'Educational video',
   'https://i.ytimg.com/vi/zjoIBRTRosw/maxresdefault.jpg', 'landscape', 0, now()),
  ('youtube', 'fLDc_Dryqzo', 'Short 01', null, 'Short-form',
   'https://i.ytimg.com/vi/fLDc_Dryqzo/maxresdefault.jpg', 'portrait', 0, now() - interval '1 second'),
  ('youtube', 'SSbCsdddoB4', 'Short 02', null, 'Short-form',
   'https://i.ytimg.com/vi/SSbCsdddoB4/maxresdefault.jpg', 'portrait', 0, now() - interval '2 seconds');
