const fs = require('fs');
const path = require('path');

function replaceConsoleWithLogger(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceConsoleWithLogger(fullPath);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('logger.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Make sure we only import logger if we are going to replace something
      if (content.match(/console\.(log|error|warn)/)) {
        content = content.replace(/console\.log/g, 'logger.info');
        content = content.replace(/console\.error/g, 'logger.error');
        content = content.replace(/console\.warn/g, 'logger.warn');
        changed = true;

        // Figure out relative path to logger
        const depth = fullPath.substring(path.join(__dirname, 'src').length).split(path.sep).length - 2;
        const relativePath = depth > 0 ? '../'.repeat(depth) + 'utils/logger' : './utils/logger';
        
        if (!content.includes('import { logger }')) {
          content = `import { logger } from '${relativePath}';\n` + content;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

replaceConsoleWithLogger(path.join(__dirname, 'src'));
