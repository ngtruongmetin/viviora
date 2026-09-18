CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_library_books_title_trgm ON books USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_library_books_author_trgm ON books USING GIN (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_library_books_publisher_trgm ON books USING GIN (publisher gin_trgm_ops);

DROP TRIGGER IF EXISTS books_sync_collection_total ON books;

CREATE OR REPLACE FUNCTION sync_library_collection_total_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE library_collections c
  SET total_books = c.total_books + source.total
  FROM (
    SELECT collection_id, COUNT(*)::int AS total
    FROM new_books
    GROUP BY collection_id
  ) source
  WHERE c.id = source.collection_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_library_collection_total_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE library_collections c
  SET total_books = GREATEST(c.total_books - source.total, 0)
  FROM (
    SELECT collection_id, COUNT(*)::int AS total
    FROM old_books
    GROUP BY collection_id
  ) source
  WHERE c.id = source.collection_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_library_collection_total_after_move()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.collection_id IS DISTINCT FROM OLD.collection_id THEN
    UPDATE library_collections SET total_books = GREATEST(total_books - 1, 0) WHERE id = OLD.collection_id;
    UPDATE library_collections SET total_books = total_books + 1 WHERE id = NEW.collection_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_sync_total_after_insert
  AFTER INSERT ON books
  REFERENCING NEW TABLE AS new_books
  FOR EACH STATEMENT EXECUTE FUNCTION sync_library_collection_total_after_insert();

CREATE TRIGGER books_sync_total_after_delete
  AFTER DELETE ON books
  REFERENCING OLD TABLE AS old_books
  FOR EACH STATEMENT EXECUTE FUNCTION sync_library_collection_total_after_delete();

CREATE TRIGGER books_sync_total_after_move
  AFTER UPDATE OF collection_id ON books
  FOR EACH ROW EXECUTE FUNCTION sync_library_collection_total_after_move();
