import { config } from '../src/config/env';

describe('API base configuration', () => {
  it('exposes a non-empty apiBaseUrl including the backend context path', () => {
    expect(config.environment).toBe('development');
    expect(typeof config.apiBaseUrl).toBe('string');
    expect(config.apiBaseUrl.length).toBeGreaterThan(0);
    expect(config.apiBaseUrl.endsWith('/api')).toBe(true);
  });
});
