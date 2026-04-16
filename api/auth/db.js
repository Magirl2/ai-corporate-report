import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const isVercelEnvironment = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const DB_PATH = isVercelEnvironment ? '/tmp/users.json' : path.join(process.cwd(), '.users.json');

// Vercel KV가 활성화 상태인지 확인 (서버리스 프로덕션 대상)
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

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
      return await kv.get(`user:${email}`);
    } catch (err) {
      console.error('[KV DB] Fetch error:', err);
      return null;
    }
  } else {
    // Vercel KV 세팅이 미비되어 있으면 로컬(혹은 임시 파일) 시스템으로 안전하게 우회
    const users = getLocalDb();
    return users.find(u => u.email === email) || null;
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
    return userObj;
  } else {
    const users = getLocalDb();
    if (users.find(u => u.email === userObj.email)) {
      throw new Error('이미 존재하는 사용자입니다.');
    }
    users.push(userObj);
    saveLocalDb(users);
    return userObj;
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
    return updatedUser;
  } else {
    const users = getLocalDb();
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) throw new Error('User not found');
    const updatedUser = { ...users[idx], ...updates };
    users[idx] = updatedUser;
    saveLocalDb(users);
    return updatedUser;
  }
}
