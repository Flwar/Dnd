import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileAvatarPicker, profileAvatarKeys } from "@/components/profile/ProfileAvatarPicker";

const customKey = "custom:1b26a8d4-736f-47c8-8f8d-cfca3762e92f/4b83adf0-e228-4650-9f90-caa77385f308.webp";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("תמונת פרופיל אישית", () => {
  it("מעלה תמונה אישית ובוחר אותה לפרופיל", async () => {
    const onSelect = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      portraitKey: customKey,
      portraitUrl: "https://example.supabase.co/storage/avatar.webp",
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:https://example.test/avatar") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    render(<ProfileAvatarPicker selected={profileAvatarKeys[0]} onSelect={onSelect} />);

    await userEvent.upload(
      screen.getByTestId("profile-avatar-upload-input"),
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "avatar.png", { type: "image/png" }),
    );

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(
      customKey,
      "https://example.supabase.co/storage/avatar.webp",
    ));
    expect(fetchMock).toHaveBeenCalledWith("/api/character-portraits", expect.objectContaining({ method: "POST" }));
  });

  it("מסביר בעברית כאשר קובץ המקור גדול מ־12 מגה־בייט", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileAvatarPicker selected={profileAvatarKeys[0]} onSelect={vi.fn()} />);

    const tooLarge = new File(
      [new Uint8Array(12 * 1024 * 1024 + 1)],
      "huge.jpg",
      { type: "image/jpeg" },
    );
    await userEvent.upload(screen.getByTestId("profile-avatar-upload-input"), tooLarge);

    expect(screen.getByTestId("profile-avatar-upload-error")).toHaveTextContent("12 מגה־בייט");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("נועל בחירות מתחרות ומדווח להורה בזמן העלאה", async () => {
    let finishUpload: ((response: Response) => void) | undefined;
    const pendingUpload = new Promise<Response>((resolve) => { finishUpload = resolve; });
    vi.stubGlobal("fetch", vi.fn(() => pendingUpload));
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:https://example.test/avatar") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const onBusyChange = vi.fn();
    render(<ProfileAvatarPicker selected={profileAvatarKeys[0]} onSelect={vi.fn()} onBusyChange={onBusyChange} />);

    await userEvent.upload(
      screen.getByTestId("profile-avatar-upload-input"),
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "avatar.png", { type: "image/png" }),
    );

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    expect(screen.getByRole("button", { name: "בחירת דיוקן מובנה 1 לפרופיל" })).toBeDisabled();

    finishUpload?.(new Response(JSON.stringify({
      portraitKey: customKey,
      portraitUrl: "https://example.supabase.co/storage/avatar.webp",
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
  });
});
