import { useState } from "react";

// [sfondo, testo, fascia]
const PALETTE: [string, string, string][] = [
  ["#2F2A63", "#FFFFFF", "#E9C46A"],
  ["#D8C58A", "#2A2412", "#8A4B38"],
  ["#6D8F77", "#0B1A12", "#0B1A12"],
  ["#8C5A3C", "#FFFFFF", "#F4EEE2"],
  ["#7A3B3B", "#FFFFFF", "#F4EEE2"],
  ["#8FD3C3", "#0B2A24", "#0B2A24"],
  ["#D9A58A", "#2A1A12", "#8A4B38"],
  ["#1F4A56", "#FFFFFF", "#E9C46A"],
  ["#B9B5D8", "#1E1B3A", "#1E1B3A"],
  ["#4A2E22", "#FFFFFF", "#C98B6B"],
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

interface Props {
  book: { title?: string | null; authors?: string | null; cover_url?: string | null };
  size?: "sm" | "md" | "lg";
}

/** Copertina vera se disponibile, altrimenti una tessera tipografica colorata. */
export default function Cover({ book, size = "sm" }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = book.cover_url || null;
  const title = book.title ?? "";
  const [bg, fg, band] = PALETTE[hash(title) % PALETTE.length];

  if (url && failed !== url) {
    return (
      <img
        className={`cover cover-${size}`}
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(url)}
        onLoad={(e) => {
          // Open Library a volte risponde con un'immagine 1x1 se la copertina non esiste
          if (e.currentTarget.naturalWidth < 20) setFailed(url);
        }}
      />
    );
  }

  const author = (book.authors ?? "").split(",")[0].split(" ").slice(-1)[0];
  return (
    <div className={`cover cover-${size} tile`} aria-hidden="true" style={{ background: bg, color: fg }}>
      {size === "sm" ? (
        <span className="initial">{title.trim().charAt(0).toUpperCase() || "?"}</span>
      ) : (
        <>
          <span className="band" style={{ background: band }} />
          <span className="ttl">{title}</span>
          <span className="aut">{author}</span>
        </>
      )}
    </div>
  );
}
