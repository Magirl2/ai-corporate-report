import crypto from 'crypto';

export function createLogger(route) {
  const reqId = crypto.randomUUID().slice(0, 8);
  
  const SENSITIVE_KEYS = ['token', 'password', 'secret', 'apiKey', 'key', 'hash', 'authorization', 'cookie', 'credential'];

  const log = (level, message, meta = {}) => {
    const safeMeta = { ...meta };
    for (const k of SENSITIVE_KEYS) {
      if (safeMeta[k] !== undefined) delete safeMeta[k];
    }
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      reqId,
      route,
      message,
      ...safeMeta
    }));
  };

  return {
    reqId,
    info: (message, meta) => log('INFO', message, meta),
    warn: (message, meta) => log('WARN', message, meta),
    error: (message, meta) => log('ERROR', message, meta)
  };
}
