import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CharactersError from "@/app/characters/error";

vi.mock("@/lib/audio/audio-manager", () => ({
  audioManager: { play: vi.fn() },
}));

describe("characters error recovery", () => {
  it("explains that cloud data was not deleted and retries on request", () => {
    const reset = vi.fn();

    render(<CharactersError error={new Error("temporary outage")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "לא הצלחנו לטעון את הדמויות" })).toBeVisible();
    expect(screen.getByText(/הדמויות והשמירות שלך לא נמחקו/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "ניסיון נוסף" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "חזרה לתפריט" })).toHaveAttribute("href", "/menu");
  });
});
