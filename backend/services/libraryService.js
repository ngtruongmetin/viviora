const crypto = require('node:crypto');
const { all, get, pool } = require('../database/db');

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function pagination(query, defaultLimit = 12, maxLimit = 30) {
  const page = positiveInteger(query.page, 1, 1000000);
  const limit = positiveInteger(query.limit, defaultLimit, maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

function collectionSummaryColumns(alias = 'c') {
  return `
    ${alias}.*,
    (SELECT COUNT(DISTINCT lower(b.author))::int FROM books b WHERE b.collection_id=${alias}.id AND b.author IS NOT NULL) AS author_count`;
}

function normalizeCollection(row) {
  if (!row) return null;
  return {
    ...row,
    total_books: Number(row.total_books || 0),
    author_count: Number(row.author_count || 0),
  };
}

async function listCollections(query = {}) {
  const { page, limit, offset } = pagination(query);
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : '';
  const where = search ? "WHERE c.name ILIKE ? OR coalesce(c.description, '') ILIKE ?" : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const count = await get(
    `SELECT COUNT(*)::int AS count FROM library_collections c ${where}`,
    params,
  );
  const statistics = await get(
    `
    SELECT
      COUNT(*)::int AS collection_count,
      COALESCE(SUM(c.total_books), 0)::int AS book_count,
      (SELECT COUNT(DISTINCT lower(b.author))::int FROM books b WHERE b.author IS NOT NULL) AS author_count,
      MAX(c.updated_at) AS last_updated_at
    FROM library_collections c ${where}`,
    params,
  );
  const items = await all(
    `SELECT ${collectionSummaryColumns('c')}, u.name AS created_by_name
     FROM library_collections c
     LEFT JOIN users u ON u.id=c.created_by
     ${where}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return {
    items: items.map(normalizeCollection),
    pagination: { page, limit, total: Number(count.count) },
    statistics: {
      collection_count: Number(statistics.collection_count || 0),
      book_count: Number(statistics.book_count || 0),
      author_count: Number(statistics.author_count || 0),
      last_updated_at: statistics.last_updated_at,
    },
  };
}

async function getCollection(collectionId) {
  const row = await get(
    `SELECT ${collectionSummaryColumns('c')}, u.name AS created_by_name
     FROM library_collections c
     LEFT JOIN users u ON u.id=c.created_by
     WHERE c.id=?`,
    [collectionId],
  );
  return normalizeCollection(row);
}

function buildBookWhere(collectionId, query) {
  const clauses = ['b.collection_id=?'];
  const params = [collectionId];
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : '';
  const category = typeof query.category === 'string' ? query.category.trim().slice(0, 120) : '';
  if (search) {
    clauses.push(
      "(b.title ILIKE ? OR coalesce(b.author, '') ILIKE ? OR coalesce(b.publisher, '') ILIKE ?)",
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    clauses.push('b.category=?');
    params.push(category);
  }
  return { where: clauses.join(' AND '), params };
}

async function listCollectionBooks(collectionId, query = {}, viewerId = null) {
  const { page, limit, offset } = pagination(query, 18, 48);
  const { where, params } = buildBookWhere(collectionId, query);
  const count = await get(`SELECT COUNT(*)::int AS count FROM books b WHERE ${where}`, params);
  const viewerParam = viewerId || null;
  const items = await all(
    `SELECT b.*, EXISTS(SELECT 1 FROM user_bookmarks ub WHERE ub.user_id=? AND ub.book_id=b.id) AS is_bookmarked,
       (COUNT(DISTINCT CASE WHEN p.type='BOOK_REVIEW' AND p.status='APPROVED' THEN p.id END) + COUNT(DISTINCT g.id))::int AS trending_score
     FROM books b LEFT JOIN user_bookmarks ub ON ub.user_id=? AND ub.book_id=b.id
       LEFT JOIN post_library_books plb ON plb.book_id=b.id LEFT JOIN posts p ON p.id=plb.post_id LEFT JOIN games g ON g.book_id=b.id
     WHERE ${where}
     GROUP BY b.id, ub.id
     ORDER BY (ub.id IS NOT NULL) DESC, trending_score DESC, lower(b.title) ASC, b.id ASC LIMIT ? OFFSET ?`,
    [viewerParam, viewerParam, ...params, limit, offset],
  );
  return { items, pagination: { page, limit, total: Number(count.count) } };
}

async function listCollectionCategories(collectionId) {
  return all(
    `SELECT category, COUNT(*)::int AS total
     FROM books WHERE collection_id=? AND category IS NOT NULL
     GROUP BY category ORDER BY lower(category) ASC`,
    [collectionId],
  );
}

async function searchBooks(query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : '';
  const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 30);
  if (!search)
    return all(
      `SELECT b.id, b.collection_id, b.title, b.author, b.publisher, b.category, b.cover_url,
            c.name AS collection_name
     FROM books b JOIN library_collections c ON c.id=b.collection_id
     ORDER BY lower(b.title) ASC, b.id ASC LIMIT ?`,
      [limit],
    );
  return all(
    `SELECT b.id, b.collection_id, b.title, b.author, b.publisher, b.category, b.cover_url,
            c.name AS collection_name
     FROM books b JOIN library_collections c ON c.id=b.collection_id
     WHERE b.title ILIKE ? OR coalesce(b.author, '') ILIKE ? OR coalesce(b.publisher, '') ILIKE ?
     ORDER BY lower(b.title) ASC, b.id ASC LIMIT ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, limit],
  );
}

async function searchGames(search = '', userId = null) {
  const term = String(search || '').trim().slice(0, 120);
  const like = `%${term}%`;
  return all(`SELECT g.id, g.title, g.description, g.question_type, g.question_count, g.reward_cups,
      ${userId ? "EXISTS(SELECT 1 FROM user_game_rewards ugr WHERE ugr.game_id=g.id AND ugr.user_id=? AND ugr.earned_on=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)" : 'FALSE'} AS cup_earned_today,
      b.id AS book_id, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url
    FROM games g JOIN books b ON b.id=g.book_id
    WHERE g.title ILIKE ? OR COALESCE(g.description,'') ILIKE ? OR b.title ILIKE ?
    ORDER BY lower(g.title), g.id LIMIT 12`, userId ? [userId, like, like, like] : [like, like, like]);
}

async function recordBookSearch(userId, query, books) {
  if (!userId || !query || !books?.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const book of books)
      await client.query(
        `INSERT INTO user_book_searches(id,user_id,book_id,query) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,book_id) DO UPDATE SET query=EXCLUDED.query, created_at=CURRENT_TIMESTAMP`,
        [crypto.randomUUID(), userId, book.id, query],
      );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function trendingBooks(requestedLimit = 10) {
  const limit = Math.min(Math.max(Number(requestedLimit) || 10, 1), 100);
  const rows = await all(
    `
    SELECT b.id, b.title, b.author,
      COUNT(DISTINCT CASE WHEN p.type='BOOK_REVIEW' AND p.status='APPROVED' THEN p.id END)::int AS review_count,
      COUNT(DISTINCT g.id)::int AS game_count,
      MAX(CASE WHEN p.type='BOOK_REVIEW' AND p.status='APPROVED' THEN p.created_at END) AS latest_review_at,
      MAX(CASE WHEN g.id IS NOT NULL THEN g.updated_at END) AS latest_game_at
    FROM books b
    LEFT JOIN post_library_books plb ON plb.book_id=b.id
    LEFT JOIN posts p ON p.id=plb.post_id
    LEFT JOIN games g ON g.book_id=b.id
    GROUP BY b.id
    HAVING COUNT(DISTINCT CASE WHEN p.type='BOOK_REVIEW' AND p.status='APPROVED' THEN p.id END) > 0
      OR COUNT(DISTINCT g.id) > 0
      OR NULLIF(b.cover_url, '') IS NOT NULL
    ORDER BY COUNT(DISTINCT g.id) DESC,
      COUNT(DISTINCT CASE WHEN p.type='BOOK_REVIEW' AND p.status='APPROVED' THEN p.id END) DESC,
      (NULLIF(b.cover_url, '') IS NOT NULL) DESC,
      GREATEST(COALESCE(MAX(CASE WHEN p.type='BOOK_REVIEW' AND p.status='APPROVED' THEN p.created_at END), TIMESTAMPTZ '1970-01-01'), COALESCE(MAX(CASE WHEN g.id IS NOT NULL THEN g.updated_at END), TIMESTAMPTZ '1970-01-01')) DESC,
      lower(b.title), b.id
    LIMIT ?`,
    [limit],
  );
  return rows.map(({ id, title, author }) => ({ id, title, author }));
}

async function getBook(bookId) {
  return get(
    `SELECT b.*, c.name AS collection_name, c.description AS collection_description
     FROM books b JOIN library_collections c ON c.id=b.collection_id
     WHERE b.id=?`,
    [bookId],
  );
}

async function getBookForUser(bookId, userId) {
  const book = await getBook(bookId);
  if (!book) return null;
  if (!userId)
    return {
      ...book,
      is_favorite: false,
      is_bookmarked: false,
      reading_status: null,
      progress: 0,
      minutes: 0,
    };
  const state = await get(
    `SELECT EXISTS(SELECT 1 FROM user_favorite_books WHERE user_id=? AND book_id=?) AS is_favorite, EXISTS(SELECT 1 FROM user_bookmarks WHERE user_id=? AND book_id=?) AS is_bookmarked, rp.status AS reading_status, COALESCE(rp.progress,0)::int AS progress, COALESCE(rp.minutes,0)::int AS minutes FROM (SELECT 1) s LEFT JOIN reading_progress rp ON rp.user_id=? AND rp.book_id=?`,
    [userId, bookId, userId, bookId, userId, bookId],
  );
  return { ...book, ...state };
}

async function listMyLibrary(userId, query = {}) {
  const { page, limit, offset } = pagination(query, 24, 48);
  const clauses = ['(uf.id IS NOT NULL OR ub.id IS NOT NULL)'];
  const params = [];
  if (query.status && ['WANT_TO_READ', 'READING', 'COMPLETED'].includes(query.status)) {
    clauses.push('rp.status=?');
    params.push(query.status);
  }
  if (String(query.favorite) === 'true') clauses.push('uf.id IS NOT NULL');
  if (String(query.favorite) === 'false') clauses.push('uf.id IS NULL');
  if (String(query.bookmarked) === 'true') clauses.push('ub.id IS NOT NULL');
  if (String(query.bookmarked) === 'false') clauses.push('ub.id IS NULL');
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : '';
  if (search) {
    clauses.push("(b.title ILIKE ? OR COALESCE(b.author,'') ILIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const from = `FROM books b LEFT JOIN reading_progress rp ON rp.book_id=b.id AND rp.user_id=? LEFT JOIN user_favorite_books uf ON uf.book_id=b.id AND uf.user_id=? LEFT JOIN user_bookmarks ub ON ub.book_id=b.id AND ub.user_id=? JOIN library_collections c ON c.id=b.collection_id`;
  const base = [userId, userId, userId];
  const where = clauses.join(' AND ');
  const count = await get(`SELECT COUNT(*)::int AS count ${from} WHERE ${where}`, [
    ...base,
    ...params,
  ]);
  const items = await all(
    `SELECT b.*, c.name AS collection_name, (uf.id IS NOT NULL) AS is_favorite, (ub.id IS NOT NULL) AS is_bookmarked, rp.status AS reading_status, COALESCE(rp.progress,0)::int AS progress, COALESCE(rp.minutes,0)::int AS minutes ${from} WHERE ${where} ORDER BY COALESCE(rp.updated_at, b.updated_at) DESC, lower(b.title) LIMIT ? OFFSET ?`,
    [...base, ...params, limit, offset],
  );
  return { items, pagination: { page, limit, total: Number(count.count) } };
}

async function setBookFlag(userId, bookId, type, enabled) {
  if (!(await getBook(bookId))) return null;
  const table = type === 'favorite' ? 'user_favorite_books' : 'user_bookmarks';
  if (enabled)
    await pool.query(
      `INSERT INTO ${table}(id,user_id,book_id) VALUES($1,$2,$3) ON CONFLICT(user_id,book_id) DO NOTHING`,
      [crypto.randomUUID(), userId, bookId],
    );
  else await pool.query(`DELETE FROM ${table} WHERE user_id=$1 AND book_id=$2`, [userId, bookId]);
  if (type === 'bookmark' && enabled)
    await pool.query(
      `INSERT INTO reading_progress(id,user_id,book_id,status) VALUES($1,$2,$3,'WANT_TO_READ') ON CONFLICT(user_id,book_id) DO UPDATE SET status=CASE WHEN reading_progress.status='COMPLETED' THEN reading_progress.status ELSE 'WANT_TO_READ' END, updated_at=CURRENT_TIMESTAMP`,
      [crypto.randomUUID(), userId, bookId],
    );
  return getBookForUser(bookId, userId);
}

async function setReadingStatus(userId, bookId, status, progress = 0, minutes = 0) {
  if (!(await getBook(bookId))) return null;
  await pool.query(
    `INSERT INTO reading_progress(id,user_id,book_id,status,progress,minutes) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,book_id) DO UPDATE SET status=EXCLUDED.status, progress=EXCLUDED.progress, minutes=EXCLUDED.minutes, updated_at=CURRENT_TIMESTAMP`,
    [crypto.randomUUID(), userId, bookId, status, status === 'COMPLETED' ? 100 : progress, minutes],
  );
  return getBookForUser(bookId, userId);
}

async function createCollection({ name, description, createdBy }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO library_collections(id, name, description, imported_file_name, total_books, created_by)
     VALUES($1, $2, $3, $4, 0, $5)`,
    [id, name, description || null, 'manual-entry', createdBy],
  );
  return getCollection(id);
}

async function updateCollection(collectionId, { name, description }) {
  const result = await pool.query(
    'UPDATE library_collections SET name=$1, description=$2 WHERE id=$3 RETURNING id',
    [name, description || null, collectionId],
  );
  return result.rowCount ? getCollection(collectionId) : null;
}

async function deleteCollection(collectionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const covers = await client.query('SELECT cover_url FROM books WHERE collection_id=$1', [
      collectionId,
    ]);
    const deleted = await client.query('DELETE FROM library_collections WHERE id=$1 RETURNING id', [
      collectionId,
    ]);
    if (!deleted.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('COMMIT');
    return covers.rows.map((row) => row.cover_url).filter(Boolean);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createBook(collectionId, fields) {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO books(id, collection_id, title, author, publisher, publication_year, price, category, cutter, cover_url)
     SELECT $1, id, $2, $3, $4, $5, $6, $7, $8, $9 FROM library_collections WHERE id=$10
     RETURNING id`,
    [
      id,
      fields.title,
      fields.author,
      fields.publisher,
      fields.publicationYear,
      fields.price,
      fields.category,
      fields.cutter,
      fields.coverUrl || null,
      collectionId,
    ],
  );
  return result.rowCount ? getBook(id) : null;
}

async function updateBook(bookId, fields) {
  const result = await pool.query(
    `UPDATE books SET title=$1, author=$2, publisher=$3, publication_year=$4, price=$5, category=$6, cutter=$7, cover_url=$8
     WHERE id=$9 RETURNING id`,
    [
      fields.title,
      fields.author,
      fields.publisher,
      fields.publicationYear,
      fields.price,
      fields.category,
      fields.cutter,
      fields.coverUrl || null,
      bookId,
    ],
  );
  return result.rowCount ? getBook(bookId) : null;
}

async function updateBookCover(bookId, coverUrl) {
  const result = await pool.query('UPDATE books SET cover_url=$1 WHERE id=$2 RETURNING id', [
    coverUrl,
    bookId,
  ]);
  return result.rowCount ? getBook(bookId) : null;
}

async function deleteBook(bookId) {
  const result = await pool.query('DELETE FROM books WHERE id=$1 RETURNING cover_url', [bookId]);
  return result.rowCount ? result.rows[0] : null;
}

async function createCollectionFromImport({ collection, books, userId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const collectionId = crypto.randomUUID();
    await client.query(
      `INSERT INTO library_collections(id, name, description, imported_file_name, total_books, created_by)
       VALUES($1, $2, $3, $4, 0, $5)`,
      [
        collectionId,
        collection.name,
        collection.description || null,
        collection.importedFileName,
        userId,
      ],
    );
    const batchSize = 500;
    for (let start = 0; start < books.length; start += batchSize) {
      const batch = books.slice(start, start + batchSize);
      const values = [];
      const placeholders = batch.map((book, rowIndex) => {
        const offset = rowIndex * 10;
        values.push(
          crypto.randomUUID(),
          collectionId,
          book.title,
          book.author,
          book.publisher,
          book.publication_year,
          book.price,
          book.category,
          book.cutter,
          book.cover_url || null,
        );
        return `(${Array.from({ length: 10 }, (_, index) => `$${offset + index + 1}`).join(', ')})`;
      });
      await client.query(
        `INSERT INTO books(id, collection_id, title, author, publisher, publication_year, price, category, cutter, cover_url)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }
    await client.query('COMMIT');
    return getCollection(collectionId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createBook,
  createCollection,
  createCollectionFromImport,
  deleteBook,
  deleteCollection,
  getBook,
  getBookForUser,
  listMyLibrary,
  getCollection,
  listCollectionBooks,
  listCollectionCategories,
  listCollections,
  searchBooks,
  searchGames,
  recordBookSearch,
  setBookFlag,
  setReadingStatus,
  trendingBooks,
  updateBook,
  updateBookCover,
  updateCollection,
};
