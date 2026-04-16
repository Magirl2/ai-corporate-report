import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

// VERCEL 환경변수가 명시적으로 설정된 경우에만 Vercel 배포 환경으로 간주합니다.
const isVercelDeployment = !!process.env.VERCEL;

// 로컬 개발 전용 파일 DB 경로
const DB_PATH = path.join(process.cwd(), '.users.json');

// Redis 설정 (REDIS_URL 우선 사용)
const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;
const useRedis = !!REDIS_URL;

// 전용 Redis 클라이언트 싱글톤 인스턴스
let redis;
if (useRedis) {
  redis = new Redis(REDIS_URL);
}

/**
 * 프로덕션 환경에서 저장소가 설정되지 않은 경우 명시적 오류를 던집니다.
 */
function assertPersistence() {
  if (isVercelDeployment && !useRedis) {
    throw new Error(
      '[Configuration Error] Vercel 프로덕션 환경에서 Redis 데이터베이스가 설정되지 않았습니다. ' +
      'Vercel 프로젝트 설정에서 Redis를 연결하거나 REDIS_URL 환경 변수를 설정해 주세요.'
    );
  }
}

/**
 * 프론트엔드로 전달할 안전한 유저 객체 형식을 표준화합니다.
 */
export function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id || '',
    email: user.email || '',
    name: user.name || '',
    plan: user.plan || 'free',
    usage: typeof user.usage === 'number' ? user.usage : 0,
    role: user.role || 'user'
  };
}

/**
 * 환경 변수 ADMIN_EMAILS를 확인하여 관리자 여부를 판단합니다.
 */
export function isAdminEmail(email) {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().replace(/^["'](.*)["]$/, '$1').toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

/**
 * 유저 객체에 role 필드를 동적으로 주입합니다.
 */
function enrichUser(user) {
  if (!user) return null;
  return {
    ...user,
    role: isAdminEmail(user.email) ? 'admin' : 'user'
  };
}

/**
 * [로컬 개발 전용] 로컬 파일 불러오기
 */
function getLocalDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (error) {
    console.error('[Mock DB] Failed to read local mock DB:', error);
  }
  return [];
}

function saveLocalDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[Mock DB] Failed to write local mock DB:', error);
  }
}

/**
 * 비동기: 이메일로 사용자 찾기
 */
export async function findUserByEmail(email) {
  assertPersistence();
  if (useRedis) {
    try {
      const raw = await redis.get(`user:${email}`);
      return raw ? enrichUser(JSON.parse(raw)) : null;
    } catch (err) {
      console.error('[Redis DB] Fetch error:', err);
      return null;
    }
  } else {
    const users = getLocalDb();
    const user = users.find(u => u.email === email);
    return enrichUser(user || null);
  }
}

/**
 * 비동기: 새로운 사용자 생성
 */
export async function createUser(userObj) {
  assertPersistence();
  if (useRedis) {
    const existing = await redis.get(`user:${userObj.email}`);
    if (existing) {
      throw new Error('이미 존재하는 사용자입니다.');
    }
    await redis.set(`user:${userObj.email}`, JSON.stringify(userObj));
    return enrichUser(userObj);
  } else {
    const users = getLocalDb();
    if (users.find(u => u.email === userObj.email)) {
      throw new Error('이미 존재하는 사용자입니다.');
    }
    users.push(userObj);
    saveLocalDb(users);
    return enrichUser(userObj);
  }
}

/**
 * 비동기: 사용자 업데이트
 */
export async function updateUser(email, updates) {
  assertPersistence();
  if (useRedis) {
    const raw = await redis.get(`user:${email}`);
    if (!raw) throw new Error('User not found');
    const updatedUser = { ...JSON.parse(raw), ...updates };
    await redis.set(`user:${email}`, JSON.stringify(updatedUser));
    return enrichUser(updatedUser);
  } else {
    const users = getLocalDb();
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) throw new Error('User not found');
    const updatedUser = { ...users[idx], ...updates };
    users[idx] = updatedUser;
    saveLocalDb(users);
    return enrichUser(updatedUser);
  }
}

/**
 * 비동기: 사용자의 일일 사용량을 안전하게 1 증가시킵니다.
 */
export async function incrementUserUsage(email) {
  assertPersistence();
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User not found');
  
  const updatedUser = { ...user, usage: (user.usage || 0) + 1 };
  
  if (useRedis) {
    await redis.set(`user:${email}`, JSON.stringify(updatedUser));
  } else {
    const users = getLocalDb();
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) {
      users[idx] = updatedUser;
      saveLocalDb(users);
    }
  }
  return enrichUser(updatedUser);
}

/**
 * 비동기: 일일 사용량이 초기화된 사용자 정보를 가져옵니다.
 */
export async function getNormalizedUser(email) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  if (user.usageResetAt !== today) {
    return await updateUser(email, { 
      usage: 0, 
      usageResetAt: today 
    });
  }
  return user;
}

/**
 * 캐시 처리 (보고서)
 */
const CACHE_PATH = path.join(process.cwd(), '.reports_cache.json');

function getLocalCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8') || '{}');
  } catch (error) {
    console.error('[Mock Cache] Failed to read:', error);
  }
  return {};
}

function saveLocalCache(data) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[Mock Cache] Failed to write:', error);
  }
}

export async function getCachedReport(companyName) {
  const key = `report:${companyName.trim().toUpperCase()}`;
  if (useRedis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('[Redis Cache] Get error:', err);
      return null;
    }
  } else {
    const cache = getLocalCache();
    const hit = cache[key];
    if (hit && hit.expires > Date.now()) return hit.data;
    return null;
  }
}

export async function setCachedReport(companyName, reportData) {
  const key = `report:${companyName.trim().toUpperCase()}`;
  const ttlSeconds = 60 * 60 * 24; // 24 hours
  if (useRedis) {
    try {
      await redis.set(key, JSON.stringify(reportData), 'EX', ttlSeconds);
    } catch (err) {
      console.error('[Redis Cache] Set error:', err);
    }
  } else {
    const cache = getLocalCache();
    cache[key] = { data: reportData, expires: Date.now() + ttlSeconds * 1000 };
    saveLocalCache(cache);
  }
}
