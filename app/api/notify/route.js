import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.ADMIN_PASSWORD || 'cic-admin-2026';
const HMAC_KEY = crypto.createHash('sha256').update(SECRET).digest();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function verifyToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', HMAC_KEY).update(data).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request) {
  // Verify auth
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }
  if (!verifyToken(auth.slice(7))) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const { recipients, message } = await request.json();
    if (!recipients?.length || !message) {
      return NextResponse.json({ error: 'Missing recipients or message' }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      if (!r.telegram_id) { failed++; continue; }
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: r.telegram_id,
            text: message,
            parse_mode: 'HTML'
          })
        });
        if (res.ok) { sent++; } else { failed++; }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ sent, failed });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
