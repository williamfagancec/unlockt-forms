const { authLimiter, passwordResetLimiter, apiLimiter } = require('../../middleware/rateLimiter');

describe('middleware/rateLimiter', () => {
  const makeRes = () => {
    const res = {
      statusCode: 200,
      status: jest.fn(function (code) { this.statusCode = code; return this; }),
      json: jest.fn()
    };
    return res;
  };

  it('authLimiter allows requests under the limit and eventually rate-limits', async () => {
    const req = { ip: '127.0.0.1', method: 'POST', path: '/login' };
    const next = jest.fn();

    // First 5 should pass
    for (let i = 0; i < 5; i++) {
      const res = makeRes();
      next.mockClear();
      await new Promise((resolve) => authLimiter(req, res, () => { next(); resolve(); }));
      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    }

    // 6th should be blocked (429)
    const resBlocked = makeRes();
    await new Promise((resolve) => {
      authLimiter(req, resBlocked, () => resolve());
      // resolve in case next() is called (shouldn't be)
      setTimeout(resolve, 10);
    });
    // When limited, our custom handler responds 429 with message
    expect(resBlocked.status).toHaveBeenCalledWith(429);
    expect(resBlocked.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringMatching(/Too many authentication attempts/)
    }));
  });

  it('exposes other limiters as functions', () => {
    expect(typeof passwordResetLimiter).toBe('function');
    expect(typeof apiLimiter).toBe('function');
  });
});