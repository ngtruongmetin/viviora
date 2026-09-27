import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Heart, MessageCircle, MoreHorizontal, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { FeedPost } from '../../types/models';
import { feedApi } from '../../services/domain';
import { useAuth } from '../../auth/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { LibraryModal } from '../library/LibraryModal';
import { BookCover } from '../library/BookCover';
import { formatDate } from '../../utils/dateTime';
import { announceAchievement } from '../achievements/AchievementCelebrationProvider';

type CommentItem = { id: string; name: string; avatar_url?: string | null; content: string };

function authorMeta(post: FeedPost) {
  const label =
    post.role === 'ADMIN' ? 'THỦ THƯ' : post.role === 'TEACHER' ? 'GIÁO VIÊN' : 'HỌC SINH';
  const detail =
    post.role === 'TEACHER' ? post.specialization : post.role === 'STUDENT' ? post.className : null;
  return detail && detail.trim().toUpperCase() !== label ? `${label} · ${detail}` : label;
}

type PostCardProps = {
  post: FeedPost;
  variant?: 'feed' | 'moderation';
  actionPending?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
};

export function PostCard({
  post,
  variant = 'feed',
  actionPending = false,
  onApprove,
  onReject,
}: PostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [reactionCount, setReactionCount] = useState(post.reactionCount);
  const menuRef = useRef<HTMLDivElement>(null);
  const canDelete = variant === 'feed' && (user?.id === post.authorId || user?.role === 'ADMIN');
  const band =
    post.type === 'POLL'
      ? 'feed-band-yellow'
      : post.type === 'BOOK_REVIEW'
        ? 'feed-band-red'
        : 'feed-band-purple';

  const reaction = useMutation({
    mutationFn: () => feedApi.react(post.id),
    onSuccess: ({ data }) => {
      setLiked(data.liked);
      setReactionCount(data.reactionCount);
      if (data.achievementEvents) announceAchievement(data.achievementEvents);
      queryClient.setQueryData<{
        pages: Array<{ items: FeedPost[]; nextCursor: string | null }>;
        pageParams: unknown[];
      }>(['feed'], (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === post.id
                    ? { ...item, liked: data.liked, reactionCount: data.reactionCount }
                    : item,
                ),
              })),
            }
          : current,
      );
      queryClient.setQueriesData<FeedPost[]>({ queryKey: ['profile-posts'] }, (current) =>
        current?.map((item) =>
          item.id === post.id
            ? { ...item, liked: data.liked, reactionCount: data.reactionCount }
            : item,
        ),
      );
      queryClient.setQueriesData<{ id: string; posts: FeedPost[] }>(
        { queryKey: ['public-user'] },
        (current) =>
          current
            ? {
                ...current,
                posts:
                  current.posts?.map((item) =>
                    item.id === post.id
                      ? { ...item, liked: data.liked, reactionCount: data.reactionCount }
                      : item,
                  ) || [],
              }
            : current,
      );
    },
    onError: () => toast.error('Không thể cập nhật lượt thích.'),
  });
  const comments = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => feedApi.comments(post.id).then((response) => response.data),
    enabled: commentsOpen,
  });
  const addComment = useMutation({
    mutationFn: () => feedApi.comment(post.id, comment.trim()),
    onSuccess: (response) => {
      setComment('');
      announceAchievement(response.data.achievementEvents);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post-comments', post.id] });
    },
  });
  const remove = useMutation({
    mutationFn: () => feedApi.remove(post.id),
    onSuccess: async () => {
      setDeleteOpen(false);
      toast.success('Đã xóa bài đăng');
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const closeOtherMenus = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== post.id) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    document.addEventListener('viviora-post-menu-open', closeOtherMenus);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      document.removeEventListener('viviora-post-menu-open', closeOtherMenus);
    };
  }, [menuOpen, post.id]);

  const toggleMenu = () => {
    const next = !menuOpen;
    if (next)
      document.dispatchEvent(new CustomEvent('viviora-post-menu-open', { detail: post.id }));
    setMenuOpen(next);
  };

  return (
    <article className="feed-post">
      <header className={`feed-post-band ${band}`}>
        <span>
          {post.type === 'POLL'
            ? 'BÀI ĐĂNG BÌNH CHỌN'
            : post.type === 'BOOK_REVIEW'
              ? 'ĐÁNH GIÁ SÁCH'
              : 'BÀI ĐĂNG'}
        </span>
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
      </header>

      <div className="feed-post-body">
        <div className="feed-post-author">
          <Link to={`/nguoi-dung/${post.authorId}`} className="feed-author-avatar">
            <UserAvatar name={post.name} avatarUrl={post.avatarUrl} />
          </Link>
          <div className="feed-author-copy">
            <Link className="feed-author-name" to={`/nguoi-dung/${post.authorId}`}>
              {post.name}
            </Link>
            <span>{authorMeta(post)}</span>
          </div>
          {canDelete && (
            <div className="feed-post-menu" ref={menuRef}>
              <button type="button" aria-label="Tùy chọn bài đăng" onClick={toggleMenu}>
                <MoreHorizontal size={21} />
              </button>
              {menuOpen && (
                <div className="feed-post-menu-popover">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={15} /> XÓA BÀI
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {post.title && <h2 className="feed-post-title">{post.title}</h2>}
        <p className="feed-post-content">{post.content}</p>

        {post.media?.length ? (
          <div className="feed-post-media">
            {post.media.map((media) => (
              <img key={media.id} src={media.url} alt={media.alt || 'Ảnh trong bài đăng'} />
            ))}
          </div>
        ) : null}

        {post.book && (
          <Link className="feed-book-attachment" to={`/thu-vien/sach/${post.book.book.id}`}>
            <BookCover book={post.book.book} className="feed-book-cover" compact />
            <div className="feed-book-copy">
              <span className="feed-book-label">SÁCH ĐƯỢC ĐÁNH GIÁ</span>
              <h3>{post.book.book.title}</h3>
              <p>{post.book.book.author || 'Chưa rõ tác giả'}</p>
            </div>
          </Link>
        )}

        {post.poll && (
          <div className="feed-poll">
            <h3>{post.poll.question}</h3>
            {post.poll.options.map((option) => (
              <div className="feed-poll-option" key={option.id}>
                <span>{option.label}</span>
                <small>{option.votes.length} lượt chọn</small>
              </div>
            ))}
          </div>
        )}
      </div>

      {variant === 'moderation' ? (
        <div className="feed-post-actions moderation-post-actions">
          <button
            className="moderation-action-reject"
            type="button"
            onClick={onReject}
            disabled={actionPending}
          >
            <X size={20} /> <span>TỪ CHỐI</span>
          </button>
          <button
            className="moderation-action-approve"
            type="button"
            onClick={onApprove}
            disabled={actionPending}
          >
            <Check size={20} /> <span>ĐỒNG Ý</span>
          </button>
        </div>
      ) : (
        <div className="feed-post-actions">
          <button
            className={liked ? 'is-liked' : ''}
            onClick={() => reaction.mutate()}
            disabled={reaction.isPending}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> <span>{reactionCount}</span>
          </button>
          <button onClick={() => setCommentsOpen((value) => !value)}>
            <MessageCircle size={18} /> <span>{post.commentCount}</span>
          </button>
        </div>
      )}

      {commentsOpen && (
        <section className="feed-comments">
          <div className="feed-comments-list">
            {comments.isPending ? (
              <span>Đang tải bình luận...</span>
            ) : comments.data?.items.length ? (
              comments.data.items.map((item: CommentItem) => (
                <div className="feed-comment" key={item.id}>
                  <UserAvatar name={item.name} avatarUrl={item.avatar_url} size="small" />
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <span>Chưa có bình luận.</span>
            )}
          </div>
          <form
            className="feed-comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (comment.trim()) addComment.mutate();
            }}
          >
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Viết bình luận..."
            />
            <button
              className="icon-button"
              type="submit"
              disabled={addComment.isPending}
              aria-label="Gửi bình luận"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      {deleteOpen && (
        <LibraryModal title="XÓA BÀI ĐĂNG?" onClose={() => setDeleteOpen(false)}>
          <p>Hành động này sẽ xóa bài đăng và dữ liệu liên quan. Không thể hoàn tác.</p>
          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={() => setDeleteOpen(false)}>
              HỦY
            </button>
            <button
              className="button danger"
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 size={16} /> XÓA BÀI
            </button>
          </div>
        </LibraryModal>
      )}
    </article>
  );
}
