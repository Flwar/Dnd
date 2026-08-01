"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, LoaderCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { GameButton } from "@/components/ui/GameButton";
import { isCustomPortraitKey } from "@/lib/portraits";
import type { CharacterRace } from "@/types/game";

const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024;
const ALLOWED_PORTRAIT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PortraitUploadResponse = {
  portraitKey: string;
  portraitUrl: string;
};

type PortraitPickerProps = {
  race: CharacterRace;
  selected: string;
  selectedPortraitUrl?: string | null;
  onSelect: (portraitKey: string, portraitUrl?: string | null) => void;
};

function validatePortraitFile(file: File): string | null {
  if (!ALLOWED_PORTRAIT_TYPES.has(file.type)) {
    return "אפשר להעלות תמונת JPG, PNG או WebP בלבד.";
  }
  if (!file.size) return "קובץ התמונה ריק. יש לבחור תמונה אחרת.";
  if (file.size > MAX_PORTRAIT_BYTES) {
    return "התמונה גדולה מ־2 מגה־בייט. יש לבחור קובץ קטן יותר.";
  }
  return null;
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: unknown; error?: unknown } | null;
  if (typeof body?.message === "string") return body.message;
  if (typeof body?.error === "string") return body.error;
  return fallback;
}

async function deletePortrait(portraitKey: string): Promise<Response> {
  return fetch("/api/character-portraits", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portraitKey }),
  });
}

