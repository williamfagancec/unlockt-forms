const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const cacheMiddleware = (durationOrOptions = CACHE_TTL) => {
  let duration = CACHE_TTL;
  let options = {};
  
  if (typeof durationOrOptions === 'number') {
    duration = durationOrOptions;
  } else if (typeof durationOrOptions === 'object') {
    duration = durationOrOptions.duration || CACHE_TTL;
    options = durationOrOptions;
  }
  
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    let key = `__express__${req.originalUrl || req.url}`;
    
    if (options.keyGenerator && typeof options.keyGenerator === 'function') {
      key = options.keyGenerator(req);
    } else {
      if (options.varyByUser && req.user && req.user.id) {
        key += `::user:${req.user.id}`;
      } else if (options.varyBySession && req.sessionID) {
        key += `::session:${req.sessionID}`;
      }
    }
    
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      const { body, timestamp } = cachedResponse;
      const age = Date.now() - timestamp;

      if (age < duration) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${Math.floor((duration - age) / 1000)}`);
        return res.json(body);
      } else {
        cache.delete(key);
      }
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      cache.set(key, { body, timestamp: Date.now() });
      
      setTimeout(() => {
        cache.delete(key);
      }, duration);

      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${Math.floor(duration / 1000)}`);
      return originalJson(body);
    };

    next();
  };
};

const clearCache = () => {
  cache.clear();
};

module.exports = {
  cacheMiddleware,
  clearCache,
};
