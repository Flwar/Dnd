// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartyRoomPanel } from "@/components/party/PartyRoomPanel";
import type { PartyLobbySnapshot } from "@/lib/party/types";

const CHARACTER_ID = "10000000-0000-4000-8000-000000000001";

function activeSessionSnapshot(): PartyLobbySnapshot {
  return {
    party: {
      id: "30000000-0000-4000-8000-000000000003",
      name: "שומרי ערפלון",
      roomCode: "ABC123",
      leaderCharacterId: CHARACTER_ID,
      status: "active",
      maximumMembers: 4,
      updatedAt: "2026-08-07T18:00:00.000Z",
    },
    members: [
      {
        characterId: CHARACTER_ID,
        displayName: "המלך",
        characterName: "ארדן",
        portraitKey: "portrait-human-01",
        classId: "warrior",
        level: 2,
        currentHealth: 24,
        maximumHealth: 24,
        role: "leader",
        ready: true,
        connectionState: "connected",
        lastSeenAt: "2026-08-07T18:00:00.000Z",
      },
    ],
    session: {
      id: "40000000-0000-4000-8000-000000000004",
      chapterId: "chapter-one-shadows-under-arfelon",
      currentSceneId: "scene-village-leader",
      status: "active",
      version: 8,
    },
  };
}

describe("יציאה מחבורה במהלך מפגש פעיל", () => {
  it("משאיר את פעולת היציאה גלויה ומפעיל onLeave רק לאחר אישור", async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();

    render(
      <PartyRoomPanel
        snapshot={activeSessionSnapshot()}
        selectedCharacterId={CHARACTER_ID}
        busyAction={null}
        connectionState="connected"
        onCopyCode={vi.fn()}
        onReady={vi.fn()}
        onStart={vi.fn()}
        onLeave={onLeave}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onTransfer={vi.fn()}
      />,
    );

    const leaveButton = screen.getByTestId("leave-party-button");
    expect(leaveButton).toBeVisible();
    expect(leaveButton).toHaveTextContent("עזיבת המסע המשותף");

    await user.click(leaveButton);

    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("לעזוב את המסע המשותף?");

    await user.click(screen.getByRole("button", { name: "אישור" }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
