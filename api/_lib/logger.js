import crypto from 'crypto';

export function createLogger(route) {
  const reqId = crypto.randomUUID().slice(0, 8);
  
  const log = (level, message, meta = {}) => {
    // Avoid logging sensitive tokens if accidentally passed
    const safeMeta = { ...meta };
    if (safeMeta.token) delete safeMeta.token;
    
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
