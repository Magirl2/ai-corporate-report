import { serialize } from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 만료일자를 과거로 설정하여 클라이언트 측 쿠키 삭제
  res.setHeader('Set-Cookie', serialize('ei_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  }));

  return res.status(200).json({ success: true });
}
