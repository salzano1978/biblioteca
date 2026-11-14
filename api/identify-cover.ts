import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  // Solo utenti loggati possono usare (e far pagare) l'API
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  const who = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.VITE_SUPABASE_ANON_KEY! },
  });
  if (!who.ok) return res.status(401).send("Non autorizzato");

  const { image } = req.body ?? {};
  if (!image || typeof image !== "string" || image.length > 4_000_000) return res.status(400).send("Immagine non valida");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            {
              type: "text",
              text: 'Questa è la copertina di un libro. Rispondi SOLO con JSON: {"title": "...", "authors": "..."} usando il titolo esatto e l\'autore scritti in copertina. Se non riesci a leggerli, usa stringhe vuote.',
            },
          ],
        },
      ],
    }),
  });
  if (!r.ok) return res.status(502).send("Errore dal servizio di riconoscimento");
  const j: any = await r.json();
  const text: string = j.content?.[0]?.text ?? "{}";
  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return res.json({ title: parsed.title || undefined, authors: parsed.authors || undefined });
  } catch {
    return res.json({});
  }
}
