const fs = require('fs');
let content = fs.readFileSync('scripts/validate-assets.mjs', 'utf8');

const elseIdx = content.indexOf('  } else {');
const checkIdx = content.indexOf('  check(colorable > 0', elseIdx);
const endIdx = content.indexOf(');', checkIdx) + 2;

const newBlock = `  } else {
    // Mask (2-char encoding): dimensions + colorable palette refs + at least one colorable.
    check(Array.isArray(m.mask) && m.mask.length === m.height,
      '[' + id + '] mask rows (' + (m.mask?.length) + ') != height (' + m.height + ')');
    (m.mask ?? []).forEach((row, y) => {
      check(typeof row === 'string' && row.length === m.width * 2,
        '[' + id + '] mask row ' + y + ' length ' + (row?.length) + ' != width*2 ' + (m.width * 2));
      if (typeof row !== 'string' || row.length !== m.width * 2) return;
      for (let i = 0; i < row.length; i += 2) {
        const code = row.substring(i, i + 2);
        if (code === '..' || code === '--') continue;
        colorable++;
        const idx = parseInt(code, 36);
        check(Number.isInteger(idx) && idx >= 1 && idx < m.palette.length,
          '[' + id + '] mask row ' + y + ": code '" + code + "' -> palette index " + idx + ' out of range');
      }
    });
    check(colorable > 0, '[' + id + '] no colorable cells');
  }`;

content = content.slice(0, elseIdx) + newBlock + content.slice(endIdx);
fs.writeFileSync('scripts/validate-assets.mjs', content);
console.log('done');
