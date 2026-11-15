import { useState } from "react";
import type { Draft } from "../types";
import Cover from "./Cover";
import { enrichDraft } from "../lib/lookup";
import { READ_LABELS, READ_ORDER, today } from "../lib/status";
import Stars from "./Stars";

interface Props {
  initial: Draft;
  locations: string[];
  isEdit?: boolean;
  duplicate?: boolean;
  onSave: (d: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export default function BookForm({ initial, locations, isEdit, duplicate, onSave, onDelete, onCancel }: Props) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  const [note, setNote] = useState("");

  const enrich = async () => {
    setLooking(true);
    setNote("");
    const r = await enrichDraft(d);
    setLooking(false);
    if (!r || (!r.description && !r.categories && !r.page_count)) return setNote("Non ho trovato informazioni online.");
    setD({
      ...d,
      description: d.description || r.description || null,
      categories: d.categories || r.categories || null,
      page_count: d.page_count || r.page_count || null,
      language: d.language || r.language || null,
    });
    setNote(r.description ? "Trama trovata: controlla e salva." : "Trovati solo alcuni dati, non la trama.");
  };
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.title?.trim()) return;
    setBusy(true);
    const who = d.loaned_to?.trim() || null;
    await onSave({ ...d, read_status: d.read_status || null, loaned_to: who, loaned_at: who ? d.loaned_at || today() : null });
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      {duplicate && <p className="warn">⚠️ Questo ISBN è già in libreria. Vuoi aggiungerlo lo stesso (seconda copia)?</p>}
      <div className="formtop">
        <Cover book={d} size="lg" />
        <div className="grow">
          <label>Titolo *<input value={d.title ?? ""} onChange={set("title")} required /></label>
          <label>Autore/i<input value={d.authors ?? ""} onChange={set("authors")} /></label>
        </div>
      </div>
      <label>
        Posizione (stanza / scaffale)
        <input value={d.location ?? ""} onChange={set("location")} list="locs" placeholder="es. Salotto > Scaffale 2" />
        <datalist id="locs">{locations.map((l) => <option key={l} value={l} />)}</datalist>
      </label>
      <div className="row">
        <label className="grow">Editore<input value={d.publisher ?? ""} onChange={set("publisher")} /></label>
        <label style={{ width: 90 }}>Anno<input value={d.year ?? ""} onChange={set("year")} inputMode="numeric" /></label>
      </div>
      <label>ISBN<input value={d.isbn ?? ""} onChange={set("isbn")} inputMode="numeric" /></label>
      <div className="row">
        <label className="grow">Genere (separati da virgola)<input value={d.categories ?? ""} onChange={set("categories")} /></label>
      </div>
      <div className="row">
        <label className="grow">Pagine<input value={d.page_count ?? ""} inputMode="numeric"
          onChange={(e) => setD({ ...d, page_count: e.target.value ? Number(e.target.value.replace(/\D/g, "")) || null : null })} /></label>
        <label style={{ width: 90 }}>Lingua<input value={d.language ?? ""} onChange={set("language")} placeholder="it" /></label>
      </div>
      <label>
        Trama
        <textarea value={d.description ?? ""} onChange={set("description")} rows={6} />
      </label>
      <button type="button" onClick={enrich} disabled={looking || (!d.title && !d.isbn)}>
        {looking ? "Cerco…" : "Cerca trama e dati online"}
      </button>
      {note && <p className="msg">{note}</p>}
      <label>
        Stato di lettura
        <select value={d.read_status ?? ""} onChange={(e) => setD({ ...d, read_status: e.target.value || null })}>
          <option value="">Non indicato</option>
          {READ_ORDER.map((s) => <option key={s} value={s}>{READ_LABELS[s]}</option>)}
        </select>
      </label>
      <div>
        <div className="lbl">Il tuo voto</div>
        <Stars value={d.rating ?? null} onChange={(v) => setD({ ...d, rating: v })} />
      </div>
      <div className="row">
        <label className="grow">Prestato a<input value={d.loaned_to ?? ""} onChange={set("loaned_to")} placeholder="Lascia vuoto se è a casa" /></label>
        <label style={{ width: 150 }}>Dal<input type="date" value={d.loaned_at ?? ""} onChange={set("loaned_at")} /></label>
      </div>
      <label>Note<textarea value={d.notes ?? ""} onChange={set("notes")} rows={2} /></label>
      <div className="row actions">
        <button type="button" className="ghost" onClick={onCancel}>Annulla</button>
        {isEdit && onDelete && (
          <button type="button" className="danger" onClick={async () => confirm("Eliminare questo libro?") && (await onDelete())}>
            Elimina
          </button>
        )}
        <button className="primary grow" disabled={busy}>{busy ? "…" : isEdit ? "Salva" : "Aggiungi"}</button>
      </div>
    </form>
  );
}
