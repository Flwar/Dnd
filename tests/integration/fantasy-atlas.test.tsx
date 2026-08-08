// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FantasyAtlas } from "@/components/map/FantasyAtlas";
import { migrateSave } from "@/game/persistence";
import { makeSaveV1 } from "../unit/fixtures";

function makeAtlasSave() {
  const save = migrateSave(makeSaveV1());
  return {
    ...save,
    discoveredLocationIds: [
      "village-gate",
      "arfelon-square",
      "old-watchtower",
      "main-tunnel",
      "flooded-passage",
    ],
    story: {
      ...save.story,
      currentLocationId: "village-gate",
      visitedLocationIds: ["village-gate", "arfelon-square"],
      flags: {
        ...save.story.flags,
        tower_beacon_disabled: true,
      },
    },
  };
}

describe("אטלס ערפלון", () => {
  it("מציג מיקום נוכחי, נתיב שנחשף, ערפל והשלכה שנוצרה מבחירה", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    const { container } = render(<FantasyAtlas save={makeAtlasSave()} />);

    expect(screen.getByRole("heading", { name: "הדרכים שמתחת לערפל" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "שער הכפר, המיקום הנוכחי" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("atlas-fog")).toBeInTheDocument();
    expect(container.querySelector('[data-route-id="gate-square"]')).toBeInTheDocument();
    expect(screen.getAllByText("אות הכת כובה").length).toBeGreaterThan(0);
    expect(screen.queryByText("החדר הנסתר")).not.toBeInTheDocument();
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
  });

  it("מחליף שכבה בלי לחשוף סודות ומאפשר הגדלה נגישה", async () => {
    const user = userEvent.setup();
    render(<FantasyAtlas save={makeAtlasSave()} />);

    const layerTabs = screen.getByRole("tablist", { name: "שכבות האטלס" });
    await user.click(within(layerTabs).getByRole("tab", { name: /מעמקי המכרה/ }));

    expect(within(layerTabs).getByRole("tab", { name: /מעמקי המכרה/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "המנהרה הראשית, מקום שהתגלה" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "המעבר המוצף, מקום שהתגלה" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /החדר הנסתר/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "הגדלת המפה" }));
    expect(screen.getByText("122%")).toBeInTheDocument();
  });

  it("מעביר שכבות בעזרת חצי המקלדת ב־RTL", async () => {
    const user = userEvent.setup();
    render(<FantasyAtlas save={makeAtlasSave()} />);

    const surfaceTab = screen.getByRole("tab", { name: /פני השטח/ });
    surfaceTab.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: /מעמקי המכרה/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /מעמקי המכרה/ })).toHaveFocus();
  });
});
