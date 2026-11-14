# 📚 La nostra libreria

Catalogo familiare dei libri: scanner ISBN, riconoscimento copertina (Claude), posizione per scaffale, ricerca.

## 1. Supabase (database + login) — gratis
1. Crea un progetto su https://supabase.com
2. SQL Editor → incolla ed esegui `supabase/schema.sql`
3. (Consigliato) Authentication → Providers → Email → disattiva "Confirm email" per semplificare il login in famiglia
4. Project Settings → API: copia **Project URL** e **anon public key**

## 2. Vercel (hosting HTTPS, necessario per la fotocamera) — gratis
1. Carica questa cartella su un repo GitHub
2. https://vercel.com → Add New Project → importa il repo (preset Vite, rilevato da solo)
3. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (da https://console.anthropic.com — serve solo per il riconoscimento copertina; costa pochi centesimi ogni 100 foto)
4. Deploy. Poi dal telefono: apri il sito → "Aggiungi a Home" per averla come app.

## Uso in famiglia
Il primo utente crea la libreria; nel menu "⋯" trova il **codice invito** da dare agli altri, che si registrano e scelgono "Entra".

## Sviluppo locale
```
cp .env.example .env.local   # compila i valori
npm run dev                  # l'API /api/identify-cover funziona con `npx vercel dev`
```
