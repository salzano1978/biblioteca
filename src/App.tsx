import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Library as Lib } from "./types";
import Auth from "./components/Auth";
import Setup from "./components/Setup";
import Library from "./components/Library";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [lib, setLib] = useState<Lib | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setLib(undefined); return; }
    supabase
      .from("members")
      .select("libraries(id,name,invite_code)")
      .limit(1)
      .then(({ data }) => setLib(((data?.[0] as any)?.libraries as Lib) ?? null));
  }, [session]);

  if (session === undefined) return <p className="hint">Carico…</p>;
  if (!session) return <Auth />;
  if (lib === undefined) return <p className="hint">Carico…</p>;
  if (lib === null) return <Setup onDone={setLib} />;
  return <Library lib={lib} />;
}
