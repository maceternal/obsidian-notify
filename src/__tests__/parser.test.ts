import { describe, it, expect } from "vitest";
import { TaskParser } from "../parser";

describe("TaskParser.extractDate", () => {
  it("extracts date from task text", () => {
    expect(TaskParser.extractDate("📆 2025-01-15")).toBe("2025-01-15");
  });

  it("handles spaces around date emoji", () => {
    expect(TaskParser.extractDate("📆  2025-01-15")).toBe("2025-01-15");
    expect(TaskParser.extractDate("📆2025-01-15")).toBe("2025-01-15");
  });

  it("extracts date from full task text", () => {
    expect(TaskParser.extractDate("- [ ] Team Meeting 📆 2025-01-15 🔔")).toBe(
      "2025-01-15",
    );
  });

  it("handles missing date", () => {
    expect(TaskParser.extractDate("no date here")).toBeNull();
  });

  it("returns date string even if format is invalid (doesn't validate)", () => {
    // Parser extracts but doesn't validate - moment validates later
    expect(TaskParser.extractDate("📆 2025-13-99")).toBe("2025-13-99");
  });
});

describe("TaskParser.extractDateFromFilename", () => {
  it("extracts from simple filename", () => {
    expect(TaskParser.extractDateFromFilename("2026-01-07.md")).toBe(
      "2026-01-07",
    );
  });

  it("extracts from filename with title", () => {
    expect(TaskParser.extractDateFromFilename("2026-01-07 My Notes.md")).toBe(
      "2026-01-07",
    );
  });

  it("extracts from path with directories", () => {
    expect(TaskParser.extractDateFromFilename("Daily/2026-01-07.md")).toBe(
      "2026-01-07",
    );
    expect(
      TaskParser.extractDateFromFilename("Notes/Daily/2026-01-07 Meeting.md"),
    ).toBe("2026-01-07");
  });

  it("handles files without .md extension", () => {
    expect(TaskParser.extractDateFromFilename("2026-01-07")).toBe("2026-01-07");
  });

  it("validates date format with moment", () => {
    // Invalid month
    expect(TaskParser.extractDateFromFilename("2026-13-99.md")).toBeNull();
    // Invalid day
    expect(TaskParser.extractDateFromFilename("2026-01-99.md")).toBeNull();
    // Invalid format
    expect(TaskParser.extractDateFromFilename("01-07-2026.md")).toBeNull();
  });

  it("returns null for no date in filename", () => {
    expect(TaskParser.extractDateFromFilename("My Notes.md")).toBeNull();
    expect(TaskParser.extractDateFromFilename("Meeting Notes.md")).toBeNull();
  });

  it("returns null for partial dates", () => {
    expect(TaskParser.extractDateFromFilename("2026-01.md")).toBeNull();
    expect(TaskParser.extractDateFromFilename("2026.md")).toBeNull();
  });
});

describe("TaskParser.extractRepeatInterval", () => {
  it("extracts day", () => {
    expect(TaskParser.extractRepeatInterval("🔁 day")).toBe("day");
  });

  it("extracts week", () => {
    expect(TaskParser.extractRepeatInterval("🔁 week")).toBe("week");
  });

  it("extracts month", () => {
    expect(TaskParser.extractRepeatInterval("🔁 month")).toBe("month");
  });

  it("extracts year", () => {
    expect(TaskParser.extractRepeatInterval("🔁 year")).toBe("year");
  });

  it("handles spaces around repeat emoji", () => {
    expect(TaskParser.extractRepeatInterval("🔁  week")).toBe("week");
    expect(TaskParser.extractRepeatInterval("🔁week")).toBe("week");
  });

  it("extracts from full task text", () => {
    expect(
      TaskParser.extractRepeatInterval(
        "- [ ] Weekly Meeting 📆 2025-01-15 🔁 week",
      ),
    ).toBe("week");
  });

  it("returns null for no repeat interval", () => {
    expect(TaskParser.extractRepeatInterval("no repeat here")).toBeNull();
  });

  it("returns null for invalid interval", () => {
    expect(TaskParser.extractRepeatInterval("🔁 invalid")).toBeNull();
  });
});

