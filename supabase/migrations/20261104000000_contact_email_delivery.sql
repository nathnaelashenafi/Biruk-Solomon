-- Track contact email delivery and make public submissions safely retryable.
alter table public.contact_inquiries
  add column idempotency_key uuid,
  add column email_status text not null default 'not_migrated'
    check (email_status in ('not_migrated', 'pending', 'sending', 'sent', 'failed', 'not_configured')),
  add column email_attempts int not null default 0
    check (email_attempts between 0 and 6),
  add column last_email_attempt_at timestamptz,
  add column email_sent_at timestamptz,
  add column email_provider_id text,
  add column last_email_error_code text;

create unique index contact_inquiries_idempotency_key_idx
  on public.contact_inquiries (idempotency_key)
  where idempotency_key is not null;
create index contact_inquiries_email_retry_idx
  on public.contact_inquiries (email_status, last_email_attempt_at);

create function public.claim_contact_email(p_id uuid)
returns boolean language plpgsql as $$
begin
  update public.contact_inquiries
     set email_status = 'sending',
         email_attempts = email_attempts + 1,
         last_email_attempt_at = now()
   where id = p_id
     and email_attempts < 6
     and (
       email_status in ('pending', 'failed', 'not_configured')
       or (email_status = 'sending' and last_email_attempt_at < now() - interval '5 minutes')
     );
  return found;
end $$;

revoke all on function public.claim_contact_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_contact_email(uuid) to service_role;
