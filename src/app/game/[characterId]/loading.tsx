import { RouteLoadingFallback } from "@/components/shell/RouteLoadingFallback";

export default function GameLoading() {
  return (
    <RouteLoadingFallback
      title="פותחים את ספר המסע…"
      detail="הדמות, המשימות והשמירה נטענות מן הענן."
      recoveryHref="/menu"
    />
  );
}
