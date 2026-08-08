import type { ReactNode } from "react";

interface GameModeShellProps {
  combat: ReactNode | null;
  exploration: ReactNode;
  persistent?: ReactNode;
}

/**
 * Keeps combat and exploration mutually exclusive. Combat is a dedicated game
 * mode, not an overlay appended after the exploration document.
 */
export function GameModeShell({ combat, exploration, persistent = null }: GameModeShellProps) {
  const mode = combat ? "combat" : "exploration";

  return (
    <>
      <div
        className="relative isolate min-h-dvh overflow-hidden bg-[#050608]"
        data-game-mode={mode}
        role="region"
        aria-label={combat ? "מצב קרב" : "מצב חקירה"}
      >
        {combat ?? exploration}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {combat ? "הקרב החל. מסך החקירה הוחלף במסך הקרב." : "מצב חקירה פעיל."}
      </p>
      {persistent}
    </>
  );
}
