import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.ADMIN_PASSWORD || 'cic-admin-2026';
const HMAC_KEY = crypto.createHash('sha256').update(SECRET).digest();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SB_URL = 'https://ipjolefhnzwthmalripz.supabase.co';
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PUSH_SECRET = 'cic-notify-2026';

// Same verification as auth/route.js
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

// Send a Telegram message
async function sendTelegram(telegramId, message) {
  if (!BOT_TOKEN || !telegramId) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramId, text: message }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Send push notifications via send-push edge function (non-blocking)
async function sendPushByTelegramIds(telegramIds, message) {
  if (!telegramIds.length || !SB_SERVICE_KEY) return;
  try {
    const filter = telegramIds.map((id) => `telegram_id.eq.${id}`).join(',');
    const url = `${SB_URL}/rest/v1/students?select=id&or=(${filter})`;
    const res = await fetch(url, {
      headers: { apikey: SB_SERVICE_KEY, Authorization: `Bearer ${SB_SERVICE_KEY}` },
    });
    const students = await res.json();
    const studentIds = (students || []).map((s) => s.id);
    if (studentIds.length === 0) return;

    await fetch(`${SB_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _secret: PUSH_SECRET,
        student_ids: studentIds,
        title: '📝 CIC Notification',
        message: message,
      }),
    });
  } catch {
    // Non-blocking — push failure shouldn't break Telegram flow
  }
}

export async function POST(request) {
  // Verify admin auth
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { recipients, message } = await request.json();
  if (!message || !recipients?.length) {
    return NextResponse.json({ error: 'Missing recipients or message' }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;
  const telegramIds = [];

  for (const r of recipients) {
    if (!r.telegram_id) {
      failed++;
      continue;
    }
    telegramIds.push(r.telegram_id);
    const ok = await sendTelegram(r.telegram_id, message);
    if (ok) sent++;
    else failed++;
  }

  // Also send push notifications (fire-and-forget)
  sendPushByTelegramIds(telegramIds, message);

  return NextResponse.json({ sent, failed });
}
