import fetch from 'node-fetch';

const ZO_ENDPOINT = 'https://api.zo.computer/zo/ask';
const ZO_MODEL = 'byok:8d8a51c3-2671-4611-82b2-fe85aa91d2a8';

/**
 * Stream a response from Zo via SSE.
 * SSE format from Zo:
 *   event: FrontendModelResponse
 *   data: {"content":"..."}
 *
 *   event: End
 *   data: {"output":"...","conversation_id":"..."}
 *
 * OR flat format with type inside data JSON (handled as fallback).
 */
export async function askZoStream(input, token, conversationId, onChunk, onStatus) {
  if (!token) throw new Error('Zo access token not set. Open settings (⚙) to add it.');

  const body = { input, model_name: ZO_MODEL, stream: true };
  if (conversationId) body.conversation_id = conversationId;

  const MAX_RETRIES = 12;
  const RETRY_DELAY_MS = 2500;
  let attempt = 0;
  let res;

  while (true) {
    res = await fetch(ZO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw new Error('Zo conversation is busy. Please try again in a moment.');
      }
      onStatus?.(`Zo is busy — retrying${attempt > 1 ? ` (${attempt})` : ''}…`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zo API error ${res.status}: ${text}`);
    }

    break;
  }

  let newConversationId = res.headers.get('x-conversation-id') || conversationId || null;
  let output = '';
  let buffer = '';
  let currentEventType = null;

  function processLine(line) {
    // Track SSE event type
    if (line.startsWith('event: ')) {
      currentEventType = line.slice(7).trim();
      return;
    }

    // Empty line = end of SSE event block, reset type
    if (line === '' || line === '\r') {
      currentEventType = null;
      return;
    }

    if (!line.startsWith('data: ')) return;

    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') return;

    let data;
    try { data = JSON.parse(raw); } catch { return; }

    // Determine event type: prefer `event:` line, fall back to `type` field inside JSON
    const type = currentEventType || data.type;

    if (type === 'FrontendModelResponse') {
      // Content can be at data.content or data.data.content
      const content = data.content ?? data.data?.content ?? '';
      if (content) {
        output += content;
        onChunk(content);
      }
    } else if (type === 'End') {
      const inner = data.data ?? data;
      if (inner.output) output = inner.output;
      if (inner.conversation_id) newConversationId = inner.conversation_id;
      if (data.conversation_id) newConversationId = data.conversation_id;
    } else if (type === 'Error') {
      const inner = data.data ?? data;
      throw new Error(inner.message || data.message || 'Zo stream error');
    }
  }

  for await (const rawChunk of res.body) {
    buffer += rawChunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop(); // hold incomplete last line
    for (const line of lines) processLine(line.replace(/\r$/, ''));
  }

  // Process any remaining buffer
  if (buffer) processLine(buffer.replace(/\r$/, ''));

  return { output, conversationId: newConversationId };
}
