-- Esegui UNA VOLTA nello SQL Editor di Supabase, PRIMA di pubblicare la nuova versione dell'app.
alter table books add column if not exists read_status text
  check (read_status in ('da_leggere','in_lettura','letto'));   -- stato di lettura
alter table books add column if not exists rating smallint
  check (rating between 1 and 5);                                -- voto personale 1-5
alter table books add column if not exists loaned_to text;       -- a chi e' prestato
alter table books add column if not exists loaned_at date;       -- da quando
