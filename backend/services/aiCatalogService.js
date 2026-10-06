const { all, get } = require('../database/db');

function clean(value, limit = 120) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

const popularityJoins = `
  LEFT JOIN (SELECT book_id, COUNT(*)::int AS game_count FROM games GROUP BY book_id) gs ON gs.book_id=b.id
  LEFT JOIN (
    SELECT plb.book_id, COUNT(DISTINCT p.id)::int AS review_count
    FROM post_library_books plb JOIN posts p ON p.id=plb.post_id
    WHERE p.type='BOOK_REVIEW' AND p.status='APPROVED'
    GROUP BY plb.book_id
  ) rs ON rs.book_id=b.id
  LEFT JOIN (
    SELECT book_id, COUNT(DISTINCT user_id)::int AS reader_count
    FROM reading_progress GROUP BY book_id
  ) readers ON readers.book_id=b.id`;

const popularityColumns = `
  COALESCE(gs.game_count, 0)::int AS game_count,
  COALESCE(rs.review_count, 0)::int AS review_count,
  COALESCE(readers.reader_count, 0)::int AS reader_count,
  (COALESCE(gs.game_count, 0) * 100 + COALESCE(rs.review_count, 0) * 10 + COALESCE(readers.reader_count, 0) * 3)::int AS trending_score`;

async function searchCatalog({ query, category, author, limit = 8, userId }) {
  const term = clean(query);
  const clauses = [];
  const params = [userId || null, userId || null, userId || null];
  if (term) {
    clauses.push(`(b.title ILIKE ? OR COALESCE(b.author,'') ILIKE ? OR COALESCE(b.publisher,'') ILIKE ? OR COALESCE(b.category,'') ILIKE ? OR similarity(b.title, ?) > 0.18)`);
    const like = `%${term}%`;
    params.push(like, like, like, like, term);
  }
  if (clean(category)) { clauses.push('b.category ILIKE ?'); params.push(`%${clean(category)}%`); }
  if (clean(author)) { clauses.push('b.author ILIKE ?'); params.push(`%${clean(author)}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(Math.min(Math.max(Number(limit) || 8, 1), 8));
  return all(
    `SELECT b.id, b.title, b.author, b.publisher, b.publication_year, b.category, b.cover_url,
      c.name AS collection_name,
      EXISTS(SELECT 1 FROM user_bookmarks ub WHERE ub.user_id=? AND ub.book_id=b.id) AS is_bookmarked,
      EXISTS(SELECT 1 FROM user_favorite_books uf WHERE uf.user_id=? AND uf.book_id=b.id) AS is_favorite,
      COALESCE(rp.status, '') AS reading_status,
      ${popularityColumns}
     FROM books b
     JOIN library_collections c ON c.id=b.collection_id
     LEFT JOIN reading_progress rp ON rp.user_id=? AND rp.book_id=b.id
     ${popularityJoins}
     ${where}
     ORDER BY trending_score DESC, is_bookmarked DESC, lower(b.title) ASC
     LIMIT ?`,
    params,
  );
}

async function getBookDetail(bookId, userId) {
  return get(
    `SELECT b.id, b.title, b.author, b.publisher, b.publication_year, b.category, b.cutter, b.cover_url,
      c.name AS collection_name,
      EXISTS(SELECT 1 FROM user_bookmarks ub WHERE ub.user_id=? AND ub.book_id=b.id) AS is_bookmarked,
      EXISTS(SELECT 1 FROM user_favorite_books uf WHERE uf.user_id=? AND uf.book_id=b.id) AS is_favorite,
      COALESCE(rp.status, '') AS reading_status,
      ${popularityColumns}
     FROM books b
     JOIN library_collections c ON c.id=b.collection_id
     LEFT JOIN reading_progress rp ON rp.user_id=? AND rp.book_id=b.id
     ${popularityJoins}
     WHERE b.id=?`,
    [userId, userId, userId, bookId],
  );
}

module.exports = { getBookDetail, searchCatalog };
