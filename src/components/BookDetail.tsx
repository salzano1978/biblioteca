import { useState } from "react";
import { supabase } from "../lib/supabase";
import { enrichDraft } from "../lib/lookup";
import type { Book } from "../types";
import Cover from "./Cover";

interface Props {
  book: Book;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: (b: Book) => void;
}

export default function BookDetail({ book, onClose, onEdit, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const search = async () => {
    setBusy(true);
    setNote("");
    const r = await enrichDraft(book);
    if (!r || (!r.description && !r.categories && !r.page_count)) {
      setNote("Non ho trovato informazioni online per questo libro.");
      setBusy(false);
      return;
    }
    const patch = {
      description: book.description || r.description || null,
      categories: book.categories || r.categories || null,
      page_count: book.page_count || r.page_count || null,
      language: book.language || r.language || null,
    };
    const { data, error } = await supabase.from("books").update(patch).eq("id", book.id).select().single();
    setBusy(false);
    if (error) return setNote(error.message);
    onUpdated(data as Book);
    setNote(r.description ? "Trama aggiunta." : "Trovati solo alcuni dati, ma non la trama.");
  };

  const cats = (book.categories ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const facts = [
    book.publisher,
    book.year,
    book.page_count ? `${book.page_count} pagine` : null,
    book.language ? book.language.toUpperCase() : null,
  ].filter(Boolean) as string[];

  return (
    <div className="sheet detail">
      <div className="sheethead">
        <button className="ghost back" onClick={onClose} aria-label="Indietro">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button className="primary" onClick={onEdit}>Modifica</button>
      </div>

      <div className="dtop">
        <Cover book={book} size="lg" />
        <div className="grow">
          <h1 className="dtitle">{book.title}</h1>
          {book.authors && <div className="dauthor">{book.authors}</div>}
          {book.location && (
            <div className="loc">
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
              </svg>
              {book.location}
            </div>
          )}
        </div>
      </div>

      {cats.length > 0 && (
        <div className="pills">{cats.map((c) => <span key={c} className="pill">{c}</span>)}</div>
      )}
      {facts.length > 0 && <p className="facts">{facts.join(" · ")}</p>}

      <h2 className="dh">Trama</h2>
      {book.description ? (
        <p className="plot">{book.description}</p>
      ) : (
        <div className="noplot">
          <p>Nessuna trama salvata per questo libro.</p>
          <button className="primary" onClick={search} disabled={busy}>
            {busy ? "Cerco…" : "Cerca la trama online"}
          </button>
        </div>
      )}
      {book.description && (!book.categories || !book.page_count) && (
        <button className="ghost" onClick={search} disabled={busy}>{busy ? "Cerco…" : "Completa altri dati online"}</button>
      )}
      {note && <p className="msg">{note}</p>}

      {book.notes && (
        <>
          <h2 className="dh">Note</h2>
          <p className="plot">{book.notes}</p>
        </>
      )}
      {book.isbn && <p className="isbn">ISBN {book.isbn}</p>}
    </div>
  );
}
