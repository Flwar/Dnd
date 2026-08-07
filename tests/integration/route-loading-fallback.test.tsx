// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteLoadingFallback } from "../../src/components/shell/RouteLoadingFallback";

describe("recoverable route loading fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("starts with the short atmospheric loading message", () => {
    render(<RouteLoadingFallback />);

    expect(screen.getByText("הערפל מתפזר…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "טעינה מחדש" })).not.toBeInTheDocument();
  });

  it("offers an accessible recovery action after six seconds", async () => {
    render(<RouteLoadingFallback />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    expect(screen.getByText("הטעינה מתארכת מהרגיל")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "טעינה מחדש" })).toBeEnabled();
    expect(screen.getByText(/בלי לפגוע בהתקדמות השמורה/)).toBeInTheDocument();
  });
});
