const { cacheMiddleware } = require('../../middleware/cache');

describe('middleware/cache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const makeReq = (url = '/api/test') => ({ method: 'GET', originalUrl: url, url });
  const makeRes = () => {
    const headers = {};
    return {
      headers,
      set: jest.fn((k, v) => { headers[k] = v; }),
      json: jest.fn()
    };
  };

  it('should cache GET responses within TTL and set appropriate headers', () => {
    const duration = 100; // ms
    const middleware = cacheMiddleware(duration);

    const req1 = makeReq();
    const res1 = makeRes();
    const next1 = jest.fn();

    // First pass: MISS, wraps res.json and calls next
    middleware(req1, res1, next1);
    expect(next1).toHaveBeenCalledTimes(1);
    res1.json({ ok: true });
    expect(res1.set).toHaveBeenCalledWith('X-Cache', 'MISS');

    // Second pass before TTL: HIT, returns cached body without calling next
    const req2 = makeReq();
    const res2 = makeRes();
    const next2 = jest.fn();

    middleware(req2, res2, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
    expect(res2.set).toHaveBeenCalledWith('Cache-Control', expect.stringMatching(/^public, max-age=\d+/));
  });

  it('should expire cache after TTL', () => {
    const duration = 100; // ms
    const middleware = cacheMiddleware(duration);

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);
    res.json({ ok: true });

    // Advance beyond TTL
    jest.advanceTimersByTime(150);

    const resAfter = makeRes();
    const nextAfter = jest.fn();
    middleware(req, resAfter, nextAfter);

    // MISS again (since TTL elapsed), next called
    expect(nextAfter).toHaveBeenCalled();
    expect(resAfter.set).toHaveBeenCalledWith('X-Cache', 'MISS');
  });

  it('should bypass cache for non-GET requests', () => {
    const duration = 100;
    const middleware = cacheMiddleware(duration);

    const req = { method: 'POST', url: '/api/test' };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});