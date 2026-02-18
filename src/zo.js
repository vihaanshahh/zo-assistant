import fetch from 'node-fetch';

const ZO_ENDPOINT = 'https://api.zo.computer/zo/ask';
const ZO_MODEL = 'byok:8d8a51c3-2671-4611-82b2-fe85aa91d2a8';

export async function askZo(input, token) {
  if (!token) throw new Error('ZO_ACCESS_TOKEN is not set. Add it in settings.');

  const res = await fetch(ZO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      model_name: ZO_MODEL,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zo API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.output;
}