describe("TaskParser.extractReminderOffsets", () => {
  it("extracts single reminder", () => {
    expect(TaskParser.extractReminderOffsets("1️⃣ week")).toEqual([
      { number: 1, unit: "week" },
    ]);
  });

  it("extracts multiple reminders", () => {
    expect(TaskParser.extractReminderOffsets("1️⃣ week 2️⃣ day")).toEqual([
      { number: 1, unit: "week" },
      { number: 2, unit: "day" },
    ]);
  });

  it("handles reminders in any order", () => {
    const result = TaskParser.extractReminderOffsets("3️⃣ day 1️⃣ week");
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ number: 3, unit: "day" });
    expect(result).toContainEqual({ number: 1, unit: "week" });
  });

  it("supports all units", () => {
    expect(TaskParser.extractReminderOffsets("1️⃣ day")).toEqual([
      { number: 1, unit: "day" },
    ]);
    expect(TaskParser.extractReminderOffsets("2️⃣ week")).toEqual([
      { number: 2, unit: "week" },
    ]);
    expect(TaskParser.extractReminderOffsets("3️⃣ month")).toEqual([
      { number: 3, unit: "month" },
    ]);
    expect(TaskParser.extractReminderOffsets("4️⃣ year")).toEqual([
      { number: 4, unit: "year" },
    ]);
  });

  it("handles numbers 1-9", () => {
    expect(TaskParser.extractReminderOffsets("9️⃣ day")).toEqual([
      { number: 9, unit: "day" },
    ]);
  });

  it("handles no reminders", () => {
    expect(TaskParser.extractReminderOffsets("no reminders")).toEqual([]);
  });

  it("extracts from full task text", () => {
    const result = TaskParser.extractReminderOffsets(
      "- [ ] Big Event 📆 2025-02-01 1️⃣ week 1️⃣ day 🔔",
    );
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ number: 1, unit: "week" });
    expect(result).toContainEqual({ number: 1, unit: "day" });
  });
});

describe("TaskParser.extractTitle", () => {
  it("extracts title before date marker", () => {
    expect(TaskParser.extractTitle("- [ ] Team Meeting 📆 2025-01-15")).toBe(
      "Team Meeting",
    );
  });

  it("handles various checkbox formats", () => {
    expect(TaskParser.extractTitle("- [x] Done Task 📆 2025-01-15")).toBe(
      "Done Task",
    );
    expect(TaskParser.extractTitle("* [ ] Bullet Task 📆 2025-01-15")).toBe(
      "Bullet Task",
    );
    expect(TaskParser.extractTitle("- [-] Progress Task 📆 2025-01-15")).toBe(
      "Progress Task",
    );
  });

  it("trims whitespace", () => {
    expect(
      TaskParser.extractTitle("- [ ]   Spaced Title   📆 2025-01-15"),
    ).toBe("Spaced Title");
  });

  it("handles title with no checkbox", () => {
    expect(TaskParser.extractTitle("Simple Task 📆 2025-01-15")).toBe(
      "Simple Task",
    );
  });

  it("handles empty title", () => {
    expect(TaskParser.extractTitle("- [ ] 📆 2025-01-15")).toBe("");
  });

  it("includes everything before date marker", () => {
    expect(
      TaskParser.extractTitle("- [ ] Meeting with @person #tag 📆 2025-01-15"),
    ).toBe("Meeting with @person #tag");
  });
});

describe("TaskParser.extractBlockId", () => {
  it("extracts block ID from end of line", () => {
    expect(TaskParser.extractBlockId("task text ^abc123")).toBe("abc123");
  });

  it("handles alphanumeric block IDs", () => {
    expect(TaskParser.extractBlockId("task ^abc123def")).toBe("abc123def");
    expect(TaskParser.extractBlockId("task ^123456")).toBe("123456");
  });

  it("handles block IDs with hyphens", () => {
    expect(TaskParser.extractBlockId("task ^my-block-id")).toBe("my-block-id");
  });

  it("handles trailing whitespace", () => {
    expect(TaskParser.extractBlockId("task ^abc123  ")).toBe("abc123");
    expect(TaskParser.extractBlockId("task ^abc123\n")).toBe("abc123");
  });

  it("returns null for no block ID", () => {
    expect(TaskParser.extractBlockId("task text")).toBeNull();
    expect(TaskParser.extractBlockId("task text ^")).toBeNull();
  });

  it("only matches at end of line", () => {
    expect(TaskParser.extractBlockId("^abc123 task text")).toBeNull();
    expect(TaskParser.extractBlockId("task ^abc123 more text")).toBeNull();
  });
});

describe("TaskParser.generateBlockId", () => {
  it("generates 6-character ID", () => {
    const id = TaskParser.generateBlockId();
    expect(id).toHaveLength(6);
  });

  it("generates alphanumeric lowercase ID", () => {
    const id = TaskParser.generateBlockId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(TaskParser.generateBlockId());
    }
    // Should have 100 unique IDs (probabilistically)
    expect(ids.size).toBe(100);
  });
});
