/* scripts/normalize-punctuation.js
   Usage:
     node scripts/normalize-punctuation.js --check   # report only
     node scripts/normalize-punctuation.js --write   # apply fixes
*/
const fs = require('fs');
const path = require('path');

const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);
const root = process.cwd();
const WRITE = process.argv.includes('--write') || process.argv.includes('-w');
const CHECK = process.argv.includes('--check') || !WRITE;

const REPLACERS = [
  [/\u2018|\u2019/g, "'"],               // ' ' -> '
  [/\u201C|\u201D/g, '"'],               // " " -> "
  [/\u2014|\u2015|\u2013|\u2212/g, '-'], // - - - - -> -
  [/\u2026/g, '...'],                    // ... -> ...
  [/\u00A0|\u202F/g, ' '],               // NBSP / narrow NBSP -> space
  [/\u200B|\u200C|\u200D|\u2060|\uFEFF/g, ''], // zero-widths -> remove
];

function hasBadChars(s) {
  return /[\u2018\u2019\u201C\u201D\u2014\u2015\u2013\u2212\u2026\u00A0\u202F\u200B\u200C\u200D\u2060\uFEFF]/.test(s);
}

async function walk(dir, out = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules','.git','build','.next','dist'].includes(e.name)) continue;
      await walk(p, out);
    } else if (exts.has(path.extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}

(async () => {
  const files = await walk(root);
  let changed = 0, flagged = 0;

  for (const file of files) {
    const original = await fs.promises.readFile(file, 'utf8');
    if (!hasBadChars(original)) continue;

    let fixed = original;
    for (const [re, rep] of REPLACERS) fixed = fixed.replace(re, rep);

    if (CHECK && fixed !== original) {
      flagged++;
      console.log(`[needs-fix] ${path.relative(root, file)}`);
      continue;
    }
    if (WRITE && fixed !== original) {
      await fs.promises.writeFile(file, fixed, 'utf8');
      changed++;
      console.log(`[fixed] ${path.relative(root, file)}`);
    }
  }

  if (CHECK) {
    console.log(`\nScan complete. Files needing fixes: ${flagged}`);
    if (flagged > 0) {
      console.log('Run: node scripts/normalize-punctuation.js --write');
      process.exitCode = 1;
    }
  } else {
    console.log(`\nNormalization complete. Files changed: ${changed}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
