import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatTime,
  slugify,
  getInitials,
  formatAgeRange,
  calculateDistance,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats other currencies", () => {
    expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatTime", () => {
  it("formats morning time", () => {
    expect(formatTime("09:30")).toBe("9:30 AM");
  });

  it("formats afternoon time", () => {
    expect(formatTime("14:00")).toBe("2:00 PM");
  });

  it("formats noon", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("formats midnight", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World?")).toBe("hello-world");
  });

  it("handles multiple spaces", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
  });

  it("trims whitespace", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });
});

describe("getInitials", () => {
  it("returns uppercase initials", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
  });

  it("handles lowercase names", () => {
    expect(getInitials("john", "doe")).toBe("JD");
  });
});

describe("formatAgeRange", () => {
  it("formats months only", () => {
    expect(formatAgeRange(6, 11)).toBe("6 mo - 11 mo");
  });

  it("formats years only", () => {
    expect(formatAgeRange(24, 48)).toBe("2 yrs - 4 yrs");
  });

  it("formats mixed", () => {
    expect(formatAgeRange(18, 36)).toBe("1 yr 6 mo - 3 yrs");
  });
});

describe("calculateDistance", () => {
  it("calculates distance between two points", () => {
    // New York to Los Angeles (approx 2451 miles)
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });

  it("returns 0 for same point", () => {
    const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBe(0);
  });
});
