import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import type { Restaurant, Staff } from "@/types/db";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  restaurant: Restaurant | null;
  staff: Staff | null;
  /** True if the env has no Supabase credentials — we render demo/empty UI. */
  demoMode: boolean;
  refreshRestaurant: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);

  // Initial session + subscription
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch the user's restaurant + staff profile once signed in
  useEffect(() => {
    if (!session?.user) {
      setRestaurant(null);
      setStaff(null);
      return;
    }
    void refreshRestaurant(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function refreshRestaurant(userId?: string) {
    const uid = userId ?? session?.user?.id;
    if (!uid) return;

    // Owner case
    const { data: owned } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", uid)
      .limit(1)
      .maybeSingle();
    if (owned) {
      setRestaurant(owned as Restaurant);
      const { data: st } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", uid)
        .eq("restaurant_id", owned.id)
        .maybeSingle();
      setStaff((st as Staff | null) ?? null);
      return;
    }

    // Staff case
    const { data: sRow } = await supabase
      .from("staff")
      .select("*, restaurants(*)")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (sRow) {
      const { restaurants, ...rest } = sRow as Staff & { restaurants: Restaurant | null };
      setStaff(rest as Staff);
      setRestaurant(restaurants ?? null);
    } else {
      setRestaurant(null);
      setStaff(null);
    }
  }

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      restaurant,
      staff,
      demoMode: !supabaseConfigured,
      refreshRestaurant: () => refreshRestaurant(),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      async signUp(email, password) {
        const { error } = await supabase.auth.signUp({ email, password });
        return error ? { error: error.message } : {};
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, restaurant, staff]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
