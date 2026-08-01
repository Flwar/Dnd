// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameModeShell } from "../../src/components/game/GameModeShell";

describe("מצבי המשחק הבלעדיים", () => {
  it("מסיר את מסך החקירה ואת השכבות שלו בזמן קרב", () => {
    render(
      <GameModeShell
        combat={<main data-testid="combat-mode">קרב</main>}
        exploration={(
          <>
            <main data-testid="exploration-mode">חקירה</main>
            <aside data-testid="exploration-panel">תיק</aside>
          </>
        )}
        persistent={<div data-testid="persistent-notifications">התראות</div>}
      />,
    );

    expect(screen.getByTestId("combat-mode")).toBeInTheDocument();
    expect(screen.queryByTestId("exploration-mode")).not.toBeInTheDocument();
    expect(screen.queryByTestId("exploration-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("persistent-notifications")).toBeInTheDocument();
  });

  it("מחזיר את החקירה כאשר אין קרב פעיל", () => {
    render(
      <GameModeShell
        combat={null}
        exploration={<main data-testid="exploration-mode">חקירה</main>}
      />,
    );

    expect(screen.getByTestId("exploration-mode")).toBeInTheDocument();
  });
});
