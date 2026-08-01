// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReleaseNotesPanel } from "@/components/menu/ReleaseNotesPanel";
import { currentRelease } from "@/content/releases";

describe("פתקי גרסה", () => {
  it("מציג מספר גרסה וכל עדכון בעברית", () => {
    render(<ReleaseNotesPanel />);

    expect(screen.getByText(currentRelease.version)).toHaveClass("ltr-isolate");
    expect(screen.getByRole("heading", { name: currentRelease.title })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "שינויים בגרסה הנוכחית" })).toBeInTheDocument();

    for (const note of currentRelease.notes) {
      expect(screen.getByRole("heading", { name: note.title })).toBeInTheDocument();
      expect(screen.getByText(note.description)).toBeInTheDocument();
    }
  });
});
