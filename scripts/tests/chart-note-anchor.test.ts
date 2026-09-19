import assert from "node:assert/strict";
import test from "node:test";
import { chartNoteAnchor, chartNoteButtonPosition } from "../../lib/chart-note-anchor";

const points = [
  { date: "2026-09-18", timestamp: Date.parse("2026-09-18"), visits: 20, revenue: 0 },
  { date: "2026-09-19", timestamp: Date.parse("2026-09-19"), visits: 0, revenue: 0 },
];

test("line-only and zero-value dates can both anchor notes", () => {
  for (const point of points) {
    assert.equal(chartNoteAnchor(points, point.timestamp)?.date, point.date);
    assert.equal(chartNoteAnchor(points, String(point.timestamp))?.date, point.date);
  }
});

test("the button has a date even before hover, ignoring invalid dates", () => {
  assert.equal(chartNoteAnchor(points, undefined)?.date, "2026-09-19");
  assert.equal(chartNoteAnchor([...points, { date: "invalid", timestamp: NaN }], undefined)?.date, "2026-09-19");
  assert.equal(chartNoteAnchor(points, "invalid")?.date, "2026-09-19");
  assert.equal(chartNoteAnchor([], undefined), undefined);
});

test("note buttons stay on the plot bottom at every date and remain inside its edges", () => {
  const plot = { x: 46, y: 8, width: 600, height: 246 };
  for (const dateX of [46, 120, 400, 646]) {
    const position = chartNoteButtonPosition(plot, dateX);
    assert.equal(position.y, 240);
    assert.ok(position.x >= 60 && position.x <= 632);
  }
  assert.deepEqual(chartNoteButtonPosition(plot, 400), { x: 400, y: 240 });
  assert.deepEqual(chartNoteButtonPosition({ x: 10, y: 10, width: 20, height: 20 }, 10), { x: 20, y: 20 });
});
