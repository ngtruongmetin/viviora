/* global fetch, AbortSignal, TextDecoder */

function endpoint(baseUrl) {
  const value = String(baseUrl).replace(/\/$/, '');
  return value.endsWith('/chat/completions') ? value : `${value}/chat/completions`;
}

function modelsEndpoint(baseUrl) {
  const value = String(baseUrl).replace(/\/$/, '');
  return value.endsWith('/chat/completions')
    ? value.replace(/\/chat\/completions$/, '/models')
    : `${value}/models`;
}

async function ensureSuccess(response) {
  if (response.ok) return;
  const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 360);
  throw new Error(`Provider returned ${response.status}${detail ? `: ${detail}` : ''}`);
}

async function complete(config, messages, tools) {
  const response = await fetch(endpoint(config.base_url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({ model: config.model, messages, tools, tool_choice: 'auto', temperature: Number(config.temperature), max_tokens: Number(config.max_tokens) }),
  });
  await ensureSuccess(response);
  const data = await response.json();
  return { message: data.choices?.[0]?.message, usage: data.usage || {} };
}

async function stream(config, messages, onDelta) {
  const response = await fetch(endpoint(config.base_url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ model: config.model, messages, stream: true, temperature: Number(config.temperature), max_tokens: Number(config.max_tokens) }),
  });
  await ensureSuccess(response);
  if (!response.body) throw new Error('Provider did not return a response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try { const delta = JSON.parse(payload).choices?.[0]?.delta?.content || ''; if (delta) { text += delta; onDelta(delta); } } catch { /* provider sent a partial SSE frame */ }
    }
  }
  return text;
}

async function listModels(config) {
  const response = await fetch(modelsEndpoint(config.base_url), {
    headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(20_000),
  });
  await ensureSuccess(response);
  const data = await response.json();
  return (data.data || []).map((item) => item.id).filter((id) => typeof id === 'string').sort();
}

module.exports = { complete, listModels, stream };
