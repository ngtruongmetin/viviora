const { all } = require('../database/db');

function roleLabel(role) {
  return role === 'ADMIN' ? 'Thủ thư' : role === 'TEACHER' ? 'Giáo viên' : 'Học sinh';
}

async function listPosts({ viewerId = null, authorId = null, cursor = null, limit = 10 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const params = [viewerId, authorId];
  let where = "p.status='APPROVED' AND ($2::text IS NULL OR p.author_id=$2)";
  if (cursor) {
    where +=
      ' AND (p.created_at < (SELECT created_at FROM posts WHERE id=$3) OR (p.created_at = (SELECT created_at FROM posts WHERE id=$3) AND p.id < $3))';
    params.push(cursor);
  }
  params.push(safeLimit + 1);
  const rows = await all(
    `SELECT p.id, p.author_id AS "authorId", p.type, p.status, p.title, p.content, p.created_at,
            u.name, u.role, u.class_name AS "className", u.specialization, u.avatar_url AS "avatarUrl",
            EXISTS(SELECT 1 FROM reactions own WHERE own.post_id=p.id AND own.user_id=$1) AS liked,
            (SELECT COUNT(*)::int FROM reactions r WHERE r.post_id=p.id) AS "reactionCount",
            (SELECT COUNT(*)::int FROM comments c WHERE c.post_id=p.id) AS "commentCount",
            plb.book_id AS "bookId", plb.book_title AS "bookTitle", plb.book_author AS "bookAuthor",
            plb.book_cover_url AS "bookCoverUrl", plb.book_category AS "bookCategory",
            COALESCE((SELECT json_agg(json_build_object('id', pm.id, 'url', pm.url, 'kind', pm.kind, 'alt', pm.alt) ORDER BY pm.id)
                      FROM post_media pm WHERE pm.post_id=p.id), '[]'::json) AS media,
            po.id AS "pollId", po.question AS "pollQuestion",
            COALESCE((SELECT json_agg(json_build_object('id', opt.id, 'label', opt.label, 'votes', (SELECT COUNT(*)::int FROM poll_votes pv WHERE pv.option_id=opt.id)) ORDER BY opt.position) FROM poll_options opt WHERE opt.poll_id=po.id), '[]'::json) AS "pollOptions"
     FROM posts p JOIN users u ON u.id=p.author_id
     LEFT JOIN post_library_books plb ON plb.post_id=p.id
     LEFT JOIN polls po ON po.post_id=p.id
     WHERE ${where}
     ORDER BY p.created_at DESC, p.id DESC LIMIT $${params.length}`,
    params,
  );
  const hasMore = rows.length > safeLimit;
  const items = rows.slice(0, safeLimit).map((row) => ({
    ...row,
    roleLabel: roleLabel(row.role),
    liked: Boolean(row.liked),
    media: row.media || [],
    book: row.bookTitle
      ? {
          book: {
            id: row.bookId,
            title: row.bookTitle,
            author: row.bookAuthor,
            cover_url: row.bookCoverUrl,
            category: row.bookCategory,
          },
        }
      : undefined,
    poll: row.pollId
      ? {
          id: row.pollId,
          question: row.pollQuestion,
          options: row.pollOptions.map((option) => ({
            id: option.id,
            label: option.label,
            votes: Array.from({ length: option.votes }, (_, index) => ({ id: String(index) })),
          })),
        }
      : undefined,
  }));
  return { items, nextCursor: hasMore ? rows[safeLimit - 1].id : null };
}

module.exports = { listPosts, roleLabel };
