"use client";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * browser client（anon key・クライアント専用）。
 *
 * Core では使用しない。Realtime / Storage 等の Optional module を有効化した場合のみ使う。
 * 機密データの読み書きをここから行わないこと（RLS はポリシーなし = 全拒否が既定）。
 * Auth.js のセッションは Supabase Auth の JWT ではないため、
 * auth.uid() ベースの RLS ポリシーはこのクライアントでは機能しない点に注意。
 */
export function createBrowserClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
