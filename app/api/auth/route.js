import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.ADMIN_PASSWORD || 'cic-admin-2026';
const HMAC_KEY = crypto.createHash('sha256').update(SECRET).digest();
const TOKEN_EXPIRY_DAYS = 30;

function createToken() {
  const payload = {
    iat: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(data).digest('base64url');
  return `${data}.${sig}`;
}

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

// POST: login
export async function POST(request) {
  try {
    const { password } = await request.json();
    if (password !== SECRET) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    const token = createToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

// GET: verify token
export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}
