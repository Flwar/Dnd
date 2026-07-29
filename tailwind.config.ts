import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], theme: { extend: { colors: { gold:'#c8a35f', ink:'#070910', wine:'#3b101d', midnight:'#0b1324' }, fontFamily:{sans:['Arial','sans-serif']} } }, plugins: [] } satisfies Config;
