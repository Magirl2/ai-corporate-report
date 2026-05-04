export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name) {
  return process.env[name] || null;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Auth Error] JWT_SECRET is missing');
    throw new Error('서버 인증 설정이 올바르지 않습니다.');
  }
  return secret;
}

export function hasEnv(name) {
  return !!process.env[name];
}
