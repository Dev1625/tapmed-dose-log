import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLog, dayKey, makeEvent, readEvent, tapDose } from "./log.js";

const morning = new Date(2026, 10, 24, 8, 2);
const afternoon = new Date(2026, 10, 24, 13, 2);
const later = new Date(2026, 10, 24, 13, 20);

test("selects only known dose IDs from package links", () => {
  assert.equal(tapDose("#tap=afternoon").id, "afternoon");
  assert.equal(tapDose("#tap=evening").name, "Evening tablet");
  assert.equal(tapDose("#tap=other"), null);
  assert.equal(tapDose("#about"), null);
});

test("a correction keeps the package entry in the timeline", () => {
  const first = makeEvent({ id: "1", dose: "afternoon", status: "taken", source: "tap" }, afternoon);
  const next = makeEvent({ id: "2", dose: "afternoon", status: "skipped", source: "manual", note: "  Sample correction  " }, later);
  const { today, history } = buildLog([next, first], dayKey(afternoon));

  assert.equal(today[1].status, "skipped");
  assert.deepEqual(history.map((event) => [event.status, event.previous, event.source, event.note]), [
    ["skipped", "taken", "manual", "Sample correction"],
    ["taken", "pending", "tap", ""],
  ]);
});

test("clearing a status creates an event and keeps earlier entries", () => {
  const first = makeEvent({ id: "1", dose: "morning", status: "skipped", source: "manual" }, morning);
  const clear = makeEvent({ id: "2", dose: "morning", status: "pending", source: "manual" }, afternoon);
  const { today, history } = buildLog([first, clear], dayKey(afternoon));

  assert.equal(today[0].status, "pending");
  assert.equal(history[0].previous, "skipped");
  assert.equal(history.length, 2);
});

test("new local days have a fresh schedule and keep the activity history", () => {
  const event = makeEvent({ id: "1", dose: "morning", status: "taken", source: "tap" }, morning);
  const { today, history } = buildLog([event], dayKey(new Date(2026, 10, 25)));

  assert.equal(today[0].status, "pending");
  assert.equal(history[0].day, "2026-11-24");
});

test("saved entries round trip and damaged records are ignored", () => {
  const event = makeEvent({ id: "1", dose: "morning", status: "taken", source: "tap", note: "x".repeat(141) }, morning);
  assert.equal(event.note.length, 140);
  assert.deepEqual(readEvent(JSON.stringify(event)), event);
  assert.equal(readEvent(JSON.stringify({ ...event, status: "unknown" })), null);
  assert.equal(readEvent(JSON.stringify({ ...event, at: "yesterday" })), null);
  assert.equal(readEvent("{ broken"), null);
});
