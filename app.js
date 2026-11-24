import { buildLog, dayKey, doses, labels, makeEvent, readEvent, tapDose } from "./log.js";

const $ = (id) => document.getElementById(id);
const prefix = `tapmed-dose-log:${location.pathname.replace(/index\.html$/, "")}:v1:`;
const memory = new Map();
const dateText = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeText = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const shortDateText = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const sourceText = { manual: "Manual entry", tap: "Package tap", sample: "Sample entry" };

let storageFailed = false;
let offlineReady = false;
let selected = null;

function readLog() {
  const log = new Map(memory);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const event = readEvent(localStorage.getItem(key));
      if (event) log.set(event.id, event);
    }
  } catch {
    storageFailed = true;
  }
  return [...log.values()];
}

function saveEvent(event) {
  try {
    localStorage.setItem(prefix + event.id, JSON.stringify(event));
  } catch {
    memory.set(event.id, event);
    storageFailed = true;
  }
}

function setStatus() {
  $("connection").textContent = navigator.onLine ? "Online" : "Offline";
  $("connection").dataset.online = String(navigator.onLine);
  $("storage-status").textContent = storageFailed
    ? "Browser storage unavailable. Some entries last until reload."
    : offlineReady ? "Offline ready · saved on this device" : "Saved on this device";
}

function drawDose(dose) {
  const row = $("dose-template").content.firstElementChild.cloneNode(true);
  row.dataset.status = dose.status;
  row.querySelector("h3").textContent = dose.name;
  row.querySelector(".dose-time").textContent = dose.time;
  row.querySelector(".pill").textContent = labels[dose.status];

  const button = row.querySelector("button");
  const action = dose.status === "pending" ? "Log dose" : "Correct";
  button.textContent = action;
  button.dataset.dose = dose.id;
  button.setAttribute("aria-label", `${action} for ${dose.name.toLowerCase()}`);
  button.addEventListener("click", () => openEntry(dose, "manual"));
  return row;
}

function drawEvent(event, today) {
  const row = $("event-template").content.firstElementChild.cloneNode(true);
  const dose = doses.find(({ id }) => id === event.dose);
  const date = new Date(event.at);
  const time = row.querySelector("time");
  time.dateTime = event.at;
  time.textContent = event.day === today ? timeText.format(date) : `${shortDateText.format(date)}, ${timeText.format(date)}`;
  row.dataset.status = event.status;
  row.querySelector("h3").textContent = dose.name;

  const change = event.previous === "pending"
    ? labels[event.status]
    : `${labels[event.previous]} → ${labels[event.status]}`;
  row.querySelector(".event-detail").textContent = `${change} · ${sourceText[event.source]}`;
  if (event.note) {
    const note = row.querySelector(".event-note");
    note.hidden = false;
    note.textContent = event.note;
  }
  return row;
}

function render() {
  const now = new Date();
  const day = dayKey(now);
  const { today, history } = buildLog(readLog(), day);
  const count = today.filter(({ status }) => status === "taken").length;
  $("date").textContent = dateText.format(now);
  $("count").textContent = `${count} of ${today.length} marked taken`;
  $("progress").value = count;
  $("doses").replaceChildren(...today.map(drawDose));
  $("events").replaceChildren(...history.map((event) => drawEvent(event, day)));
  $("empty").hidden = history.length > 0;
  setStatus();
}

function openEntry(dose, source) {
  const { today } = buildLog(readLog(), dayKey());
  const current = today.find(({ id }) => id === dose.id);
  const correcting = current.status !== "pending";
  selected = { dose: current.id, source };
  $("entry-source").textContent = sourceText[source];
  $("entry-title").textContent = current.name;
  $("entry-detail").textContent = correcting
    ? `Currently marked ${labels[current.status].toLowerCase()}. A correction keeps the original entry in Activity.`
    : `Scheduled for ${current.time}. Choose how to log this dose.`;
  $("note").value = "";
  $("note-label").hidden = !correcting;
  for (const button of $("choices").querySelectorAll("[data-status]")) {
    button.hidden = button.dataset.status === current.status;
  }
  if (!$("entry").open) $("entry").showModal();
}

function openTap() {
  const dose = tapDose(location.hash);
  if (!dose) return;
  history.replaceState(null, "", location.pathname + location.search);
  openEntry(dose, "tap");
}

$("choices").addEventListener("click", (ev) => {
  const button = ev.target.closest("[data-status]");
  if (!selected || !button) return;

  const now = new Date();
  const { today } = buildLog(readLog(), dayKey(now));
  const dose = today.find(({ id }) => id === selected.dose);
  const status = button.dataset.status;
  const { source } = selected;
  if (dose.status !== status) {
    saveEvent(makeEvent({
      ...selected, status, id: crypto.randomUUID(), note: $("note").value,
    }, now));
  }
  $("entry").close();
  render();
  $("announcement").textContent = `${dose.name}. ${labels[status]}.`;
  const focus = source === "tap" ? $("tap-button") : $("doses").querySelector(`[data-dose="${dose.id}"]`);
  focus.focus();
});

$("close-entry").addEventListener("click", () => $("entry").close());
$("entry").addEventListener("close", () => { selected = null; });
window.addEventListener("hashchange", openTap);
window.addEventListener("online", setStatus);
window.addEventListener("offline", setStatus);
window.addEventListener("storage", (ev) => {
  if (ev.key === null || ev.key.startsWith(prefix)) render();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

if (readLog().length === 0) {
  const now = new Date();
  const earlier = new Date(now.getTime() - 30 * 60 * 1000);
  saveEvent(makeEvent({ id: "sample", dose: "morning", status: "taken", source: "sample" },
    dayKey(earlier) === dayKey(now) ? earlier : now));
}

render();
openTap();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => { offlineReady = true; setStatus(); })
    .catch(() => setStatus());
}
