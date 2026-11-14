import type { Draft } from "../types";

const https = (u?: string) => (u ? u.replace(/^http:/, "https:") : undefined);

function fromGoogle(v: any): Draft {
  const info = v.volumeInfo ?? {};
  const ids: any[] = info.industryIdentifiers ?? [];
  const isbn = (ids.find((i) => i.type === "ISBN_13") ?? ids.find((i) => i.type === "ISBN_10"))?.identifier;
  return {
    isbn: isbn ?? null,
    title: [info.title, info.subtitle].filter(Boolean).join(": "),
    authors: (info.authors ?? []).join(", ") || null,
    publisher: info.publisher ?? null,
    year: info.publishedDate ? String(info.publishedDate).slice(0, 4) : null,
    cover_url: https(info.imageLinks?.thumbnail) ?? null,
  };
}

export async function lookupIsbn(isbn: string): Promise<Draft | null> {
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
    const j = await r.json();
    if (j.items?.length) return { ...fromGoogle(j.items[0]), isbn };
  } catch {}
  try {
    const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const j = await r.json();
    const b = j[`ISBN:${isbn}`];
    if (b) {
      return {
        isbn,
        title: b.title,
        authors: (b.authors ?? []).map((a: any) => a.name).join(", ") || null,
        publisher: b.publishers?.[0]?.name ?? null,
        year: b.publish_date ? String(b.publish_date).match(/\d{4}/)?.[0] ?? null : null,
        cover_url: b.cover?.medium ?? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
      };
    }
  } catch {}
  return null;
}

export async function searchByText(title: string, authors?: string): Promise<Draft[]> {
  const q = [`intitle:${title}`, authors ? `inauthor:${authors.split(",")[0]}` : ""].filter(Boolean).join("+");
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q).replace(/%2B/g, "+")}&maxResults=6`);
    const j = await r.json();
    return (j.items ?? []).map(fromGoogle);
  } catch {
    return [];
  }
}

/** Ridimensiona la foto e la manda alla funzione serverless che usa Claude. */
export async function identifyCover(file: File, token: string): Promise<{ title?: string; authors?: string } | null> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const image = c.toDataURL("image/jpeg", 0.82).split(",")[1];
  const r = await fetch("/api/identify-cover", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
