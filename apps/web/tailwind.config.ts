import type { Config } from 'tailwindcss';

export default { content: ['./src/**/*.{html,ts}'], theme: { extend: { colors: { surface: '#0b0d10', panel: '#111418', line: '#232832' } } }, plugins: [] } satisfies Config;
