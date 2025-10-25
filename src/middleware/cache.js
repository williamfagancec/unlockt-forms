const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const cacheMiddleware = (duration = CACHE_TTL) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
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
