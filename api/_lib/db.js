import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

// VERCEL 환경변수가 명시적으로 설정된 경우에만 Vercel 배포 환경으로 간주합니다.
// NODE_ENV=production 만으로는 Vercel 배포라고 가정하지 않습니다.
const isVercelDeployment = !!process.env.VERCEL;

// 로컬 개발 전용 파일 DB 경로 (Vercel 배포에서는 사용되지 않습니다)
const DB_PATH = path.join(process.cwd(), '.users.json');

// Vercel KV가 활성화 상태인지 확인
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/**
 * Vercel 배포 환경에서 KV가 설정되지 않은 경우 명시적 오류를 던집니다.
 * 서버리스 환경에서 /tmpfallback이 함수별로 격리되어 발생하는 불일치 문제를 방지합니다.
 */
function assertPersistence() {
  if (isVercelDeployment && !useKV) {
    throw new Error(
      '[Configuration Error] Vercel 프로덕션 환경에서 KV 데이터베이스가 설정되지 않았습니다. ' +
      'Vercel 프로젝트 설정의 Storage 탭에서 KV를 연결하거나 KV_REST_API_URL 및 KV_REST_API_TOKEN 환경 변수를 수동으로 설정해 주세요.'
    );
  }
}

/**
 * 프론트엔드로 전달할 안전한 유저 객체 형식을 표준화합니다.
 * 비밀번호 해시 등 민감 정보를 제외하고 필수 필드만 포함합니다.
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

/**
 * [로컬 개발 전용] 로컬 파일 저장
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
  assertPersistence();
  if (useKV) {
    try {
      const user = await kv.get(`user:${email}`);
      return enrichUser(user);
    } catch (err) {
      console.error('[KV DB] Fetch error:', err);
      return null;
    }
  } else {
    // KV 미설정 시 로컬 개발 파일 DB 사용 (Vercel 배포에서는 assertPersistence()가 먼저 예외를 던짐)
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
  assertPersistence();
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
 * 비동기: 사용자의 일일 사용량을 안전하게 1 증가시킵니다.
 * 업데이트 직전에 최신 데이터를 다시 읽어와 경합 가능성을 최소화합니다.
 */
export async function incrementUserUsage(email) {
  assertPersistence();
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User not found');
  
  const updatedUser = { ...user, usage: (user.usage || 0) + 1 };
  
  if (useKV) {
    await kv.set(`user:${email}`, updatedUser);
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
// 보고서 캐시도 로컬 개발 전용 파일 경로 사용 (Vercel 배포에서는 KV를 통해 처리)
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
