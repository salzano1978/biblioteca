-- Esegui UNA VOLTA nello SQL Editor di Supabase, PRIMA di pubblicare la nuova versione dell'app.
alter table books add column if not exists description text;   -- trama
alter table books add column if not exists categories  text;   -- genere/i, separati da virgola
alter table books add column if not exists page_count  int;    -- numero di pagine
alter table books add column if not exists language    text;   -- es. it, en
