import type { BookingSummary } from "@/types/bookings";

const FETCH_BUFFER_DAYS = 1;

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function addLocalDays(value: Date, days: number) {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKeyFromFormatter(date: Date, timeZone?: string | null) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone ?? undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (!year || !month || !day) {
      return null;
    }
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

function getCollisionLaneKey(booking: BookingSummary) {
  return (
    normalizeOptionalString(booking.resource_id) ??
    normalizeOptionalString(booking.bookable_item_id) ??
    normalizeOptionalString(booking.workflow_id) ??
    "default"
  );
}

function getBookingBounds(booking: BookingSummary) {
  if (!booking.start_at || !booking.end_at) {
    return null;
  }
  const start = new Date(booking.start_at);
  const end = new Date(booking.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime()) {
    return null;
  }
  return { start, end };
}

export function getBookingScheduleDateKey(booking: BookingSummary) {
  if (!booking.start_at) {
    return null;
  }
  const start = new Date(booking.start_at);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const timeZone = normalizeOptionalString(booking.appointment_timezone);
  return (
    getDateKeyFromFormatter(start, timeZone) ??
    getDateKeyFromFormatter(start) ??
    null
  );
}

export function buildBufferedScheduleRange(
  anchorDate: string,
  days: number,
  bufferDays = FETCH_BUFFER_DAYS
) {
  const start = new Date(`${anchorDate}T00:00:00`);
  const bufferedStart = addLocalDays(start, bufferDays * -1);
  const bufferedEnd = addLocalDays(start, days + bufferDays);

  return {
    rangeStart: bufferedStart.toISOString(),
    rangeEnd: bufferedEnd.toISOString(),
  };
}

export function filterBookingsForScheduleWindow(params: {
  entries: BookingSummary[];
  anchorDate: string;
  days: number;
}) {
  const start = params.anchorDate;
  const end = toLocalIsoDate(
    addLocalDays(new Date(`${params.anchorDate}T00:00:00`), params.days - 1)
  );

  return params.entries.filter((booking) => {
    const dateKey = getBookingScheduleDateKey(booking);
    if (!dateKey) {
      return false;
    }
    return dateKey >= start && dateKey <= end;
  });
}

export function collectScheduleTimezones(entries: BookingSummary[]) {
  return Array.from(
    new Set(
      entries
        .map((entry) => normalizeOptionalString(entry.appointment_timezone))
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));
}

export function buildBookingCollisionMap(entries: BookingSummary[]) {
  const grouped = new Map<string, BookingSummary[]>();

  entries.forEach((booking) => {
    const dateKey = getBookingScheduleDateKey(booking);
    if (!dateKey || !getBookingBounds(booking)) {
      return;
    }
    const groupKey = `${dateKey}::${getCollisionLaneKey(booking)}`;
    const current = grouped.get(groupKey) ?? [];
    current.push(booking);
    grouped.set(groupKey, current);
  });

  const collisions = new Map<string, Set<string>>();

  grouped.forEach((laneEntries) => {
    const sorted = [...laneEntries].sort((left, right) => {
      const leftStart = new Date(left.start_at as string).getTime();
      const rightStart = new Date(right.start_at as string).getTime();
      return leftStart - rightStart;
    });

    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      const currentBounds = getBookingBounds(current);
      if (!currentBounds) {
        continue;
      }

      for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
        const candidate = sorted[nextIndex];
        const candidateBounds = getBookingBounds(candidate);
        if (!candidateBounds) {
          continue;
        }
        if (candidateBounds.start.getTime() >= currentBounds.end.getTime()) {
          break;
        }
        if (candidateBounds.end.getTime() <= currentBounds.start.getTime()) {
          continue;
        }

        const currentSet = collisions.get(current.id) ?? new Set<string>();
        currentSet.add(candidate.id);
        collisions.set(current.id, currentSet);

        const candidateSet = collisions.get(candidate.id) ?? new Set<string>();
        candidateSet.add(current.id);
        collisions.set(candidate.id, candidateSet);
      }
    }
  });

  return collisions;
}
