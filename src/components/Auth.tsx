import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [signup, setSignup] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const { data, error } = signup
      ? await supabase.auth.signUp({ email, password: pw })
      : await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setMsg(error.message);
    else if (signup && !data.session) setMsg("Controlla la mail per confermare l'account.");
  };

  return (
    <form className="form auth" onSubmit={submit}>
      <h1>📚 La nostra libreria</h1>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required /></label>
      {msg && <p className="msg">{msg}</p>}
      <button className="primary">{signup ? "Registrati" : "Accedi"}</button>
      <button type="button" className="ghost" onClick={() => setSignup(!signup)}>
        {signup ? "Ho già un account" : "Crea un account"}
      </button>
    </form>
  );
}
