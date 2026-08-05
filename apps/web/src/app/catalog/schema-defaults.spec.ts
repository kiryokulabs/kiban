import { describe, expect, it } from 'vitest';
import { resolveSchemaDefaultValue } from './schema-defaults';

describe('resolveSchemaDefaultValue', () => {
  it('returns plain defaults unchanged', () => {
    expect(resolveSchemaDefaultValue('kiban')).toBe('kiban');
  });

  it('resolves compose fallback expressions to their default value', () => {
    expect(resolveSchemaDefaultValue('${KIBAN_MONGOEXPRESS_MONGODB_URL:-mongodb://admin:kiban@mongo:27017/}')).toBe('mongodb://admin:kiban@mongo:27017/');
  });

  it('resolves compose fallback expressions containing URLs with colons', () => {
    expect(resolveSchemaDefaultValue('${KIBAN_OPENWEBUI_OLLAMA_BASE_URL:-http://host.docker.internal:11434}')).toBe('http://host.docker.internal:11434');
  });

  it('returns an empty string for unsupported non-string defaults', () => {
    expect(resolveSchemaDefaultValue(123)).toBe('');
  });
});
