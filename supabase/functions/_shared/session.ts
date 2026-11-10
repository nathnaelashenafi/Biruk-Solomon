import { sb } from "./db.ts";

const SESSION_MAX_MS = 15 * 60 * 1000;

export async function getSession(admin: number) {
  const { data } = await sb.from("bot_sessions").select("*").eq("telegram_user_id", admin).maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.updated_at).getTime() > SESSION_MAX_MS) {
    await clearSession(admin);
    return null;
  }
  return data;
}
export const setSession = (admin: number, step: string, data: unknown) =>
  sb.from("bot_sessions").upsert({ telegram_user_id: admin, step, data, updated_at: new Date().toISOString() });
export const clearSession = (admin: number) => sb.from("bot_sessions").delete().eq("telegram_user_id", admin);
