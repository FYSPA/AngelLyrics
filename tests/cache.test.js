import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = {};

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => JSON.stringify(store)),
    writeFileSync: vi.fn((_path, data) => { Object.assign(store, JSON.parse(data)); }),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  },
  readFileSync: vi.fn(() => JSON.stringify(store)),
  writeFileSync: vi.fn((_path, data) => { Object.assign(store, JSON.parse(data)); }),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

describe('cache', () => {
  let readConfig, writeConfig, refreshConfig, readFileSync, existsSync;

  beforeEach(async () => {
    Object.keys(store).forEach(k => delete store[k]);
    const cache = await import('../src/config/cache.js');
    readConfig = cache.readConfig;
    writeConfig = cache.writeConfig;
    refreshConfig = cache.refreshConfig;
    const fs = await import('fs');
    readFileSync = fs.readFileSync;
    existsSync = fs.existsSync;
    readFileSync.mockClear();
    existsSync.mockClear();
    existsSync.mockReturnValue(true);
    refreshConfig();
  });

  it('readConfig returns empty object for non-existent file', async () => {
    existsSync.mockReturnValue(false);
    refreshConfig();
    expect(readConfig()).toEqual({});
  });

  it('writeConfig writes data and caches it', async () => {
    refreshConfig();
    writeConfig({ key: 'value' });
    expect(readConfig()).toEqual({ key: 'value' });
  });

  it('readConfig returns cached value without reading disk', async () => {
    refreshConfig();
    writeConfig({ foo: 'bar' });
    readFileSync.mockClear();
    readConfig();
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it('refreshConfig clears cache and re-reads from disk', async () => {
    refreshConfig();
    writeConfig({ a: 1 });
    refreshConfig();
    readFileSync.mockClear();
    readConfig();
    expect(readFileSync).toHaveBeenCalledOnce();
  });
});
