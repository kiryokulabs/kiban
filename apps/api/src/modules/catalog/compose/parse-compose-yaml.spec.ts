import { describe, expect, it } from 'vitest';
import { parseComposeYaml } from './parse-compose-yaml';

const CONTEXT = { file: 'catalog/databases/postgresql/compose.yml' };

describe('parseComposeYaml', () => {
  it('parses a valid compose document into an object', () => {
    const { document, issues } = parseComposeYaml(
      ['services:', '  postgresql:', '    image: postgres:17'].join('\n'),
      CONTEXT
    );
    expect(issues).toEqual([]);
    expect(document).toEqual({ services: { postgresql: { image: 'postgres:17' } } });
  });

  it('parses interpolation templates as literal strings', () => {
    const { document } = parseComposeYaml(
      ['services:', '  app:', '    environment:', '      KEY: ${KIBAN_KEY:-default}'].join('\n'),
      CONTEXT
    );
    expect(document).toEqual({ services: { app: { environment: { KEY: '${KIBAN_KEY:-default}' } } } });
  });

  it('reports an issue with the file and line for invalid YAML', () => {
    const { document, issues } = parseComposeYaml('services:\n  app: [unclosed', CONTEXT);
    expect(document).toBeUndefined();
    expect(issues).toHaveLength(1);
    expect(issues[0]!.file).toBe(CONTEXT.file);
    expect(issues[0]!.service).toBe('<root>');
    expect(issues[0]!.reason).toContain('invalid YAML');
  });

  it('passes through scalar documents for the validator to reject', () => {
    const { document, issues } = parseComposeYaml('just-a-string', CONTEXT);
    expect(issues).toEqual([]);
    expect(document).toBe('just-a-string');
  });
});
