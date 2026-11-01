import { createClient } from "npm:@supabase/supabase-js@2";

// Service-role client. It bypasses Row-Level Security, so every function that
// uses it must do its own validation and authorization.
export const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const PRIVATE_BUCKET = "testimonial-private";
export const PUBLIC_BUCKET = "testimonial-public";

// Fails closed: if the limiter itself errors, the request is refused.
export async function withinLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const { data, error } = await sb.rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  if (error) {
    console.error("rate_limit_error", error.code);
    return false;
  }
  return data === true;
}
