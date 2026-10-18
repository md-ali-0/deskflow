import { describe, expect, it } from "vitest";
import { canResolve, isTransitionAllowed } from "../src/lib/ticket-rules";
import { calculateDueAt } from "../src/services/sla.service";

describe("calculateDueAt", () => {
  it("adds the category SLA to the creation time", () => {
    const created = new Date("2026-10-18T09:00:00.000Z");

    expect(calculateDueAt(created, 4).toISOString()).toBe(
      "2026-10-18T13:00:00.000Z",
    );
    expect(calculateDueAt(created, 72).toISOString()).toBe(
      "2026-10-21T09:00:00.000Z",
    );
  });

  it("does not mutate the date it was given", () => {
    const created = new Date("2026-10-18T09:00:00.000Z");
    const before = created.getTime();

    calculateDueAt(created, 12);

    expect(created.getTime()).toBe(before);
  });

  it("returns the same moment for a zero-hour SLA", () => {
    const created = new Date("2026-10-18T09:00:00.000Z");

    expect(calculateDueAt(created, 0).getTime()).toBe(created.getTime());
  });

  it("crosses a month boundary correctly", () => {
    const created = new Date("2026-10-31T20:00:00.000Z");

    expect(calculateDueAt(created, 8).toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
  });
});

describe("isTransitionAllowed", () => {
  const legal: [string, string][] = [
    ["OPEN", "IN_PROGRESS"],
    ["OPEN", "CLOSED"],
    ["IN_PROGRESS", "RESOLVED"],
    ["IN_PROGRESS", "OPEN"],
    ["RESOLVED", "CLOSED"],
    ["RESOLVED", "IN_PROGRESS"],
  ];

  it.each(legal)("allows %s -> %s", (from, to) => {
    expect(isTransitionAllowed(from, to)).toBe(true);
  });

  const illegal: [string, string][] = [
    ["OPEN", "RESOLVED"],
    ["OPEN", "OPEN"],
    ["IN_PROGRESS", "CLOSED"],
    ["RESOLVED", "OPEN"],
    ["CLOSED", "OPEN"],
    ["CLOSED", "IN_PROGRESS"],
    ["CLOSED", "RESOLVED"],
    ["CLOSED", "CLOSED"],
  ];

  it.each(illegal)("rejects %s -> %s", (from, to) => {
    expect(isTransitionAllowed(from, to)).toBe(false);
  });

  it("treats CLOSED as terminal", () => {
    for (const target of ["OPEN", "IN_PROGRESS", "RESOLVED"]) {
      expect(isTransitionAllowed("CLOSED", target)).toBe(false);
    }
  });

  it("rejects anything from an unknown status", () => {
    expect(isTransitionAllowed("ARCHIVED", "OPEN")).toBe(false);
  });
});

describe("canResolve", () => {
  it("blocks resolving when nobody has replied publicly", () => {
    expect(canResolve(0)).toBe(false);
  });

  it("allows resolving once there is at least one public reply", () => {
    expect(canResolve(1)).toBe(true);
    expect(canResolve(7)).toBe(true);
  });
});
