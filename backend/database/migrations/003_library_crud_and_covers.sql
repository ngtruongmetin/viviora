ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;

CREATE OR REPLACE FUNCTION sync_library_collection_total_books()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE library_collections SET total_books = total_books + 1 WHERE id = NEW.collection_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE library_collections SET total_books = GREATEST(total_books - 1, 0) WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;

  IF NEW.collection_id IS DISTINCT FROM OLD.collection_id THEN
    UPDATE library_collections SET total_books = GREATEST(total_books - 1, 0) WHERE id = OLD.collection_id;
    UPDATE library_collections SET total_books = total_books + 1 WHERE id = NEW.collection_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS books_sync_collection_total ON books;
CREATE TRIGGER books_sync_collection_total
  AFTER INSERT OR DELETE OR UPDATE OF collection_id ON books
  FOR EACH ROW EXECUTE FUNCTION sync_library_collection_total_books();

UPDATE library_collections c
SET total_books = (
  SELECT COUNT(*)::int FROM books b WHERE b.collection_id = c.id
);
