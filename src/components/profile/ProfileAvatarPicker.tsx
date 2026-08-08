"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import {
  deletePortrait,
  PortraitPreparationError,
  uploadPortrait,
  validatePortraitSource,
} from "@/lib/portrait-upload-client";
import { isCustomPortraitKey } from "@/lib/portraits";

export const profileAvatarKeys = [
  "portrait-human-01",
  "portrait-elf-01",
  "portrait-dwarf-01",
  "portrait-halfling-01",
  "portrait-orc-01",
  "portrait-dragonborn-01",
] as const;

type ProfileAvatarPickerProps = {
  selected: string;
  selectedUrl?: string | null;
  committedKey?: string;
  commitPending?: boolean;
  disabled?: boolean;
  onSelect: (avatarKey: string, avatarUrl?: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
};

export function ProfileAvatarPicker({ selected, selectedUrl, committedKey, commitPending = false, disabled = false, onSelect, onBusyChange }: ProfileAvatarPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const uploadedDuringEditRef = useRef<string | null>(null);
  const committedKeyRef = useRef(committedKey);
  const commitPendingRef = useRef(commitPending);
  const mountedRef = useRef(true);
  const uploadSequenceRef = useRef(0);

  useEffect(() => () => {
    mountedRef.current = false;
    uploadSequenceRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const uploaded = uploadedDuringEditRef.current;
    if (uploaded && uploaded !== committedKeyRef.current && !commitPendingRef.current) {
      void deletePortrait(uploaded).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    committedKeyRef.current = committedKey;
    commitPendingRef.current = commitPending;
  }, [commitPending, committedKey]);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [onBusyChange, uploading]);

  const replacePreview = (next: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next;
    setPreviewUrl(next);
  };

  const choosePreset = (avatarKey: string) => {
    const unusedUpload = uploadedDuringEditRef.current;
    uploadedDuringEditRef.current = null;
    setError(null);
    replacePreview(null);
    onSelect(avatarKey, null);
    if (unusedUpload) void deletePortrait(unusedUpload).catch(() => undefined);
  };

  const handleUpload = async (file: File) => {
    const validationError = validatePortraitSource(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const uploadSequence = ++uploadSequenceRef.current;
    replacePreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);
    try {
      const result = await uploadPortrait(file);
      if (!mountedRef.current || uploadSequence !== uploadSequenceRef.current) {
        void deletePortrait(result.portraitKey).catch(() => undefined);
        return;
      }
      const previousUnusedUpload = uploadedDuringEditRef.current;
      uploadedDuringEditRef.current = result.portraitKey;
      onSelect(result.portraitKey, result.portraitUrl);
      if (previousUnusedUpload && previousUnusedUpload !== result.portraitKey) {
        void deletePortrait(previousUnusedUpload).catch(() => undefined);
      }
      replacePreview(null);
    } catch (uploadError) {
      setError(uploadError instanceof PortraitPreparationError
        ? uploadError.message
        : "החיבור נקטע בזמן העלאת התמונה. בדקו את החיבור ונסו שוב.");
    } finally {
      if (mountedRef.current && uploadSequence === uploadSequenceRef.current) {
        setUploading(false);
        replacePreview(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    }
  };

  const customSelected = isCustomPortraitKey(selected);
  return (
    <fieldset className="mt-5" aria-busy={uploading} disabled={disabled}>
      <legend className="mb-2 font-bold">תמונת פרופיל</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {profileAvatarKeys.map((key, index) => (
          <button
            type="button"
            key={key}
            className={`relative aspect-square overflow-hidden border ${selected === key ? "border-[#f0cf82] ring-2 ring-[#f0cf82]/20" : "border-white/15 hover:border-[#c6a15b]/60"}`}
            onClick={() => choosePreset(key)}
            disabled={uploading || disabled}
            aria-label={`בחירת דיוקן מובנה ${index + 1} לפרופיל`}
            aria-pressed={selected === key}
          >
            <CharacterPortrait portraitKey={key} alt="" sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[7rem_1fr]">
        <div className="relative aspect-square overflow-hidden border border-[#62c6df]/35 bg-[#0c1014]">
          {customSelected || previewUrl ? (
            <CharacterPortrait
              portraitKey={customSelected ? selected : profileAvatarKeys[0]}
              portraitUrl={previewUrl ?? selectedUrl}
              alt="תצוגה מקדימה של תמונת הפרופיל האישית"
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[#8f877a]">
              <ImagePlus className="size-8" aria-hidden="true" />
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 grid place-items-center bg-black/75" role="status" aria-label="מעבדים ומעלים את התמונה">
              <LoaderCircle className="size-7 animate-spin text-[#62c6df]" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div>
          <label className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-dashed px-4 py-3 text-center font-bold transition-colors ${uploading ? "cursor-not-allowed border-white/10 opacity-55" : "border-[#62c6df]/45 bg-[#62c6df]/6 text-[#d9f7ff] hover:border-[#62c6df]"}`}>
            {customSelected ? <RefreshCw className="size-4" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {customSelected ? "החלפת התמונה האישית" : "העלאת תמונה אישית"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading || disabled}
              data-testid="profile-avatar-upload-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-[#9e968a]">JPG, PNG או WebP עד 12 מגה־בייט. תמונה גדולה תכווץ במכשיר לפני ההעלאה.</p>
          {customSelected ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm text-[#ffaaa3] hover:text-[#ffd0cc]"
              disabled={uploading || disabled}
              onClick={() => choosePreset(profileAvatarKeys[0])}
            >
              <Trash2 className="size-4" aria-hidden="true" />הסרת התמונה האישית
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 min-h-6 text-sm" aria-live="polite">
        {error ? <p className="text-[#ffaaa3]" role="alert" data-testid="profile-avatar-upload-error">{error}</p> : null}
      </div>
    </fieldset>
  );
}
