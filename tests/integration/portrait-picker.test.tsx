import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortraitPicker } from "../../src/components/character-creation/PortraitPicker";
import { characterRaces } from "../../src/content/races";

const race = characterRaces[0];
const customKey = "custom:1b26a8d4-736f-47c8-8f8d-cfca3762e92f/4b83adf0-e228-4650-9f90-caa77385f308.png";
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectUrl });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectUrl });
});

describe("בחירת דיוקן והעלאה אישית", () => {
  it("מציג חמש אפשרויות מובנות ומונע קובץ מסוג לא נתמך", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PortraitPicker race={race} selected={race.portraitKeys[0]} onSelect={vi.fn()} />);

    expect(screen.getAllByTestId(/^portrait-option-/)).toHaveLength(5);
    await userEvent.click(screen.getByTestId("portrait-mode-upload"));
    fireEvent.change(screen.getByTestId("portrait-upload-input"), {
      target: { files: [new File(["not an image"], "portrait.txt", { type: "text/plain" })] },
    });

    expect(screen.getByTestId("portrait-upload-error")).toHaveTextContent("JPG, PNG או WebP");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("מעלה תמונה תקינה ומעביר את המפתח והכתובת לטיוטה", async () => {
    const onSelect = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      portraitKey: customKey,
      portraitUrl: "https://example.supabase.co/storage/portrait.png",
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:https://example.test/preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    render(<PortraitPicker race={race} selected={race.portraitKeys[0]} onSelect={onSelect} />);

    await userEvent.click(screen.getByTestId("portrait-mode-upload"));
    await userEvent.upload(
      screen.getByTestId("portrait-upload-input"),
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "portrait.png", { type: "image/png" }),
    );

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(
      customKey,
      "https://example.supabase.co/storage/portrait.png",
    ));
    expect(fetchMock).toHaveBeenCalledWith("/api/character-portraits", expect.objectContaining({ method: "POST" }));
  });

  it("מכווץ תמונת מצלמה גדולה לפני שהיא נשלחת לשרת", async () => {
    const onSelect = vi.fn();
    const uploadedFiles: File[] = [];
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      uploadedFiles.push((init?.body as FormData).get("file") as File);
      return Promise.resolve(new Response(JSON.stringify({
        portraitKey: customKey,
        portraitUrl: "https://example.supabase.co/storage/portrait.webp",
      }), { status: 201, headers: { "Content-Type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      width: 4_032,
      height: 3_024,
      close: vi.fn(),
    }));
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:https://example.test/large-preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array(48_000)], { type: type ?? "image/webp" }));
    });
    render(<PortraitPicker race={race} selected={race.portraitKeys[0]} onSelect={onSelect} />);

    await userEvent.click(screen.getByTestId("portrait-mode-upload"));
    const source = new File(
      [new Uint8Array(2 * 1024 * 1024 + 1)],
      "camera.png",
      { type: "image/png" },
    );
    await userEvent.upload(screen.getByTestId("portrait-upload-input"), source);

    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(uploadedFiles[0]).toBeDefined();
    expect(uploadedFiles[0]?.type).toBe("image/webp");
    expect(uploadedFiles[0]?.size).toBeLessThan(source.size);
  });

  it("מסיר תמונה אישית וחוזר לברירת המחדל של הגזע", async () => {
    const onSelect = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PortraitPicker race={race} selected={customKey} selectedPortraitUrl="https://example.supabase.co/storage/portrait.png" onSelect={onSelect} />);

    await userEvent.click(screen.getByTestId("portrait-upload-remove"));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(race.portraitKeys[0], null));
    expect(fetchMock).toHaveBeenCalledWith("/api/character-portraits", expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ portraitKey: customKey }),
    }));
  });
});
