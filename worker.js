// Cloudflare Worker: holds the Telegram token safely.
// Bindings needed: KV namespace "DB"; secrets BOT_TOKEN, CHAT_ID; optional secret ADMIN.
const H = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
};
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: H });
const clip = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const tg = (env, method, body) =>
  fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.CHAT_ID, ...body })
  }).then(r => r.json()).catch(() => ({}));

const label = q => {
  const v = Object.values(q.r), c = v.length;
  const a = c ? (v.reduce((x, y) => x + y, 0) / c).toFixed(1) : '-';
  const w = q.v;
  const wish = [w.song && 'Song: ' + w.song, w.bg && 'BG: ' + w.bg, w.color && 'Text: ' + w.color, w.note && 'Note: ' + w.note].filter(Boolean).join(' | ');
  return `"${q.t}"\n- ${q.n}\n${wish ? wish + '\n' : ''}Rating: ${a} (${c} votes)`;
};

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: H });
    const url = new URL(req.url);
    let db = JSON.parse((await env.DB.get('q')) || '[]');

    if (req.method === 'GET') {
      const me = url.searchParams.get('v') || '';
      return J(db.map(q => {
        const v = Object.values(q.r), c = v.length;
        return { id: q.id, n: q.n, t: q.t, v: q.v, ts: q.ts, c, a: c ? v.reduce((x, y) => x + y, 0) / c : 0, mine: q.r[me] || 0 };
      }));
    }

    let b;
    try { b = await req.json(); } catch { return J({ error: 'Bad request' }, 400); }

    if (url.pathname === '/quote') {
      if (b.website) return J({ ok: true }); // honeypot
      const ip = req.headers.get('CF-Connecting-IP') || 'x';
      if (await env.DB.get('cd:' + ip)) return J({ error: 'Please wait a minute before posting again' }, 429);
      const n = clip(b.name, 40), t = clip(b.text, 280);
      if (n.length < 1 || t.length < 5) return J({ error: 'Name and quote (5+ chars) required' }, 400);
      const w = b.video || {};
      const q = {
        id: crypto.randomUUID().slice(0, 8), n, t, ts: Date.now(), r: {}, m: 0,
        v: { song: clip(w.song, 80), bg: clip(w.bg, 80), color: /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : '', note: clip(w.note, 200) }
      };
      const res = await tg(env, 'sendMessage', { text: label(q) });
      q.m = res.result?.message_id || 0;
      db.push(q);
      await env.DB.put('q', JSON.stringify(db.slice(-2000)));
      await env.DB.put('cd:' + ip, '1', { expirationTtl: 60 });
      return J({ ok: true });
    }

    if (url.pathname === '/rate') {
      const s = parseInt(b.stars, 10), voter = clip(b.voter, 40);
      const q = db.find(x => x.id === b.id);
      if (!q || !voter || s < 1 || s > 5) return J({ error: 'Invalid' }, 400);
      q.r[voter] = s;
      await env.DB.put('q', JSON.stringify(db));
      if (q.m) await tg(env, 'editMessageText', { message_id: q.m, text: label(q) });
      return J({ ok: true });
    }

    if (url.pathname === '/del' && env.ADMIN && b.key === env.ADMIN) {
      db = db.filter(x => x.id !== b.id);
      await env.DB.put('q', JSON.stringify(db));
      return J({ ok: true });
    }
    return J({ error: 'Not found' }, 404);
  }
};
