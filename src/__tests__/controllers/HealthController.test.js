jest.mock('../../infrastructure/database', () => ({
  pool: { query: jest.fn() }
}));

const { pool } = require('../../infrastructure/database');
const HealthController = require('../../controllers/HealthController');

const makeRes = () => {
  const res = {
    statusCode: 200,
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    json: jest.fn()
  };
  return res;
};

describe('HealthController', () => {
  let controller;
  let logger;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    controller = new HealthController(logger);
    jest.clearAllMocks();
  });

  it('liveness returns ok', async () => {
    const req = {};
    const res = makeRes();
    await controller.liveness(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ status: 'ok' })
    }));
  });

  it('readiness returns ok when DB is healthy', async () => {
    pool.query.mockImplementation((sql, cb) => cb(null, { rows: [{ health_check: 1 }] }));
    const req = {};
    const res = makeRes();
    await controller.readiness(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ server: 'ok', database: 'ok' })
    }));
  });

  it('readiness returns 503 when DB fails', async () => {
    pool.query.mockImplementation((sql, cb) => cb(new Error('db fail')));
    const req = {};
    const res = makeRes();
    await controller.readiness(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringMatching(/Service temporarily unavailable|Service not ready/)
    }));
  });

  it('metrics returns process info', async () => {
    const req = {};
    const res = makeRes();
    await controller.metrics(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        uptime: expect.any(Object),
        memory: expect.any(Object),
        process: expect.any(Object)
      })
    }));
  });
});