import { useState } from "react";
import type { Draft } from "../types";
import Cover from "./Cover";

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
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.title?.trim()) return;
    setBusy(true);
    await onSave(d);
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
