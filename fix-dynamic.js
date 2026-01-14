const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get files that need force-dynamic
const output = execSync('find app -path "*/\\(dashboard\\)/*" -name "page.tsx" -exec grep -L "force-dynamic" {} \\;', { encoding: 'utf8' });
const files = output.trim().split('\n').filter(Boolean);

console.log('Files to update:', files.length);

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check if already has the directive
    if (content.includes("export const dynamic")) {
      console.log('Skip (already has):', file);
      return;
    }
    
    // Check if it uses createServerClient or getCurrentUser
    if (!content.includes('createServerClient') && !content.includes('getCurrentUser')) {
      console.log('Skip (no server calls):', file);
      return;
    }
    
    // Find the last import statement and insert after it
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].match(/^import\s*\{/)) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex > -1) {
      lines.splice(lastImportIndex + 1, 0, '', "export const dynamic = 'force-dynamic'");
      fs.writeFileSync(file, lines.join('\n'));
      console.log('Updated:', file);
    } else {
      console.log('Could not find imports in:', file);
    }
  } catch (e) {
    console.log('Error processing:', file, e.message);
  }
});

console.log('Done!');
