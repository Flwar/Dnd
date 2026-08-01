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
  return (
    <>
      {combat ?? exploration}
      {persistent}
    </>
  );
}
