#!/bin/bash
# Needs a local Postgres. Create the Supabase-style roles and a storage.buckets stub first (see SETUP.md, "Database tests").
q() { su postgres -c "psql -At -d t -c \"$1\"" 2>&1; }
as_anon() { su postgres -c "psql -At -d t -c \"set role anon; $1\"" 2>&1; }
pass=0; fail=0
check() { if [ "$2" == "$3" ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1 (got: $2 | want: $3)"; fail=$((fail+1)); fi; }
SUB="select public.submit_testimonial('HASH1','Ann','CEO','Co',null,'Edit','twenty chars at least ok',null,null,'v1')"

q "select (public.create_invitation('HASH1','Ann','Co',null,111)->>'id')" >/dev/null
check "valid invitation can be opened" "$(q "select public.check_invitation('HASH1')->>'state'")" "valid"
check "unknown token is invalid" "$(q "select public.check_invitation('NOPE')->>'state'")" "invalid"
check "invitation expires exactly 1 hour after creation" "$(q "select round(extract(epoch from (expires_at - created_at))) from testimonial_invitations where token_hash='HASH1'")" "3600"
check "opening the form does not consume the invitation" "$(q "select public.check_invitation('HASH1')->>'state'")" "valid"

su postgres -c "psql -At -d t -c \"begin; $SUB; select pg_sleep(2); commit;\"" > /tmp/A.out 2>&1 &
sleep 0.5
su postgres -c "psql -At -d t -c \"$SUB\"" > /tmp/B.out 2>&1
wait
check "two concurrent submissions: exactly one succeeds" "$(cat /tmp/A.out /tmp/B.out | grep -Ec '^[0-9a-f]{8}-')" "1"
check "two concurrent submissions: the other is refused as used" "$(cat /tmp/A.out /tmp/B.out | grep -c 'used_invitation')" "1"
check "exactly one testimonial row exists" "$(q "select count(*) from testimonials")" "1"
check "invitation is now used" "$(q "select public.check_invitation('HASH1')->>'state'")" "used"
check "used invitation cannot be reused" "$(q "$SUB" | grep -c used_invitation)" "1"
check "new testimonial starts as pending" "$(q "select status from testimonials")" "pending"
check "consent timestamp is set by the server" "$(q "select consent_timestamp is not null and consent_given from testimonials")" "t"

q "select public.create_invitation('HASH2','Bob',null,null,111)" >/dev/null
q "update testimonial_invitations set expires_at = now() - interval '1 second' where token_hash='HASH2'" >/dev/null
check "expired invitation reports expired" "$(q "select public.check_invitation('HASH2')->>'state'")" "expired"
check "expired invitation is refused server-side" "$(q "select public.submit_testimonial('HASH2','Bob','x','',null,'s','twenty chars at least ok',null,null,'v1')" | grep -c expired_invitation)" "1"

ID3=$(q "select public.create_invitation('HASH3','Cy',null,null,111)->>'id'")
check "cancel works once" "$(q "select public.cancel_invitation('$ID3',111)")" "ok"
check "cancelling twice is refused" "$(q "select public.cancel_invitation('$ID3',111)")" "not_cancellable"
check "cancelled invitation reports cancelled" "$(q "select public.check_invitation('HASH3')->>'state'")" "cancelled"
check "cancelled invitation cannot be used" "$(q "select public.submit_testimonial('HASH3','Cy','x','',null,'s','twenty chars at least ok',null,null,'v1')" | grep -c cancelled_invitation)" "1"

q "select public.create_invitation('HASH4','Di',null,null,111)" >/dev/null
q "select public.submit_testimonial('HASH4','Di','x','',null,'s','short',null,null,'v1')" >/dev/null
check "a failed save leaves the invitation unused" "$(q "select public.check_invitation('HASH4')->>'state'")" "valid"

TID=$(q "select id from testimonials limit 1")
check "approve works" "$(q "select public.approve_testimonial('$TID',111,null,null)")" "ok"
check "repeated approve does nothing" "$(q "select public.approve_testimonial('$TID',111,null,null)")" "not_pending"
check "an approved testimonial cannot be rejected by accident" "$(q "select public.reject_testimonial('$TID',111)")" "not_pending"
check "only one approval is audited" "$(q "select count(*) from audit_log where action='testimonial_approved'")" "1"

check "anon cannot read testimonials" "$(as_anon "select count(*) from testimonials" | grep -c 'permission denied')" "1"
check "anon cannot read invitations" "$(as_anon "select count(*) from testimonial_invitations" | grep -c 'permission denied')" "1"
check "anon cannot read contact inquiries" "$(as_anon "select count(*) from contact_inquiries" | grep -c 'permission denied')" "1"
check "anon cannot read the audit log" "$(as_anon "select count(*) from audit_log" | grep -c 'permission denied')" "1"
check "anon cannot create invitations" "$(as_anon "select public.create_invitation('x','x',null,null,1)" | grep -c 'permission denied')" "1"
check "anon cannot approve" "$(as_anon "select public.approve_testimonial('$TID',1,null,null)" | grep -c 'permission denied')" "1"
check "anon cannot insert contact inquiries directly" "$(as_anon "insert into contact_inquiries(name,email,message) values ('a','a@b.co','x')" | grep -c 'permission denied')" "1"
check "anon sees the approved testimonial through the view" "$(as_anon "select count(*) from public_testimonials" | tail -1)" "1"
check "the view hides private columns" "$(as_anon "select consent_version from public_testimonials" | grep -c 'does not exist')" "1"

q "select public.create_invitation('HASH5','Ed',null,null,111)" >/dev/null
q "select public.submit_testimonial('HASH5','Ed','CTO','',null,'s','twenty chars at least ok',null,null,'v1')" >/dev/null
check "a pending testimonial is not public" "$(as_anon "select count(*) from public_testimonials" | tail -1)" "1"
T5=$(q "select id from testimonials where full_name='Ed'")
q "select public.reject_testimonial('$T5',111)" >/dev/null
check "a rejected testimonial is not public" "$(as_anon "select count(*) from public_testimonials" | tail -1)" "1"

R=""; for i in 1 2 3 4 5 6; do R="$R$(q "select public.rate_limit_hit('k',3600,5)")"; done
check "rate limit allows 5 then blocks" "$R" "tttttf"
check "buckets exist, private one is not public" "$(q "select string_agg(id||':'||public::text, ',' order by id) from storage.buckets")" "testimonial-private:false,testimonial-public:true"
echo "passed=$pass failed=$fail"
