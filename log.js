export const doses = [
  { id: "morning", name: "Morning tablet", time: "8:00 AM", slot: "Morning" },
  { id: "afternoon", name: "Afternoon capsule", time: "1:00 PM", slot: "Afternoon" },
  { id: "evening", name: "Evening tablet", time: "8:00 PM", slot: "Evening" },
];

export const labels = {
  pending: "To log",
  taken: "Taken",
  skipped: "Skipped",
};

const sources = new Set(["tap", "manual", "sample"]);

export function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function makeEvent({ id, dose, status, source, note = "" }, now = new Date()) {
  return {
    id,
    dose,
    status,
    source,
    note: note.trim().slice(0, 140),
    day: dayKey(now),
    at: now.toISOString(),
  };
}

export function readEvent(value) {
  try {
    const event = JSON.parse(value);
    if (
      typeof event?.id === "string" &&
      doses.some((dose) => dose.id === event.dose) &&
      typeof event.status === "string" &&
      Object.hasOwn(labels, event.status) &&
      sources.has(event.source) &&
      typeof event.note === "string" &&
      event.note.length <= 140 &&
      typeof event.day === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(event.day) &&
      typeof event.at === "string" &&
      Number.isFinite(Date.parse(event.at))
    ) {
      return event;
    }
  } catch {
    // Skip an entry if its saved JSON is damaged.
  }
  return null;
}

export function buildLog(events, day) {
  const byDay = new Map();
  const sorted = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
  const history = sorted.map((event) => {
    const key = `${event.day}/${event.dose}`;
    const previous = byDay.get(key) || "pending";
    byDay.set(key, event.status);
    return { ...event, previous };
  });

  const today = doses.map((dose) => ({
    ...dose,
    status: byDay.get(`${day}/${dose.id}`) || "pending",
  }));
  return { today, history: history.reverse() };
}

export function tapDose(hash) {
  const tap = new URLSearchParams(hash.replace(/^#/, "")).get("tap");
  return doses.find((dose) => dose.id === tap) || null;
}
