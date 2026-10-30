const fs = require('fs');

// Read art-lib.mjs
let content = fs.readFileSync('scripts/art-lib.mjs', 'utf8');

// Change SIZE to 256
content = content.replace('export const SIZE = 128;', 'export const SIZE = 256;');
content = content.replace('export const SCALE = 1;', 'export const SCALE = 2;');

// Now scale each function. We'll do targeted replacements.
// Pattern: find "export function NAME(...)" and add scaling on the next line.

const funcScales = {
  'setPx': { args: [1,2], scale: [true,true] },  // x, y
  'getPx': { args: [1,2], scale: [true,true] },
  'fillRect': { args: [1,2,3,4], scale: [true,true,true,true] },  // x,y,w,h
  'hline': { args: [1,2,3], scale: [true,true,true] },  // x0,x1,y
  'vline': { args: [1,2,3], scale: [true,true,true] },  // x,y0,y1
  'line': { args: [1,2,3,4], scale: [true,true,true,true] },  // x0,y0,x1,y1
  'fillCircle': { args: [1,2,3], scale: [true,true,true] },  // cx,cy,r
  'fillEllipse': { args: [1,2,3,4], scale: [true,true,true,true] },  // cx,cy,rx,ry
  'fillTriangleUp': { args: [1,2,3,4], scale: [true,true,true,true] },  // cx,ay,hw,by
  'fillPolygon': null, // special
  'vGradient': { args: [1,2,3,4], scale: [true,true,true,true] },  // x0,x1,y0,y1
  'hGradient': { args: [1,2,3,4], scale: [true,true,true,true] },
  'ditherShadow': { args: [1,2,3,4], scale: [true,true,true,true] },  // cx,cy,rx,ry
  'rimLight': { args: [1,2,3,4], scale: [true,true,true,true] },  // x0,y0,x1,y1
  'sparkle': { args: [2,3,4,5], scale: [true,true,true,true] },  // x0,y0,x1,y1 (after rand)
  'radialGlow': { args: [1,2,3], scale: [true,true,true] },  // cx,cy,r
  'quadCurve': { args: [1,2,3,4,5,6,8], scale: [true,true,true,true,true,true,true] },  // x0,y0,cx,cy,x1,y1,thickness
  'sprinkle': { args: [2,3,4,5], scale: [true,true,true,true] },  // x0,y0,x1,y1 (after rand)
  'ditherStrip': { args: [1,2,3], scale: [true,true,true] },  // x0,x1,y
  'cloudShape': { args: [1,2,3,4], scale: [true,true,true,true] },  // cx,baseY,w,h
  'palmTree': { args: [1,2,3,4], scale: [true,true,true,true] },  // x0,y0,h,lean
  'brickWall': { args: [1,2,3,4,7,8], scale: [true,true,true,true,true,true] },  // x0,y0,w,h,bw,bh
};

// For each function, insert scaling code
for (const [funcName, spec] of Object.entries(funcScales)) {
  if (!spec) continue;
  const regex = new RegExp('export function ' + funcName + '\\(([^)]+)\\) \\{\\n', 'g');
  const match = regex.exec(content);
  if (!match) {
    console.log('NOT FOUND: ' + funcName);
    continue;
  }
  // Build scaling code
  const params = match[1].split(',').map(p => p.trim().split('=')[0].trim().split(' ')[0]);
  const scaleLines = [];
  for (let i = 0; i < spec.args.length; i++) {
    const argIdx = spec.args[i];
    const paramName = params[argIdx];
    if (paramName && spec.scale[i]) {
      scaleLines.push(paramName + ' = ' + paramName + ' * SCALE;');
    }
  }
  if (scaleLines.length === 0) continue;
  const scaleCode = scaleLines.join(' ');
  const oldStr = match[0];
  const newStr = oldStr + '  ' + scaleCode + '\n';
  content = content.replace(oldStr, newStr);
}

// fillPolygon: special handling
const fpOld = 'export function fillPolygon(g, pts, v) {\n  // bounding box';
const fpNew = 'export function fillPolygon(g, pts, v) {\n  pts = pts.map(([x, y]) => [x * SCALE, y * SCALE]);\n  // bounding box';
if (content.includes(fpOld)) {
  content = content.replace(fpOld, fpNew);
}

fs.writeFileSync('scripts/art-lib.mjs', content);
console.log('done');
"