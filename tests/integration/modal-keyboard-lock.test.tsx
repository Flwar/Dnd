// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../../src/components/ui/Modal";

describe("נעילת מקלדת בחלון משחק", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("מונע מקיצורי דרך של המסך שמתחת לפעול", () => {
    const windowShortcut = vi.fn();
    const onClose = vi.fn();
    window.addEventListener("keydown", windowShortcut);

    render(
      <Modal open title="בדיקת מיומנות" onClose={onClose} allowClose={false}>
        <button type="button">המשך</button>
      </Modal>,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "1" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(windowShortcut).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    window.removeEventListener("keydown", windowShortcut);
  });

  it("חוסם גלילה אופקית בחלון מלא בטלפון", () => {
    render(
      <Modal open title="דף הדמות" onClose={() => undefined}>
        <div className="w-[80rem]">תוכן רחב במיוחד</div>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("overflow-x-hidden");
  });
});
