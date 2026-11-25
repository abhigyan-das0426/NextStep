import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import fs from 'fs';

const inputCss = '@import "tailwindcss";\n@source "./src/**/*.{ts,tsx}";';
const res = await postcss([tailwind()]).process(inputCss, { from: './src/app/globals.css' });
fs.writeFileSync('./src/app/globals.css', res.css);
console.log('✓ Compiled Tailwind CSS into globals.css (' + res.css.length + ' bytes)');
