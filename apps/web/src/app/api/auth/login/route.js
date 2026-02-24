import { NextResponse } from 'next/server';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

export const runtime = 'nodejs';
const API_URL = process.env.API_URL || 'http://localhost:4000';

function nodePostJson(urlStr, jsonBody) {
  const url = new URL(urlStr);
  const lib = url.protocol === 'https:' ? https : http;
  const body = JSON.stringify(jsonBody);

  const options = {
    method: 'POST',
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + (url.search || ''),
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'] || [];
        resolve({
          statusCode: res.statusCode || 500,
          setCookie: Array.isArray(setCookie) ? setCookie : [setCookie],
          text: data,
        });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildCookie(name, value, maxAgeSec) {
  const expires = new Date(Date.now() + maxAgeSec * 1000).toUTCString();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Expires=${expires}`,
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export async function POST(request) {
  const body = await request.json();

  const r = await nodePostJson(`${API_URL}/auth/login`, body);
  const parsed = r.text ? JSON.parse(r.text) : null;

  if (r.statusCode < 200 || r.statusCode >= 300) {
    return NextResponse.json(parsed || { message: 'Login failed' }, { status: r.statusCode });
  }

  // ✅ CRÍTICO: si backend no manda accessToken, NO seteamos nada
  if (!parsed?.accessToken) {
    return NextResponse.json(
      { message: 'Backend no devolvió accessToken' },
      {
        status: 500,
        headers: {
          'x-bff-login': 'missing-accessToken',
          'x-api-url': API_URL,
        },
      }
    );
  }

  const res = NextResponse.json({
    user: parsed.user,
    role: parsed.user?.role,
  });
  res.headers.set('x-bff-login', 'nodehttp-final');

  // refreshToken desde backend (cookie)
  const backendCookies = (r.setCookie || []).filter(Boolean);
  for (const c of backendCookies) res.headers.append('set-cookie', c);

  // accessToken desde backend JSON
  res.headers.append('set-cookie', buildCookie('accessToken', parsed.accessToken, 60 * 60 * 4));

  return res;
}
