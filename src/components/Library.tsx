import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Book, Draft, Library as Lib } from "../types";
const AddBook = lazy(() => import("./AddBook"));
import BookForm from "./BookForm";

export default function Library({ lib }: { lib: Lib }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [lastLocation, setLastLocation] = useState(() => localStorage.getItem("lastLoc") ?? "");

  useEffect(() => {
    supabase.from("books").select("*").eq("library_id", lib.id).order("title").then(({ data }) => {
      setBooks((data as Book[]) ?? []);
      setLoading(false);
    });
  }, [lib.id]);

  const locations = useMemo(
    () => [...new Set(books.map((b) => b.location).filter(Boolean) as string[])].sort(),
    [books]
  );

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return books.filter(
      (b) =>
        (!loc || b.location === loc) &&
        (!t || [b.title, b.authors, b.isbn, b.publisher, b.notes].some((f) => f?.toLowerCase().includes(t)))
    );
  }, [books, q, loc]);

  const upd = async (d: Draft) => {
    const { data, error } = await supabase.from("books").update(d).eq("id", editing!.id).select().single();
    if (error) return alert(error.message);
    setBooks(books.map((b) => (b.id === editing!.id ? (data as Book) : b)).sort((a, b) => a.title.localeCompare(b.title)));
    setEditing(null);
  };
  const del = async () => {
    await supabase.from("books").delete().eq("id", editing!.id);
    setBooks(books.filter((b) => b.id !== editing!.id));
    setEditing(null);
  };

  return (
    <>
      <div className="searchbar">
        <input placeholder={`Cerca tra ${books.length} libri…`} value={q} onChange={(e) => setQ(e.target.value)} />
        {locations.length > 0 && (
          <div className="chips">
            <button className={!loc ? "on" : ""} onClick={() => setLoc("")}>Tutti</button>
            {locations.map((l) => (
              <button key={l} className={loc === l ? "on" : ""} onClick={() => setLoc(l)}>{l}</button>
            ))}
          </div>
        )}
      </div>

      <div className="list">
        {loading && <p className="hint">Carico…</p>}
        {!loading && !shown.length && <p className="hint">{books.length ? "Nessun risultato." : "Libreria vuota: tocca + per aggiungere il primo libro."}</p>}
        {shown.map((b) => (
          <button key={b.id} className="item" onClick={() => setEditing(b)}>
            {b.cover_url ? <img className="cover" src={b.cover_url} alt="" loading="lazy" /> : <div className="cover ph">📖</div>}
            <span>
              <b>{b.title}</b>
              <br /><small>{b.authors}</small>
              {b.location && <><br /><em className="loc">📍 {b.location}</em></>}
            </span>
          </button>
        ))}
      </div>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Aggiungi libro">+</button>

      {adding && (
        <Suspense fallback={<div className="sheet"><p className="hint">Carico…</p></div>}>
        <AddBook
          libraryId={lib.id}
          books={books}
          locations={locations}
          lastLocation={lastLocation}
          onLocation={(l) => { setLastLocation(l); localStorage.setItem("lastLoc", l); }}
          onSaved={(b) => setBooks((p) => [...p, b].sort((a, c) => a.title.localeCompare(c.title)))}
          onClose={() => setAdding(false)}
        />
        </Suspense>
      )}
      {editing && (
        <div className="sheet">
          <div className="sheethead"><b>Modifica libro</b></div>
          <BookForm isEdit initial={editing} locations={locations} onSave={upd} onDelete={del} onCancel={() => setEditing(null)} />
        </div>
      )}
    </>
  );
}
