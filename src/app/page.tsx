import { OpeningMenu } from "@/components/menu/OpeningMenu";
import { isSupabaseConfigured } from "@/lib/env";

export default function HomePage() {
  const configured = isSupabaseConfigured();
  return <OpeningMenu cloudConfigured={configured} />;
}
