const fs = require('fs');
const path = require('path');

function ensurePrettyFormatNested() {
  const root = process.cwd();
  const source = path.join(root, 'node_modules', 'pretty-format');
  const target = path.join(root, 'node_modules', 'jest-circus', 'node_modules', 'pretty-format');

  if (!fs.existsSync(source)) {
    console.warn('[postinstall] pretty-format not found at root. Skipping.');
    return;
  }

  const targetIndex = path.join(target, 'build', 'index.js');
  if (fs.existsSync(targetIndex)) {
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });

  try {
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(source, target, { recursive: true });
    console.log('[postinstall] Copied pretty-format into jest-circus/node_modules (repair).');
  } catch (err) {
    console.warn('[postinstall] Failed to copy pretty-format into jest-circus:', err);
  }
}

ensurePrettyFormatNested();
