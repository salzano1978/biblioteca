import type { Draft } from "../types";

const https = (u?: string) => (u ? u.replace(/^http:/, "https:") : undefined);

/** Google Books restituisce la trama con tag HTML: li togliamo. */
function cleanText(t?: string | null): string | null {
  if (!t) return null;
  const x = t
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return x || null;
}

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
    description: cleanText(info.description),
    categories: (info.categories ?? []).join(", ") || null,
    page_count: info.pageCount || null,
    language: info.language ?? null,
  };
}

const GKEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;
const gb = (q: string, max = 1) =>
  `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=${max}${GKEY ? `&key=${GKEY}` : ""}`;

async function getJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function lookupIsbn(isbn: string): Promise<Draft | null> {
  // 1) Google Books (prima con isbn:, poi ricerca libera filtrata)
  for (const q of [`isbn:${isbn}`, isbn]) {
    const j = await getJson(gb(q, 5));
    const hit = (j?.items ?? []).find((v: any) =>
      (v.volumeInfo?.industryIdentifiers ?? []).some((i: any) => i.identifier === isbn)
    ) ?? (q.startsWith("isbn:") ? j?.items?.[0] : undefined);
    if (hit) return { ...fromGoogle(hit), isbn };
  }
  // 2) Open Library (dati completi)
  const o = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const b = o?.[`ISBN:${isbn}`];
  if (b?.title) {
    return {
      isbn,
      title: b.title,
      authors: (b.authors ?? []).map((a: any) => a.name).join(", ") || null,
      publisher: b.publishers?.[0]?.name ?? null,
      year: b.publish_date ? String(b.publish_date).match(/\d{4}/)?.[0] ?? null : null,
      cover_url: b.cover?.medium ?? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
      page_count: b.number_of_pages ?? null,
      categories: (b.subjects ?? []).slice(0, 3).map((x: any) => x.name).join(", ") || null,
    };
  }
  // 3) Open Library (ricerca)
  const sr = await getJson(
    `https://openlibrary.org/search.json?q=${isbn}&fields=title,author_name,publisher,first_publish_year,cover_i&limit=1`
  );
  const d = sr?.docs?.[0];
  if (d?.title) {
    return {
      isbn,
      title: d.title,
      authors: (d.author_name ?? []).join(", ") || null,
      publisher: d.publisher?.[0] ?? null,
      year: d.first_publish_year ? String(d.first_publish_year) : null,
      cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    };
  }
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

/** Cerca online trama, generi, pagine e lingua per un libro già noto (per ISBN, poi per titolo). */
export async function enrichDraft(d: Draft): Promise<Draft | null> {
  const pick = (items: any[]) => {
    const withDesc = items.filter((v) => v.volumeInfo?.description);
    const it = withDesc.find((v) => v.volumeInfo?.language === "it") ?? withDesc[0] ?? items[0];
    return it ? fromGoogle(it) : null;
  };
  let found: Draft | null = null;
  if (d.isbn) {
    const j = await getJson(gb(`isbn:${d.isbn}`, 5));
    found = pick(j?.items ?? []);
  }
  if (!found?.description && d.title) {
    const clean = d.title.replace(/\(.*?\)/g, "").replace(/\..*$/, "").trim();
    const au = (d.authors ?? "").split(",")[0].trim().split(" ").slice(-1)[0];
    const q = `intitle:${encodeURIComponent(clean)}` + (au ? `+inauthor:${encodeURIComponent(au)}` : "");
    const j = await getJson(gb(q, 8) + "&langRestrict=it");
    const byTitle = pick(j?.items ?? []);
    if (byTitle) found = { ...byTitle, ...(found ?? {}), description: found?.description ?? byTitle.description,
      categories: found?.categories ?? byTitle.categories, page_count: found?.page_count ?? byTitle.page_count,
      language: found?.language ?? byTitle.language };
  }
  if (!found) return null;
  return { description: found.description, categories: found.categories, page_count: found.page_count, language: found.language };
}
