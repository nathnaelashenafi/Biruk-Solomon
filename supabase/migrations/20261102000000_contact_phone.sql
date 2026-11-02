-- Optional phone number on contact inquiries (new contact form design).
alter table public.contact_inquiries
  add column phone text check (phone is null or char_length(phone) <= 30);
