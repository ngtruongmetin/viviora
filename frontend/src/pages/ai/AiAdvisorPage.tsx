import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, MessageSquarePlus, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiApi, type AiConversation, type AiConversationDetail } from '../../services/domain';
import type { Book } from '../../types/models';

const prompts = ['Tôi chưa biết chọn sách nào', 'Tôi muốn đọc để thư giãn', 'Tìm truyện phiêu lưu phù hợp', 'Sách của Nguyễn Nhật Ánh'];
export function AiAdvisorPage() {
  const client = useQueryClient(); const [activeId, setActiveId] = useState<string>(); const [input, setInput] = useState(''); const [streaming, setStreaming] = useState(false); const [draft, setDraft] = useState(''); const [books, setBooks] = useState<Book[]>([]); const [pendingUser, setPendingUser] = useState('');
  const conversations = useQuery({ queryKey: ['ai-conversations'], queryFn: () => aiApi.conversations().then((r) => r.data.items) });
  useEffect(() => { if (!activeId && conversations.data?.[0]) setActiveId(conversations.data[0].id); }, [activeId, conversations.data]);
  const current = useQuery({ queryKey: ['ai-conversation', activeId], queryFn: () => aiApi.conversation(activeId!).then((r) => r.data.data), enabled: Boolean(activeId) });
  const create = useMutation({ mutationFn: () => aiApi.createConversation().then((r) => r.data.data), onSuccess: (item) => { setActiveId(item.id); client.invalidateQueries({ queryKey: ['ai-conversations'] }); } });
  const remove = useMutation({ mutationFn: (id: string) => aiApi.deleteConversation(id), onSuccess: (_response, id) => { client.setQueryData<AiConversation[]>(['ai-conversations'], (items) => items?.filter((item) => item.id !== id)); client.removeQueries({ queryKey: ['ai-conversation', id] }); if (activeId === id) setActiveId(undefined); } });
  const send = async () => {
    const content = input.trim(); if (!content || streaming) return;
    let id = activeId; if (!id) { const item = await create.mutateAsync(); id = item.id; }
    setInput(''); setPendingUser(content); setDraft(''); setBooks([]); setStreaming(true);
    try {
      await aiApi.streamMessage(id, content, (type, raw) => {
        const data = raw as { delta?: string; books?: Book[]; message?: string };
        if (type === 'delta') setDraft((value) => value + (data.delta || ''));
        if (type === 'books') setBooks(data.books || []);
        if (type === 'error') toast.error(data.message || 'AI không thể trả lời lúc này.');
      });
      await Promise.all([client.invalidateQueries({ queryKey: ['ai-conversation', id] }), client.invalidateQueries({ queryKey: ['ai-conversations'] })]);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể gửi câu hỏi.'); } finally { setStreaming(false); setPendingUser(''); setDraft(''); setBooks([]); }
  };
  const detail = activeId ? current.data as AiConversationDetail | undefined : undefined;
  return <div className="ai-advisor-page">
    <section className="ai-hero"><div><span className="eyebrow">VIVIORA AI BOOK BOT</span><h1>TRỢ LÝ TƯ VẤN SÁCH</h1><p>Hỏi theo sở thích hoặc chủ đề. Viviora AI chỉ gợi ý những đầu sách đang có trong thư viện.</p></div><Bot size={70} /></section>
    <div className="ai-advisor-layout">
      <aside className="ai-history"><button className="button primary" onClick={() => create.mutate()}><MessageSquarePlus size={17} /> CUỘC TƯ VẤN MỚI</button><div className="ai-history-list">{conversations.data?.map((item) => <button key={item.id} className={item.id === activeId ? 'active' : ''} onClick={() => setActiveId(item.id)}><span>{item.title}</span><i onClick={(event) => { event.stopPropagation(); remove.mutate(item.id); }} title="Xóa cuộc trò chuyện"><Trash2 size={15} /></i></button>)}</div></aside>
      <section className="ai-chat"><div className="ai-chat-head"><strong>{detail?.title || 'Bắt đầu tư vấn'}</strong><span>CATALOG LIVE</span></div><div className="ai-message-list">
        {!detail?.messages.length && !streaming && <div className="ai-empty"><Bot size={30} /><p>Kể cho Viviora AI mục đích đọc, tâm trạng hoặc thể loại bạn thích. Nếu chưa biết chọn gì, AI sẽ hỏi vài câu để tư vấn.</p></div>}
        {detail?.messages.map((message) => <article className={`ai-message ${message.role}`} key={message.id}><b>{message.role === 'user' ? 'BẠN' : 'VIVIORA AI'}</b><MarkdownMessage content={message.content} />{message.role === 'assistant' && message.recommended_books?.length ? <BookCards books={message.recommended_books.filter(Boolean)} /> : null}</article>)}
        {pendingUser && <article className="ai-message user pending"><b>BẠN</b><MarkdownMessage content={pendingUser} /></article>}
        {streaming && <article className="ai-message assistant"><b>VIVIORA AI</b><MarkdownMessage content={draft || 'Đang tìm trong thư viện...'} />{books.length > 0 && <BookCards books={books} />}</article>}
      </div><div className="ai-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div><div className="ai-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Nhập sở thích hoặc chủ đề để tìm sách..." maxLength={1200} /><button className="button primary" disabled={streaming} onClick={() => void send()} title="Gửi câu hỏi"><Send size={19} /></button></div></section>
    </div>
  </div>;
}
function BookCards({ books }: { books: Book[] }) { return <div className="ai-book-cards">{books.map((book) => <Link key={book.id} className={book.cover_url ? 'has-cover' : ''} to={`/thu-vien/sach/${book.id}`}>{book.cover_url && <img className="ai-book-cover" src={book.cover_url} alt="" />}<strong>{book.title}</strong><small>{book.author || 'Chưa rõ tác giả'}{book.category ? ` · ${book.category}` : ''}{(book.trending_score || 0) > 0 ? ' · THỊNH HÀNH' : ''}</small></Link>)}</div>; }
function MarkdownMessage({ content }: { content: string }) {
  const visibleContent = content.replace(/\s*\(id:\s*[0-9a-f-]{36}\)/gi, '');
  return <div className="ai-message-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{visibleContent}</ReactMarkdown></div>;
}
