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

  it("offers accessible recovery actions after four seconds", async () => {
    render(<RouteLoadingFallback recoveryHref="/menu" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(screen.getByText("הטעינה מתארכת מהרגיל")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "טעינה מחדש" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "חזרה לתפריט" })).toHaveAttribute("href", "/menu");
    expect(screen.getByText(/בלי לפגוע בהתקדמות השמורה/)).toBeInTheDocument();
  });

  it("shows route-specific copy without delaying the recovery gate", async () => {
    render(<RouteLoadingFallback title="פותחים את ספר המסע…" detail="טוענים שמירה." />);

    expect(screen.getByText("פותחים את ספר המסע…")).toBeInTheDocument();
    expect(screen.getByText("טוענים שמירה.")).toBeInTheDocument();
  });
});
