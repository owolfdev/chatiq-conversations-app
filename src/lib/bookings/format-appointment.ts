function getOrdinalSuffix(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

type AppointmentParts = {
  month: string;
  day: string;
  year: string;
  hour: string;
  minute: string;
  dayPeriod: string;
};

function formatWithTimeZone(date: Date, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const lookup = parts.reduce<Partial<AppointmentParts>>((acc, part) => {
    if (
      part.type === "month" ||
      part.type === "day" ||
      part.type === "year" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "dayPeriod"
    ) {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  if (
    !lookup.month ||
    !lookup.day ||
    !lookup.year ||
    !lookup.hour ||
    !lookup.minute ||
    !lookup.dayPeriod
  ) {
    return null;
  }

  const dayNumber = Number(lookup.day);
  const daySuffix = Number.isFinite(dayNumber)
    ? getOrdinalSuffix(dayNumber)
    : "";
  const time =
    lookup.minute === "00"
      ? `${lookup.hour}${lookup.dayPeriod}`
      : `${lookup.hour}:${lookup.minute}${lookup.dayPeriod}`;

  return `${lookup.month} ${lookup.day}${daySuffix}, ${lookup.year}, ${time}`;
}

export function formatAppointmentDisplay(
  value: unknown,
  timeZone?: string | null
) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (timeZone) {
    try {
      const formatted = formatWithTimeZone(date, timeZone);
      if (formatted) return formatted;
    } catch {
      // Fall back to runtime timezone if timeZone is invalid.
    }
  }

  return formatWithTimeZone(date) ?? null;
}
