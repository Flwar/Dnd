import { RouteLoadingFallback } from "@/components/shell/RouteLoadingFallback";

export default function PartyLoading() {
  return (
    <RouteLoadingFallback
      title="מכינים את חדר החבורה…"
      detail="מסנכרנים את חברי החבורה עם השרת."
      recoveryHref="/menu"
    />
  );
}
