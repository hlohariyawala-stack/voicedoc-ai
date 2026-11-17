// VoiceDoc AI - tiny proxy so the Watson API key never reaches the browser.
require('dotenv').config();
const express = require('express');
const path = require('path');

const { WATSON_URL, WATSON_APIKEY } = process.env;
const VOICE = process.env.WATSON_VOICE || 'en-US_AllisonV3Voice';
const PORT = process.env.PORT || 3000;
const MAX_CHARS = 1500; // per request; Watson's hard limit is about 5 KB

if (!WATSON_URL || !WATSON_APIKEY) {
  console.error('Missing WATSON_URL or WATSON_APIKEY. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limit (per IP) to protect your Watson quota.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
function rateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
  }
  recent.push(now);
  hits.set(req.ip, recent);
  next();
}

app.post('/api/tts', rateLimit, async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'No text provided.' });
  if (text.length > MAX_CHARS) {
    return res.status(413).json({ error: `Text is too long (max ${MAX_CHARS} characters per request).` });
  }

  try {
    const upstream = await fetch(
      `${WATSON_URL.replace(/\/$/, '')}/v1/synthesize?voice=${encodeURIComponent(VOICE)}`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from('apikey:' + WATSON_APIKEY).toString('base64'),
          'Content-Type': 'application/json',
          Accept: 'audio/mp3'
        },
        body: JSON.stringify({ text })
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Watson error', upstream.status, detail);
      return res.status(upstream.status === 401 ? 502 : upstream.status)
        .json({ error: `Watson returned ${upstream.status}.` });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg').send(audio);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach IBM Watson.' });
  }
});

app.listen(PORT, () => console.log(`VoiceDoc AI running at http://localhost:${PORT}`));
