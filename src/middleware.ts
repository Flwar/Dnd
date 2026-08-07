import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/menu", "/characters", "/game", "/party", "/profile"];
const authenticationPrefixes = ["/auth/login", "/auth/register", "/auth/recover"];

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();
  const { response, user, authError } = await refreshSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  const protectedRoute = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (protectedRoute && !user && !authError) {
    const target = new URL("/auth/login", request.url);
    target.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(target);
  }
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/menu", request.url));
  }
  if (user && authenticationPrefixes.some((prefix) => pathname === prefix)) {
    return NextResponse.redirect(new URL("/menu", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2?|ttf)$).*)"],
};
