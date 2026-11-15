export interface Book {
  id: string;
  library_id: string;
  isbn: string | null;
  title: string;
  authors: string | null;
  publisher: string | null;
  year: string | null;
  cover_url: string | null;
  location: string | null;
  notes: string | null;
  description: string | null;
  categories: string | null;
  page_count: number | null;
  language: string | null;
  created_at: string;
}
export type Draft = Partial<Omit<Book, "id" | "library_id" | "created_at">>;
export interface Library { id: string; name: string; invite_code: string }
