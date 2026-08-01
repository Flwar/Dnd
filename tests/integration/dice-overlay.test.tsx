// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DiceOverlay } from "../../src/components/game/DiceOverlay";
import { useSettingsStore } from "../../src/store/settings-store";
import type { DicePresentation } from "../../src/store/game-store";
import type { DiceResult } from "../../src/types/game";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  useSettingsStore.setState({ reducedMotion: true });
});

afterEach(() => {
  useSettingsStore.setState({ reducedMotion: false });
});

function presentation(overrides: Partial<DiceResult> = {}): DicePresentation {
  return {
    skillLabel: "תפיסה",
    result: {
      rolls: [17],
      selectedRoll: 17,
      modifier: 4,
      finalResult: 21,
      difficulty: 15,
      mode: "normal",
      outcome: "success",
      seed: 8128,
      ...overrides,
    },
  };
}

describe("הצגת גלגול קוביית d20", () => {
  it("מציגה את התוצאה שכבר הוכרעה בלי להפיק מספר חדש בצד הלקוח", () => {
    render(<DiceOverlay presentation={presentation()} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "בדיקת מיומנות" });
    expect(dialog).toHaveTextContent("תפיסה");
    expect(dialog).toHaveTextContent("הצלחה");
    expect(dialog).toHaveTextContent("תוצאה סופית: 21");
    expect(dialog).toHaveTextContent("דרגת קושי15");
    expect(screen.getByRole("img", { name: "קוביית עשרים פאות. התוצאה היא 17" })).toBeInTheDocument();
    expect(screen.getByTestId("dice-stage")).toHaveAttribute("data-dice-count", "1");
    expect(screen.getAllByTestId("d20-face")).toHaveLength(20);
    expect(screen.getByTestId("d20-front-value")).toHaveTextContent("17");
  });

  it("מבדילה בין יתרון לחיסרון ומציגה את שתי ההטלות", () => {
    const { rerender } = render(
      <DiceOverlay
        presentation={presentation({ rolls: [7, 18], selectedRoll: 18, finalResult: 22, mode: "advantage" })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId("dice-mode-badge")).toHaveTextContent("יתרון — התוצאה הגבוהה נבחרה");
    expect(screen.getByRole("dialog")).toHaveTextContent("ההטלות: 7 / 18");
    expect(screen.getAllByTestId("d20-model")).toHaveLength(2);
    expect(screen.getAllByTestId("d20-face")).toHaveLength(40);
    expect(screen.getByTestId("dice-stage")).toHaveAttribute("data-dice-count", "2");

    rerender(
      <DiceOverlay
        presentation={presentation({ rolls: [7, 18], selectedRoll: 7, finalResult: 11, mode: "disadvantage", outcome: "failure" })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("dice-mode-badge")).toHaveTextContent("חיסרון — התוצאה הנמוכה נבחרה");
    expect(screen.getByRole("img", { name: "קוביית עשרים פאות. התוצאה היא 7" })).toBeInTheDocument();
  });

  it.each([
    ["critical-success", 20, "הצלחה מכרעת", "20 טבעי"],
    ["critical-failure", 1, "כישלון מכריע", "1 טבעי"],
  ] as const)("מציגה משוב ייחודי עבור %s", (outcome, roll, label, naturalLabel) => {
    render(
      <DiceOverlay
        presentation={presentation({ rolls: [roll], selectedRoll: roll, finalResult: roll, outcome })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(naturalLabel)).toBeInTheDocument();
  });

  it("מכבד הפחתת תנועה ומציג מיד את התוצאה", () => {
    render(<DiceOverlay presentation={presentation()} onClose={vi.fn()} />);

    expect(screen.getByText("המשך")).toBeInTheDocument();
    expect(screen.queryByText("דלג לתוצאה")).not.toBeInTheDocument();
    expect(screen.getByText("המשך").closest("[data-animation-state]")).toHaveAttribute("data-animation-state", "settled");
  });

  it("מאפשר לדלג על האנימציה הארוכה בלי לסגור את תוצאת הבדיקה", async () => {
    useSettingsStore.setState({ reducedMotion: false });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DiceOverlay presentation={presentation()} onClose={onClose} />);

    expect(screen.getByText("דלג לתוצאה")).toBeInTheDocument();
    expect(screen.getByText("הקובייה מתגלגלת…")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent("תוצאה סופית: 21");
    expect(screen.queryByTestId("d20-front-value")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "קוביית עשרים פאות מתגלגלת" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "דלג לתוצאה" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "המשך" })).toBeInTheDocument();
    expect(screen.getByText("הצלחה")).toBeInTheDocument();
    expect(screen.getByTestId("d20-front-value")).toHaveTextContent("17");
  });
});
