"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(
  __dirname,
  "..",
  "public",
  "js",
  "medication",
  "medication-schedule.js"
);
const moduleUrl = `data:text/javascript;base64,${fs.readFileSync(modulePath).toString("base64")}`;

async function scheduleModule() {
  return import(moduleUrl);
}

describe("medication schedule", () => {
  it("parses common prescription frequencies into schedule times", async () => {
    const { parseMedicationSchedule } = await scheduleModule();
    const schedules = parseMedicationSchedule([
      { medication_name: "A", frequency: "OD", timing: "morning" },
      { medication_name: "B", frequency: "BD", timing: "" },
      { medication_name: "C", frequency: "every 6 hours", timing: "" }
    ]);

    assert.deepEqual(schedules[0].schedule.times, [
      { time: "08:00", label: "Morning (Breakfast)" }
    ]);
    assert.equal(schedules[1].schedule.times.length, 2);
    assert.deepEqual(
      schedules[2].schedule.times.map((slot) => slot.time),
      ["08:00", "14:00", "20:00"]
    );
  });

  it("builds calendar recurrence data and ICS content", async () => {
    const { createCalendarEvent, generateICS, parseDuration } = await scheduleModule();
    const schedule = {
      medication: "Amoxicillin",
      strength: "500 mg",
      dose: "1 capsule",
      frequency: "TID",
      duration: "3 days"
    };
    const event = createCalendarEvent(
      schedule,
      { time: "08:00", label: "Morning" },
      new Date("2026-01-01T00:00:00Z"),
      parseDuration(schedule.duration)
    );

    assert.equal(event.summary, "💊 Amoxicillin");
    assert.deepEqual(event.recurrence, ["RRULE:FREQ=DAILY;UNTIL=20260104T000000Z"]);

    const ics = generateICS([
      {
        start: new Date("2026-01-01T08:00:00Z"),
        end: new Date("2026-01-01T08:15:00Z"),
        summary: "Amoxicillin",
        description: "Take one capsule",
        rrule: "FREQ=DAILY;COUNT=3"
      }
    ]);

    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /RRULE:FREQ=DAILY;COUNT=3/);
  });
});
