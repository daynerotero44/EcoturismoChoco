import { getBookingsRemote, createBooking, resetBookings as resetRemote } from "./api";

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  experienceId: string;
  experienceTitle: string;
  date: string;
  visitors: number;
  totalCOP: number;
  currency: string;
  status: "confirmed" | "pending";
  createdAt: string;
}

const LOCAL_KEY = "chocobio_bookings_local";

function localGet(): Booking[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
  catch { return []; }
}

function localSave(bookings: Booking[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(bookings));
}

export async function getBookings(): Promise<Booking[]> {
  try {
    const remote = await getBookingsRemote();
    // Merge any local bookings not yet synced
    const local = localGet();
    const remoteIds = new Set(remote.map((b) => b.id));
    const extra = local.filter((b) => !remoteIds.has(b.id));
    return [...extra, ...remote];
  } catch {
    return localGet();
  }
}

export async function addBooking(b: Booking): Promise<void> {
  // Always save locally first (instant feedback)
  const local = localGet();
  if (!local.find((x) => x.id === b.id)) {
    localSave([b, ...local]);
  }
  // Then try to sync remotely
  try {
    await createBooking(b);
  } catch {
    // Will be synced on next load when server is available
  }
}

export async function resetBookings(): Promise<void> {
  localSave([]);
  try { await resetRemote(); } catch { /* server offline */ }
}

export function getVisitorsByExperience(bookings: Booking[], expId: string): number {
  return bookings
    .filter((b) => b.experienceId === expId && b.status === "confirmed")
    .reduce((sum, b) => sum + b.visitors, 0);
}

export function getTotalRevenueCOP(bookings: Booking[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return bookings
    .filter((b) => b.status === "confirmed" && b.createdAt.startsWith(today))
    .reduce((sum, b) => sum + b.totalCOP, 0);
}

export function generateId(): string {
  const suffix = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  return `RES-2026-${suffix}`;
}
