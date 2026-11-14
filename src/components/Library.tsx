import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Book, Draft, Library as Lib } from "../types";
import BookForm from "./BookForm";
import Cover from "./Cover";
const AddBook = lazy(() => import("./AddBook"));

const Pin = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
  </svg>
);

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

  const recent = useMemo(
    () => [...books].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 8),
    [books]
  );
  const showRecent = !q.trim() && !loc && books.length >= 4;

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
    <div className="app">
      <header className="top">
        <div>
          <div className="eyebrow">{books.length} {books.length === 1 ? "libro" : "libri"}</div>
          <h1>{lib.name}</h1>
        </div>
        <details className="menuwrap">
          <summary aria-label="Menu">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
            </svg>
          </summary>
          <div className="menu">
            <p>Codice invito famiglia<br /><b>{lib.invite_code}</b></p>
            <button onClick={() => supabase.auth.signOut()}>Esci</button>
          </div>
        </details>
      </header>

      <label className="search">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
        </svg>
        <input aria-label="Cerca nella libreria" placeholder="Cerca titolo, autore, ISBN…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {locations.length > 0 && (
        <div className="chips">
          <button className={!loc ? "on" : ""} onClick={() => setLoc("")}>Tutti</button>
          {locations.map((l) => (
            <button key={l} className={loc === l ? "on" : ""} onClick={() => setLoc(l)}>{l}</button>
          ))}
        </div>
      )}

      {showRecent && (
        <section>
          <h2>Aggiunti di recente</h2>
          <div className="recent">
            {recent.map((b) => (
              <button key={b.id} className="recentitem" onClick={() => setEditing(b)} aria-label={b.title}>
                <Cover book={b} size="md" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>{loc || q ? `${shown.length} risultati` : "Tutti i libri"}</h2>
        <div className="list">
          {loading && <p className="hint">Carico…</p>}
          {!loading && !shown.length && (
            <p className="hint">{books.length ? "Nessun risultato." : "Libreria vuota: tocca + per aggiungere il primo libro."}</p>
          )}
          {shown.map((b) => (
            <button key={b.id} className="item" onClick={() => setEditing(b)}>
              <Cover book={b} size="sm" />
              <span className="meta">
                <span className="t">{b.title}</span>
                <span className="a">{b.authors}</span>
                {b.location && <span className="loc"><Pin />{b.location}</span>}
              </span>
            </button>
          ))}
        </div>
      </section>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Aggiungi libro">
        <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

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
    </div>
  );
}
