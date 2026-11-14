import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { identifyCover, lookupIsbn, searchByText } from "../lib/lookup";
import type { Book, Draft } from "../types";
import Scanner from "./Scanner";
import BookForm from "./BookForm";
import Cover from "./Cover";

interface Props {
  libraryId: string;
  books: Book[];
  locations: string[];
  lastLocation: string;
  onLocation: (l: string) => void;
  onSaved: (b: Book) => void;
  onClose: () => void;
}
type Mode = "isbn" | "cover" | "manual";

export default function AddBook({ libraryId, books, locations, lastLocation, onLocation, onSaved, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("isbn");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [candidates, setCandidates] = useState<Draft[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanKey, setScanKey] = useState(0);

  const pick = (d: Draft) => setDraft({ ...d, location: lastLocation });

  const onDetect = useCallback(async (code: string) => {
    setBusy(true);
    setMsg(`Cerco ${code}…`);
    const found = await lookupIsbn(code);
    setBusy(false);
    if (found) { setMsg(""); pick(found); }
    else { setMsg(`ISBN ${code} non trovato nei database online. Compila a mano, oppure annulla e prova con 📚 Copertina.`); setDraft({ isbn: code, location: lastLocation }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLocation]);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true); setMsg("Riconosco la copertina…"); setCandidates([]);
    try {
      const { data } = await supabase.auth.getSession();
      const r = await identifyCover(file, data.session!.access_token);
      if (!r?.title) { setMsg("Non sono riuscito a leggere la copertina. Riprova o inserisci a mano."); }
      else {
        const found = await searchByText(r.title, r.authors);
        if (found.length) { setCandidates(found); setMsg(`Ho letto: “${r.title}”. Scegli l'edizione:`); }
        else { setMsg(""); pick({ title: r.title, authors: r.authors ?? null }); }
      }
    } catch (e: any) { setMsg("Errore: " + (e.message ?? e)); }
    setBusy(false);
  };

  const save = async (d: Draft) => {
    const { data, error } = await supabase
      .from("books")
      .insert({ ...d, library_id: libraryId, title: d.title!.trim() })
      .select()
      .single();
    if (error) { alert(error.message); return; }
    onLocation(d.location ?? "");
    onSaved(data as Book);
    setDraft(null); setCandidates([]); setMsg("✅ Aggiunto! Puoi scansionare il prossimo.");
    setScanKey((k) => k + 1);
  };

  const dup = !!draft?.isbn && books.some((b) => b.isbn === draft.isbn);

  return (
    <div className="sheet">
      <div className="sheethead">
        <b>Aggiungi libro</b>
        <button className="ghost" onClick={onClose}>Chiudi</button>
      </div>

      {draft && msg && <p className="msg">{msg}</p>}
      {draft ? (
        <BookForm initial={draft} locations={locations} duplicate={dup} onSave={save} onCancel={() => setDraft(null)} />
      ) : (
        <>
          <div className="tabs">
            {(["isbn", "cover", "manual"] as Mode[]).map((m) => (
              <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setMsg(""); setCandidates([]); }}>
                {m === "isbn" ? "📷 Codice" : m === "cover" ? "📚 Copertina" : "✍️ Manuale"}
              </button>
            ))}
          </div>
          {msg && <p className="msg">{msg}</p>}

          {mode === "isbn" && !busy && <Scanner key={scanKey} onDetect={onDetect} />}

          {mode === "cover" && (
            <div className="coverpick">
              <label className="primary filebtn">
                {busy ? "Analisi in corso…" : "Scatta o scegli foto della copertina"}
                <input type="file" accept="image/*" capture="environment" hidden disabled={busy}
                  onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              <p className="hint">Funziona meglio con la copertina frontale ben illuminata.</p>
              <div className="list">
                {candidates.map((c, i) => (
                  <button key={i} className="item" onClick={() => pick(c)}>
                    <Cover book={c} size="sm" />
                    <span className="meta"><span className="t">{c.title}</span><span className="a">{c.authors} {c.year && `· ${c.year}`}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "manual" && <button className="primary" onClick={() => setDraft({ location: lastLocation })}>Inserisci a mano</button>}
        </>
      )}
    </div>
  );
}
