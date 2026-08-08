// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GamePanels } from "../../src/components/inventory/GamePanels";
import { migrateSave } from "../../src/game/persistence";
import { makeCharacter, makeSaveV1 } from "../unit/fixtures";

const callbacks = () => ({
  onClose: vi.fn(),
  onEquip: vi.fn(),
  onUnequip: vi.fn(),
  onUse: vi.fn(),
  onDrop: vi.fn(),
  onBuy: vi.fn(),
});

describe("פאנלי המשחק", () => {
  it("מציג בתיק את מצב הנשיאה, הציוד הפעיל ופעולת ההסרה", async () => {
    const user = userEvent.setup();
    const handlers = callbacks();
    const save = migrateSave(makeSaveV1());

    render(<GamePanels panel="inventory" save={save} {...handlers} />);

    expect(screen.getByRole("dialog", { name: "התיק והציוד" })).toBeInTheDocument();
    expect(screen.getByText("ציוד פעיל")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /חרב ברזל מאוזנת.*מצויד/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "הסרת הציוד" }));
    expect(handlers.onUnequip).toHaveBeenCalledWith("weapon");
  });

  it("מציג בדף הדמות את הזהות, החיים, המשאב והתכונות", () => {
    const handlers = callbacks();
    const save = migrateSave(makeSaveV1());

    render(<GamePanels panel="character" save={save} {...handlers} />);

    expect(screen.getByRole("heading", { name: "נעמה" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /חיים/ })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /סיבולת/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "תכונות" })).toBeInTheDocument();
    expect(screen.getByText("חרב ברזל מאוזנת")).toBeInTheDocument();
  });

  it("מציג את האטלס האינטראקטיבי במקום גלריית מיקומים", () => {
    const handlers = callbacks();
    const save = migrateSave(makeSaveV1());

    render(<GamePanels panel="map" save={save} {...handlers} />);

    expect(screen.getByRole("dialog", { name: "מפת ערפלון" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "הדרכים שמתחת לערפל" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "שכבות האטלס" })).toBeInTheDocument();
    expect(screen.getByTestId("atlas-fog")).toBeInTheDocument();
  });

  it("משמר את פעולת הרכישה ומסביר כשאין מספיק זהב", async () => {
    const user = userEvent.setup();
    const handlers = callbacks();
    const save = migrateSave(makeSaveV1({ character: makeCharacter({ gold: 20 }) }));

    render(<GamePanels panel="merchant" save={save} {...handlers} />);

    await user.click(screen.getByRole("button", { name: /רכישה · 15/ }));
    expect(handlers.onBuy).toHaveBeenCalledWith("minor-healing-potion");
    expect(screen.getByText("חסרים 16 זהב")).toBeInTheDocument();
  });
});
