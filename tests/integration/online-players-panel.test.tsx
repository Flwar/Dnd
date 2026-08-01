// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnlinePlayersPanel } from "@/components/menu/OnlinePlayersPanel";

const mockUseOnlinePresence = vi.fn();

vi.mock("@/components/providers/OnlinePresenceProvider", () => ({
  useOnlinePresence: () => mockUseOnlinePresence(),
}));

describe("רשימת שחקנים מחוברים", () => {
  beforeEach(() => {
    mockUseOnlinePresence.mockReturnValue({
      currentUserId: "user-one",
      status: "connected",
      refresh: vi.fn(),
      players: [
        {
          userId: "user-one",
          displayName: "נעמה",
          avatarKey: "portrait-human-01",
          accountTitle: null,
          isKing: false,
          connectionCount: 2,
          lastSeenAt: "2026-08-01T10:00:00.000Z",
        },
        {
          userId: "user-two",
          displayName: "ארדן",
          avatarKey: "portrait-elf-01",
          accountTitle: "מלך ארצות ואלדר",
          isKing: true,
          connectionCount: 1,
          lastSeenAt: "2026-08-01T10:00:01.000Z",
        },
      ],
    });
  });

  it("מציג ספירה קומפקטית ופותח רשימה נגישה לפי דרישה", async () => {
    const user = userEvent.setup();
    render(<OnlinePlayersPanel />);

    const trigger = screen.getByRole("button", { name: /שחקנים מחוברים/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("נעמה")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list", { name: "רשימת השחקנים המחוברים" })).toBeInTheDocument();
    expect(screen.getByText("נעמה")).toBeInTheDocument();
    expect(screen.getByText("(את/ה)")).toBeInTheDocument();
    expect(screen.getByText("מלך ארצות ואלדר")).toBeInTheDocument();
    expect(screen.getByText("הרפתקן/ית")).toBeInTheDocument();
  });

  it("מציג מצב ניתוק ברור בלי להמציא שחקנים", async () => {
    const user = userEvent.setup();
    mockUseOnlinePresence.mockReturnValue({
      currentUserId: null,
      status: "disconnected",
      refresh: vi.fn(),
      players: [],
    });
    render(<OnlinePlayersPanel />);

    const trigger = screen.getByRole("button", { name: /שחקנים מחוברים/ });
    await user.click(trigger);
    expect(trigger).toHaveTextContent("החיבור נותק");
    expect(screen.getByText("לא ניתן לטעון כעת את רשימת השחקנים.")).toBeInTheDocument();
  });
});
