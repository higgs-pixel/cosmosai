import { NextResponse } from "next/server";
import {
  getCurrentUserSession,
  isSupabaseConfigured,
} from "@/utils/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      authenticated: false,
      configured: false,
      message: "Authentication is temporarily unavailable.",
    });
  }

  const session = await getCurrentUserSession();
  return NextResponse.json({
    authenticated: Boolean(session?.user),
    configured: true,
  });
}
