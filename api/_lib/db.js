import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const isVercelEnvironment = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const DB_PATH = isVercelEnvironment ? '/tmp/users.json' : path.join(process.cwd(), '.users.json');

// Vercel KV가 활성화 상태인지 확인 (서버리스 프로덕션 대상)
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/**
 * 환경 변수 ADMIN_EMAILS를 확인하여 관리자 여부를 판단합니다.
 */
export function isAdminEmail(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
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
 * [로컬 모드 Fallback] 로컬 파일 불러오기
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

/**
 * [로컬 모드 Fallback] 로컬 파일 저장
 */
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
  if (useKV) {
    try {
      const user = await kv.get(`user:${email}`);
      return enrichUser(user);
    } catch (err) {
      console.error('[KV DB] Fetch error:', err);
      return null;
    }
  } else {
    // Vercel KV 세팅이 미비되어 있으면 로컬(혹은 임시 파일) 시스템으로 안전하게 우회
    const users = getLocalDb();
    const user = users.find(u => u.email === email);
    return enrichUser(user || null);
  }
}

/**
 * 비동기: 새로운 사용자 생성
 */
export async function createUser(userObj) {
  if (useKV) {
    const existing = await kv.get(`user:${userObj.email}`);
    if (existing) {
      throw new Error('이미 존재하는 사용자입니다.');
    }
    await kv.set(`user:${userObj.email}`, userObj); // 무기한 유지
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
  if (useKV) {
    const user = await kv.get(`user:${email}`);
    if (!user) throw new Error('User not found');
    const updatedUser = { ...user, ...updates };
    await kv.set(`user:${email}`, updatedUser);
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
 * 비동기: 일일 사용량이 초기화된 사용자 정보를 가져옵니다.
 * 날짜가 바뀌었으면 usage를 0으로 리셋하고 날짜를 업데이트합니다.
 */
export async function getNormalizedUser(email) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  
  // 날짜가 다르거나 기록이 없으면 초기화
  if (user.usageResetAt !== today) {
    return await updateUser(email, { 
      usage: 0, 
      usageResetAt: today 
    });
  }
  
  return user;
}

/**
 * [로컬 모드 Fallback] 캐시 불러오기
 */
const CACHE_PATH = isVercelEnvironment ? '/tmp/reports.json' : path.join(process.cwd(), '.reports_cache.json');
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

/**
 * 비동기: 서버 캐시 구조에서 보고서 가져오기
 */
export async function getCachedReport(companyName) {
  const key = `report:${companyName.trim().toUpperCase()}`;
  if (useKV) {
    try {
      return await kv.get(key);
    } catch (err) {
      console.error('[KV Cache] Get error:', err);
      return null;
    }
  } else {
    const cache = getLocalCache();
    const hit = cache[key];
    if (hit && hit.expires > Date.now()) return hit.data;
    return null;
  }
}

/**
 * 비동기: 서버 캐시 구조에 보고서 저장하기 (TTL 24시간)
 */
export async function setCachedReport(companyName, reportData) {
  const key = `report:${companyName.trim().toUpperCase()}`;
  const ttlSeconds = 60 * 60 * 24; // 24 hours
  if (useKV) {
    try {
      await kv.set(key, reportData, { ex: ttlSeconds });
    } catch (err) {
      console.error('[KV Cache] Set error:', err);
    }
  } else {
    const cache = getLocalCache();
    cache[key] = { data: reportData, expires: Date.now() + ttlSeconds * 1000 };
    saveLocalCache(cache);
  }
}
