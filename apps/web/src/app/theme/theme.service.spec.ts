import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeService } from './theme.service';

const createService = (initialCookie = '') => {
  const classList = new Set<string>();
  const documentMock = {
    cookie: initialCookie,
    documentElement: {
      dataset: {} as Record<string, string>,
      classList: {
        toggle: (name: string, enabled: boolean) => {
          if (enabled) {
            classList.add(name);
          } else {
            classList.delete(name);
          }
        }
      }
    }
  };
  vi.stubGlobal('document', documentMock);
  const service = new ThemeService();
  return { service, documentMock, classList };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeService', () => {
  it('defaults to dark theme', () => {
    const { service, documentMock, classList } = createService();
    expect(service.theme()).toBe('dark');
    expect(documentMock.documentElement.dataset['theme']).toBe('dark');
    expect(classList.has('dark')).toBe(true);
  });

  it('reads light theme from cookie', () => {
    const { service, documentMock, classList } = createService('kiban_theme=light');
    expect(service.theme()).toBe('light');
    expect(documentMock.documentElement.dataset['theme']).toBe('light');
    expect(classList.has('light')).toBe(true);
  });

  it('toggles and persists theme in a cookie', () => {
    const { service, documentMock } = createService();
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(documentMock.cookie).toContain('kiban_theme=light');
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(documentMock.cookie).toContain('kiban_theme=dark');
  });

  it('defaults to the default color theme', () => {
    const { service, documentMock } = createService();

    expect(service.colorTheme()).toBe('default');
    expect(documentMock.documentElement.dataset['colorTheme']).toBe('default');
  });

  it('applies and persists a selected color theme', () => {
    const { service, documentMock } = createService();

    service.setColorTheme('obsidian-vermilion');

    expect(service.colorTheme()).toBe('obsidian-vermilion');
    expect(documentMock.documentElement.dataset['colorTheme']).toBe('obsidian-vermilion');
    expect(documentMock.cookie).toContain('kiban_color_theme=obsidian-vermilion');
  });

  it('supports the additional color themes', () => {
    const { service, documentMock } = createService();

    service.setColorTheme('moss-lime');

    expect(documentMock.documentElement.dataset['colorTheme']).toBe('moss-lime');
  });
});
