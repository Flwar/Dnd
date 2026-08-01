"use client";

import { useState, type FormEvent } from "react";
import { DoorOpen, ShieldPlus, UsersRound } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { normalizeRoomCode } from "@/lib/party/validation";
import type { PartyCharacterOption } from "@/lib/party/types";

type Props = {
  character: PartyCharacterOption;
  busyAction: string | null;
  onCreate: (name: string, maximumMembers: number) => void;
  onJoin: (roomCode: string) => void;
};

export function PartyEntryPanel({ character, busyAction, onCreate, onJoin }: Props) {
  const [partyName, setPartyName] = useState("");
  const [maximumMembers, setMaximumMembers] = useState(4);
  const [roomCode, setRoomCode] = useState("");

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate(partyName, maximumMembers);
  };

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onJoin(roomCode);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="יצירת חבורה או הצטרפות">
      <form className="stone-panel p-5 sm:p-6" onSubmit={submitCreate}>
        <div className="mb-5 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center border border-[#c6a15b]/35 bg-[#c6a15b]/10 text-[#f0cf82]"><ShieldPlus className="size-5" /></span>
          <div><h2 className="display-font text-3xl text-[#f0cf82]">יצירת חבורה</h2><p className="text-sm text-[#a89f91]">{character.name} יהיה מוביל החבורה.</p></div>
        </div>
        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-[#d8cebd]">שם החבורה</span>
          <input
            className="fantasy-input w-full"
            value={partyName}
            onChange={(event) => setPartyName(event.target.value)}
            minLength={2}
            maxLength={40}
            required
            autoComplete="off"
            placeholder="לדוגמה: שומרי הערפל"
          />
        </label>
        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-semibold text-[#d8cebd]">מספר חברים מרבי</span>
          <select className="fantasy-input w-full" value={maximumMembers} onChange={(event) => setMaximumMembers(Number(event.target.value))}>
            <option value={2}>2 שחקנים</option>
            <option value={3}>3 שחקנים</option>
            <option value={4}>4 שחקנים</option>
          </select>
        </label>
        <GameButton type="submit" className="w-full" loading={busyAction === "create"} disabled={Boolean(busyAction)}>
          <UsersRound className="size-5" aria-hidden="true" />יצירת החבורה
        </GameButton>
      </form>

      <form className="stone-panel p-5 sm:p-6" onSubmit={submitJoin}>
        <div className="mb-5 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center border border-[#62c6df]/35 bg-[#62c6df]/10 text-[#78dbef]"><DoorOpen className="size-5" /></span>
          <div><h2 className="display-font text-3xl text-[#f0cf82]">הצטרפות לחבורה</h2><p className="text-sm text-[#a89f91]">הזינו את הקוד שקיבלתם ממוביל החבורה.</p></div>
        </div>
        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-semibold text-[#d8cebd]">קוד חדר</span>
          <input
            className="fantasy-input w-full text-center font-mono text-2xl font-bold tracking-[0.32em] uppercase"
            dir="ltr"
            value={roomCode}
            onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            minLength={6}
            maxLength={6}
            pattern="[A-Z0-9]{6}"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="room-code-help"
            placeholder="A7K9Q2"
          />
          <span id="room-code-help" className="mt-2 block text-xs text-[#8f877a]">שישה תווים באנגלית או ספרות.</span>
        </label>
        <GameButton type="submit" variant="secondary" className="w-full" loading={busyAction === "join"} disabled={Boolean(busyAction)}>
          <DoorOpen className="size-5" aria-hidden="true" />כניסה לחדר
        </GameButton>
      </form>
    </section>
  );
}
