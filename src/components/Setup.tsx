import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Library } from "../types";

export default function Setup({ onDone }: { onDone: (l: Library) => void }) {
  const [name, setName] = useState("La nostra libreria");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const run = async (fn: "create_library" | "join_library", args: object) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) setErr(error.message);
    else onDone(data as Library);
  };

  return (
    <div className="form auth">
      <h1>Benvenuto!</h1>
      <h3>Crea una nuova libreria</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button className="primary" onClick={() => run("create_library", { lib_name: name })}>Crea</button>
      <h3>…oppure entra in quella di famiglia</h3>
      <input placeholder="Codice invito" value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={() => run("join_library", { code })}>Entra</button>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
