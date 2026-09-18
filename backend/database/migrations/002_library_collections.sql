DO $$
BEGIN
  IF to_regclass('public.community_books') IS NULL AND to_regclass('public.books') IS NOT NULL THEN
    ALTER TABLE books RENAME TO community_books;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS library_collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  imported_file_name TEXT NOT NULL,
  total_books INTEGER NOT NULL DEFAULT 0 CHECK (total_books >= 0),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES library_collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  publication_year INTEGER CHECK (publication_year BETWEEN 1000 AND 3000),
  price NUMERIC(14, 2) CHECK (price >= 0),
  category TEXT,
  cutter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_library_collections_created_at
  ON library_collections(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_library_collections_name
  ON library_collections(lower(name));
CREATE INDEX IF NOT EXISTS idx_library_books_collection
  ON books(collection_id, title, id);
CREATE INDEX IF NOT EXISTS idx_library_books_collection_category
  ON books(collection_id, category, publication_year);
CREATE INDEX IF NOT EXISTS idx_library_books_search
  ON books USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(publisher, '')));

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS library_collections_set_updated_at ON library_collections;
CREATE TRIGGER library_collections_set_updated_at
  BEFORE UPDATE ON library_collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS library_books_set_updated_at ON books;
CREATE TRIGGER library_books_set_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