export function PortraitPicker({ race, selected, selectedPortraitUrl, onSelect }: PortraitPickerProps) {
  const [mode, setMode] = useState<"presets" | "upload">(() => isCustomPortraitKey(selected) ? "upload" : "presets");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const replacePreviewUrl = (next: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next;
    setPreviewUrl(next);
  };

  const uploadFile = async (file: File) => {
    const validationError = validatePortraitFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const oldPortraitKey = isCustomPortraitKey(selected) ? selected : null;
    replacePreviewUrl(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/character-portraits", { method: "POST", body: formData });
      if (!response.ok) {
        setError(await responseMessage(response, "לא הצלחנו להעלות את התמונה. אפשר לנסות שוב."));
        return;
      }

      const body = await response.json() as Partial<PortraitUploadResponse>;
      if (!body.portraitKey || !isCustomPortraitKey(body.portraitKey) || typeof body.portraitUrl !== "string") {
        setError("שרת התמונות החזיר תשובה לא תקינה. אפשר לנסות שוב.");
        return;
      }

      onSelect(body.portraitKey, body.portraitUrl);
      if (oldPortraitKey && oldPortraitKey !== body.portraitKey) {
        void deletePortrait(oldPortraitKey).catch(() => undefined);
      }
      replacePreviewUrl(null);
    } catch {
      setError("החיבור נקטע בזמן העלאת התמונה. בדקו את החיבור ונסו שוב.");
    } finally {
      setUploading(false);
      replacePreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeCustomPortrait = async () => {
    if (!isCustomPortraitKey(selected)) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await deletePortrait(selected);
      if (!response.ok) {
        setError(await responseMessage(response, "לא הצלחנו להסיר את התמונה. אפשר לנסות שוב."));
        return;
      }
      replacePreviewUrl(null);
      onSelect(race.portraitKeys[0], null);
    } catch {
      setError("לא הצלחנו להגיע לשירות התמונות. בדקו את החיבור ונסו שוב.");
    } finally {
      setDeleting(false);
    }
  };

  const selectPreset = (portraitKey: string) => {
    const previousCustomKey = isCustomPortraitKey(selected) ? selected : null;
    setError(null);
    replacePreviewUrl(null);
    onSelect(portraitKey, null);
    if (previousCustomKey) void deletePortrait(previousCustomKey).catch(() => undefined);
  };

  const selectedCustom = isCustomPortraitKey(selected);
  const displayPreviewUrl = previewUrl ?? selectedPortraitUrl;
  const busy = uploading || deleting;
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === "ArrowRight" || event.key === "Home" ? "presets" : "upload";
    setMode(nextMode);
    const nextTab = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
      nextMode === "presets" ? "#portrait-presets-tab" : "#portrait-upload-tab",
    );
    nextTab?.focus();
  };

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 border border-[#c6a15b]/25 bg-black/30 p-1" role="tablist" aria-label="מקור הדיוקן">
        <button
          id="portrait-presets-tab"
          type="button"
          role="tab"
          aria-selected={mode === "presets"}
          aria-controls="portrait-presets-panel"
          data-testid="portrait-mode-presets"
          className={`min-h-12 border px-3 font-semibold transition-colors ${mode === "presets" ? "border-[#f0cf82]/70 bg-[#c6a15b]/18 text-[#fff0c7]" : "border-transparent text-[#aaa194] hover:text-[#f0cf82]"}`}
          onClick={() => setMode("presets")}
          onKeyDown={handleTabKeyDown}
        >
          דיוקנאות המשחק
        </button>
        <button
          id="portrait-upload-tab"
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          aria-controls="portrait-upload-panel"
          data-testid="portrait-mode-upload"
          className={`min-h-12 border px-3 font-semibold transition-colors ${mode === "upload" ? "border-[#62c6df]/70 bg-[#62c6df]/12 text-[#d9f7ff]" : "border-transparent text-[#aaa194] hover:text-[#b7e9f3]"}`}
          onClick={() => setMode("upload")}
          onKeyDown={handleTabKeyDown}
        >
          תמונה אישית
        </button>
      </div>

      {mode === "presets" ? (
        <div id="portrait-presets-panel" role="tabpanel" aria-labelledby="portrait-presets-tab" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {race.portraitKeys.map((key, index) => (
            <button
              key={key}
              type="button"
              onClick={() => selectPreset(key)}
              data-testid={`portrait-option-${key}`}
              className={`group relative aspect-[3/4] overflow-hidden border-2 bg-[#101318] ${selected === key ? "border-[#f0cf82] shadow-[0_0_26px_rgba(98,198,223,.24)]" : "border-white/10 hover:border-[#c6a15b]/60"}`}
              aria-label={`דיוקן ${race.name}, אפשרות ${index + 1}`}
              aria-pressed={selected === key}
            >
              <CharacterPortrait portraitKey={key} alt="" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              {selected === key ? <span className="absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-[#c6a15b] text-black"><Check className="size-5" aria-hidden="true" /></span> : null}
            </button>
          ))}
        </div>
      ) : (
        <div id="portrait-upload-panel" role="tabpanel" aria-labelledby="portrait-upload-tab" className="grid gap-5 md:grid-cols-[minmax(14rem,20rem)_1fr]">
          <div className="relative aspect-[3/4] overflow-hidden border border-[#c6a15b]/45 bg-[#0c1014]" data-testid="portrait-upload-preview">
            {selectedCustom || previewUrl ? (
              <CharacterPortrait
                portraitKey={selectedCustom ? selected : race.portraitKeys[0]}
                portraitUrl={displayPreviewUrl}
                alt="תצוגה מקדימה של התמונה האישית"
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-[#8f877a]">
                <div><ImagePlus className="mx-auto mb-3 size-12 text-[#c6a15b]" aria-hidden="true" /><p>כאן תופיע התמונה האישית שלך</p></div>
              </div>
            )}
            {uploading ? <div className="absolute inset-0 grid place-items-center bg-black/72" role="status"><div className="text-center text-[#d9f7ff]"><LoaderCircle className="mx-auto mb-2 size-8 animate-spin" aria-hidden="true" /><p>מעלים את התמונה לענן…</p></div></div> : null}
          </div>

          <div className="flex flex-col justify-center">
            <label
              data-testid="portrait-upload-dropzone"
              className={`grid min-h-40 cursor-pointer place-items-center border border-dashed p-5 text-center transition-colors ${busy ? "cursor-not-allowed border-white/10 opacity-55" : "border-[#62c6df]/45 bg-[#62c6df]/6 hover:border-[#62c6df] hover:bg-[#62c6df]/10"}`}
              tabIndex={busy ? -1 : 0}
              aria-disabled={busy}
              onKeyDown={(event) => {
                if (!busy && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file && !busy) void uploadFile(file);
              }}
            >
              <span>
                {selectedCustom ? <RefreshCw className="mx-auto mb-3 size-9 text-[#62c6df]" aria-hidden="true" /> : <Upload className="mx-auto mb-3 size-9 text-[#62c6df]" aria-hidden="true" />}
                <b className="block text-[#e9dfcb]" data-testid={selectedCustom ? "portrait-upload-replace" : undefined}>{selectedCustom ? "בחירת תמונה אחרת" : "בחירת תמונה מהמכשיר"}</b>
                <span className="mt-2 block text-sm leading-6 text-[#9e968a]">JPG, PNG או WebP · עד 2 מגה־בייט</span>
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                disabled={busy}
                data-testid="portrait-upload-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </label>

            <p className="mt-3 text-sm leading-6 text-[#a89f91]">התמונה תישמר בענן בכתובת ציבורית ותוצג לחברי החבורה בזמן משחק מקוון. אין להעלות תמונה פרטית או רגישה.</p>
            {selectedCustom ? (
              <GameButton className="mt-4 self-start" variant="danger" size="sm" loading={deleting} disabled={uploading} onClick={removeCustomPortrait} data-testid="portrait-upload-remove">
                <Trash2 className="size-4" aria-hidden="true" />הסרת התמונה
              </GameButton>
            ) : null}
            <div className="mt-3 min-h-6 text-sm" aria-live="polite" data-testid="portrait-upload-status">
              {error ? <p className="text-[#ffaaa3]" role="alert" data-testid="portrait-upload-error">{error}</p> : selectedCustom && !busy ? <p className="text-[#9dd7c0]">התמונה האישית מוכנה.</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
