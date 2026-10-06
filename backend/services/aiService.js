const crypto = require('node:crypto');
const { all, get, pool } = require('../database/db');
const { decrypt, encrypt } = require('./aiCrypto');
const catalog = require('./aiCatalogService');
const provider = require('./openAiCompatibleProvider');

const DEFAULT_PROMPT = 'Ban la Tro ly tu van sach Viviora. Chi gioi thieu sach co trong du lieu catalog duoc cung cap. Khong tu tao tua sach, tac gia, noi dung, so trang hay thong tin khong co trong du lieu. Neu khong co ket qua phu hop, hay noi ro thu vien chua co du lieu phu hop va goi y tu khoa tim kiem khac. Tra loi ngan gon, than thien bang tieng Viet.';
const ADVISOR_POLICY = `You are a reading advisor, not only a catalog search box. First identify the user's intent. For broad or undecided requests such as "I do not know what to read", ask one or two concise follow-up questions about reading goal, preferred mood or genre, and difficulty instead of recommending a book immediately. Use prior conversation answers to personalize later recommendations. For an explicit title, author, topic, or genre request, use the catalog candidates to advise. Do not recommend books for greetings, identity questions, or general questions about Viviora. Keep answers in Vietnamese and use Markdown naturally.`;
const tools = [{ type: 'function', function: { name: 'search_catalog', description: 'Tim sach trong thu vien Viviora theo tu khoa, the loai hoac tac gia.', parameters: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string' }, author: { type: 'string' } }, required: ['query'] } } }, { type: 'function', function: { name: 'get_book_detail', description: 'Lay metadata chi tiet mot sach theo id.', parameters: { type: 'object', properties: { book_id: { type: 'string' } }, required: ['book_id'] } } }];

function publicConfig(row) {
  return { provider: row.provider, baseUrl: row.base_url, model: row.model, temperature: Number(row.temperature), maxTokens: row.max_tokens, systemPrompt: row.system_prompt, isEnabled: row.is_enabled, hasCredential: Boolean(row.credential_ciphertext), credentialHint: row.credential_ciphertext ? 'Da cau hinh' : 'Chua cau hinh', updatedAt: row.updated_at };
}
async function config() { return get('SELECT * FROM ai_settings WHERE id=?', ['default']); }
async function getPublicConfig() { return publicConfig(await config()); }
async function updateConfig(input, userId) {
  const current = await config();
  const values = {
    provider: input.provider || current.provider,
    baseUrl: input.baseUrl || current.base_url,
    model: input.model || current.model,
    temperature: input.temperature ?? Number(current.temperature),
    maxTokens: input.maxTokens ?? current.max_tokens,
    systemPrompt: input.systemPrompt || current.system_prompt || DEFAULT_PROMPT,
    isEnabled: input.isEnabled ?? current.is_enabled,
  };
  let secured = { ciphertext: current.credential_ciphertext, iv: current.credential_iv, tag: current.credential_tag };
  if (input.apiKey) secured = encrypt(input.apiKey);
  if (input.clearCredential) secured = { ciphertext: null, iv: null, tag: null };
  await pool.query(`UPDATE ai_settings SET provider=$1, base_url=$2, model=$3, temperature=$4, max_tokens=$5, system_prompt=$6, is_enabled=$7, credential_ciphertext=$8, credential_iv=$9, credential_tag=$10, updated_by=$11, updated_at=CURRENT_TIMESTAMP WHERE id='default'`, [values.provider, values.baseUrl, values.model, values.temperature, values.maxTokens, values.systemPrompt, values.isEnabled, secured.ciphertext, secured.iv, secured.tag, userId]);
  return getPublicConfig();
}
async function configWithKey() {
  const value = await config();
  const apiKey = decrypt(value);
  if (!apiKey) { const error = new Error('AI chưa được cấu hình khóa truy cập.'); error.code = 'AI_NOT_CONFIGURED'; throw error; }
  return { ...value, apiKey };
}
async function usableConfig() {
  const value = await configWithKey();
  if (!value.is_enabled) { const error = new Error('AI hiện chưa được bật.'); error.code = 'AI_DISABLED'; throw error; }
  return value;
}
function citedBookIds(content) {
  return new Set(
    [...String(content || '').matchAll(/\bid\s*:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi)].map((match) => match[1].toLowerCase()),
  );
}
function shouldDisplayBook(content, book) {
  return citedBookIds(content).has(String(book.id).toLowerCase());
}
function isTrendingIntent(text) {
  return /thịnh\s*hành|phổ\s*biến|nhiều\s*người\s*đọc|được\s*đọc\s*nhiều|đang\s*hot|sách\s*hot|có\s*trò\s*chơi/i.test(String(text || ''));
}
function retrievalQuery(text) {
  return String(text || '')
    .replace(/^\s*(?:tìm|gợi ý|giới thiệu|cho tôi|mình muốn tìm)\s+(?:cuốn\s+)?(?:sách\s+)?(?:của\s+)?/i, '')
    .trim() || String(text || '').trim();
}
function sanitizeModelMarkdown(text) {
  return String(text || '')
    .replace(/\s*\(?trending[_\s-]*score\s*[=:]\s*\d+\)?/gi, '')
    .replace(/(?:đã được đánh giá cao,?\s*)?có\s+\d+\s+điểm\s+(?:xu hướng|thịnh hành)(?:,?\s*nên\s*(?:rất\s*)?được nhiều độc giả quan tâm)?\.?/gi, 'Được nhiều độc giả quan tâm.')
    .replace(/\\\*\\\*/g, '')
    .replace(/\\\s*\n/g, '\n');
}
async function listConversations(userId) { return all(`SELECT c.id, c.title, c.created_at, c.updated_at, (SELECT content FROM ai_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS preview FROM ai_conversations c WHERE c.user_id=? ORDER BY c.updated_at DESC`, [userId]); }
async function conversation(userId, id) {
  const item = await get('SELECT * FROM ai_conversations WHERE id=? AND user_id=?', [id, userId]);
  if (!item) return null;
  const messages = await all(
    'SELECT id, role, content, recommended_book_ids, created_at FROM ai_messages WHERE conversation_id=? ORDER BY created_at ASC',
    [id],
  );
  return {
    ...item,
    messages: await Promise.all(
      messages.map(async (message) => {
        const bookIds = (message.recommended_book_ids || []).slice(0, 8);
        const storedBooks = await Promise.all(
          bookIds.map((bookId) => catalog.getBookDetail(bookId, userId)),
        );
        return {
          ...message,
          recommended_books: storedBooks.filter((book) => book && shouldDisplayBook(message.content, book)),
        };
      }),
    ),
  };
}
async function createConversation(userId) { const id = crypto.randomUUID(); await pool.query('INSERT INTO ai_conversations(id,user_id,title) VALUES($1,$2,$3)', [id, userId, 'Cuộc tư vấn mới']); return conversation(userId, id); }
async function removeConversation(userId, id) { const result = await pool.query('DELETE FROM ai_conversations WHERE id=$1 AND user_id=$2', [id, userId]); return Boolean(result.rowCount); }
async function addMessage(conversationId, role, content, bookIds = []) { await pool.query('INSERT INTO ai_messages(id,conversation_id,role,content,recommended_book_ids) VALUES($1,$2,$3,$4,$5::jsonb)', [crypto.randomUUID(), conversationId, role, content, JSON.stringify(bookIds)]); await pool.query('UPDATE ai_conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [conversationId]); }
function titleFrom(text) { return text.trim().slice(0, 80) || 'Cuộc tư vấn mới'; }
function compactBook(book) { return { id: book.id, title: book.title, author: book.author || null, publisher: book.publisher || null, publication_year: book.publication_year || null, category: book.category || null, collection_name: book.collection_name, is_bookmarked: book.is_bookmarked, is_favorite: book.is_favorite, reading_status: book.reading_status, game_count: book.game_count || 0, review_count: book.review_count || 0, reader_count: book.reader_count || 0, trending_score: book.trending_score || 0 }; }
async function catalogForMessage(userId, text) {
  return catalog.searchCatalog({ query: isTrendingIntent(text) ? '' : retrievalQuery(text), userId, limit: 8 });
}
async function resolveTool(userId, call) { let args = {}; try { args = JSON.parse(call.function.arguments || '{}'); } catch { return { error: 'Invalid tool arguments' }; } if (call.function.name === 'search_catalog') return catalog.searchCatalog({ ...args, userId, limit: 8 }); if (call.function.name === 'get_book_detail') return catalog.getBookDetail(args.book_id, userId); return { error: 'Unknown tool' }; }
async function answer({ userId, conversationId, text, onDelta }) {
  const start = Date.now(); const current = await usableConfig(); const chat = await conversation(userId, conversationId);
  if (!chat) { const error = new Error('Không tìm thấy cuộc trò chuyện.'); error.code = 'NOT_FOUND'; throw error; }
  await addMessage(conversationId, 'user', text);
  if (chat.title === 'Cuộc tư vấn mới') await pool.query('UPDATE ai_conversations SET title=$1 WHERE id=$2', [titleFrom(text), conversationId]);
  const recent = [...chat.messages.slice(-12), { role: 'user', content: text }].map((message) => ({ role: message.role, content: message.content }));
  const retrieved = await catalogForMessage(userId, text);
  const candidateBooks = new Map(retrieved.map((book) => [book.id, book]));
  const messages = [{ role: 'system', content: `${current.system_prompt || DEFAULT_PROMPT}\n\n${ADVISOR_POLICY}\n\nCatalog candidates (JSON, source of truth):\n${JSON.stringify(retrieved.map(compactBook))}\nAmong equally suitable books, prioritize a higher trending_score. It reflects book-linked games, approved reader reviews, and active readers; mention those benefits only when they exist in the catalog data. If the reader asks which books are trending, popular, widely read, or have games, recommend directly from these candidates rather than saying the catalog has no data. Never reveal raw metadata field names, UUIDs except the required citation, numeric popularity scores, or implementation details to the reader. Describe popularity in ordinary language only. Only recommend books contained in this catalog data. Recommend at most three books in one answer. When recommending a catalog book, append its exact citation in the form (id: BOOK_UUID).` }, ...recent];
  let usage = {}; let generated = '';
  try {
    const first = await provider.complete(current, messages, tools); usage = first.usage || {};
    const toolCalls = first.message?.tool_calls || [];
    if (toolCalls.length) {
      const toolResults = await Promise.all(toolCalls.slice(0, 2).map((call) => resolveTool(userId, call)));
      for (const toolResult of toolResults) {
        const rows = Array.isArray(toolResult) ? toolResult : toolResult?.id ? [toolResult] : [];
        for (const book of rows) if (book?.id && book?.title) candidateBooks.set(book.id, book);
      }
      messages.push(first.message, ...toolCalls.slice(0, 2).map((call, index) => ({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResults[index]) })));
    }
    generated = sanitizeModelMarkdown(await provider.stream(current, messages, onDelta));
    const finalBooks = [...candidateBooks.values()]
      .filter((book) => shouldDisplayBook(generated, book))
      .slice(0, 3);
    await addMessage(conversationId, 'assistant', generated, finalBooks.map((book) => book.id));
    await pool.query('INSERT INTO ai_request_logs(id,user_id,provider,model,status,duration_ms,prompt_tokens,completion_tokens) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [crypto.randomUUID(), userId, current.provider, current.model, 'SUCCESS', Date.now() - start, usage.prompt_tokens || null, usage.completion_tokens || null]);
    return { text: generated, books: finalBooks, title: chat.title === 'Cuộc tư vấn mới' ? titleFrom(text) : chat.title };
  } catch (error) {
    await pool.query('INSERT INTO ai_request_logs(id,user_id,provider,model,status,duration_ms) VALUES($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), userId, current.provider, current.model, 'ERROR', Date.now() - start]).catch(() => undefined);
    throw error;
  }
}
async function stats() { return get(`SELECT (SELECT COUNT(*)::int FROM books) AS book_count, (SELECT COUNT(*)::int FROM library_collections) AS collection_count, (SELECT COUNT(*)::int FROM ai_conversations) AS conversation_count, (SELECT COUNT(*)::int FROM ai_request_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') AS request_count`); }
async function testProvider() { const current = await usableConfig(); const result = await provider.complete(current, [{ role: 'user', content: 'Reply with OK.' }], []); return { ok: Boolean(result.message?.content), model: current.model }; }
async function models() { return provider.listModels(await configWithKey()); }
module.exports = { answer, conversation, createConversation, getPublicConfig, listConversations, models, removeConversation, stats, testProvider, updateConfig };
