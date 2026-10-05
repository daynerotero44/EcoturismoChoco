import { type Booking } from "./bookings";

// 12 fechas disponibles — 4 por experiencia (guardadas en store local)
export const AVAILABLE_DATES: Record<string, string[]> = {
  birds:    ["2026-09-20", "2026-10-03", "2026-10-17", "2026-11-07"],
  hiking:   ["2026-09-26", "2026-10-10", "2026-10-24", "2026-11-14"],
  maritime: ["2026-09-19", "2026-10-02", "2026-10-16", "2026-11-06"],
};

export interface DateAvailability {
  date: string;
  booked: number;
  remaining: number;
  isFull: boolean;
  isPast: boolean;
}

export function getDateAvailability(
  bookings: Booking[],
  experienceId: string,
  date: string,
  maxPax: number
): DateAvailability {
  const today = new Date().toISOString().slice(0, 10);
  const booked = bookings
    .filter((b) => b.experienceId === experienceId && b.date === date && b.status === "confirmed")
    .reduce((sum, b) => sum + b.visitors, 0);
  return {
    date,
    booked,
    remaining: Math.max(0, maxPax - booked),
    isFull: booked >= maxPax,
    isPast: date < today,
  };
}

export function getNextAvailableDate(
  bookings: Booking[],
  experienceId: string,
  maxPax: number
): string | null {
  const today = new Date().toISOString().slice(0, 10);
  return (
    (AVAILABLE_DATES[experienceId] || []).find((date) => {
      if (date < today) return false;
      return !getDateAvailability(bookings, experienceId, date, maxPax).isFull;
    }) ?? null
  );
}

export function hasAvailabilityInRange(
  bookings: Booking[],
  experienceId: string,
  maxPax: number,
  from: string,
  to: string
): boolean {
  return (AVAILABLE_DATES[experienceId] || []).some((date) => {
    if (date < from || date > to) return false;
    return !getDateAvailability(bookings, experienceId, date, maxPax).isFull;
  });
}

export function formatShortDate(iso: string): string {
  // Use noon UTC to avoid timezone shifts
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatFullDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
