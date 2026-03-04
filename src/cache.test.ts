import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache } from "./cache.js";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new TtlCache();
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("expires entries after default TTL", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "value");

    vi.advanceTimersByTime(999);
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(2);
    expect(cache.get("key")).toBeUndefined();
  });

  it("supports custom TTL per entry", () => {
    const cache = new TtlCache(10_000);
    cache.set("short", "val", 500);
    cache.set("long", "val", 5000);

    vi.advanceTimersByTime(600);
    expect(cache.get("short")).toBeUndefined();
    expect(cache.get("long")).toBe("val");
  });

  it("invalidates keys matching pattern", () => {
    const cache = new TtlCache();
    cache.set("offer:abc123", "a");
    cache.set("offer:abc123:price", "p");
    cache.set("order:xyz789", "o");

    cache.invalidate("offer:abc123");

    expect(cache.get("offer:abc123")).toBeUndefined();
    expect(cache.get("offer:abc123:price")).toBeUndefined();
    expect(cache.get("order:xyz789")).toBe("o");
  });

  it("clears all entries", () => {
    const cache = new TtlCache();
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("tracks size correctly", () => {
    const cache = new TtlCache();
    expect(cache.size).toBe(0);

    cache.set("a", 1);
    expect(cache.size).toBe(1);

    cache.set("b", 2);
    expect(cache.size).toBe(2);

    cache.set("a", 3); // overwrite
    expect(cache.size).toBe(2);
  });

  it("removes expired entry on get and updates size", () => {
    const cache = new TtlCache(100);
    cache.set("key", "val");
    expect(cache.size).toBe(1);

    vi.advanceTimersByTime(101);
    expect(cache.get("key")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("stores complex objects", () => {
    const cache = new TtlCache();
    const obj = { orders: [{ orderId: "123" }], total: 1 };
    cache.set("key", obj);
    expect(cache.get("key")).toEqual(obj);
  });
});
