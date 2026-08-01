import { redirect } from "next/navigation";
import { OpeningMenu } from "@/components/menu/OpeningMenu";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/menu");
  }
  return <OpeningMenu cloudConfigured={configured} />;
}
