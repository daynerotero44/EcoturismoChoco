import { projectId, publicAnonKey } from "../utils/supabase/info";

const BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2c9ecdd`;

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Users ──────────────────────────────────────────────────────────────────────
export const getUsers = () => req<any[]>("GET", "/users");
export const createUser = (user: unknown) => req<{ ok: boolean }>("POST", "/users", user);
export const resetUsers = () => req<{ ok: boolean }>("DELETE", "/users");

// ── Bookings ───────────────────────────────────────────────────────────────────
export const getBookingsRemote = () => req<any[]>("GET", "/bookings");
export const createBooking = (booking: unknown) => req<{ ok: boolean }>("POST", "/bookings", booking);
export const resetBookings = () => req<{ ok: boolean }>("DELETE", "/bookings");
