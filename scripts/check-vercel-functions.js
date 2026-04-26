import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const apiDir = path.join(projectRoot, 'api');

function getServerlessFunctions(dir, basePath = 'api') {
  let functions = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Vercel ignores folders starting with "_" or folders named "__tests__"
      if (!file.startsWith('_') && file !== '__tests__') {
        functions = functions.concat(getServerlessFunctions(fullPath, `${basePath}/${file}`));
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      // Vercel ignores test files and files starting with "_"
      if (!file.startsWith('_') && !file.endsWith('.test.js') && !file.endsWith('.spec.js')) {
        functions.push(`${basePath}/${file}`);
      }
    }
  }

  return functions;
}

try {
  const functions = getServerlessFunctions(apiDir);
  const count = functions.length;

  if (count > 12) {
    console.error(`\n❌ Vercel Serverless Function count exceeded: ${count}/12`);
    functions.forEach(f => console.error(`- ${f}`));
    process.exit(1);
  } else {
    console.log(`\n✅ Vercel Serverless Function count: ${count}/12`);
    functions.forEach(f => console.log(`- ${f}`));
    process.exit(0);
  }
} catch (err) {
  console.error('Failed to count functions:', err);
  process.exit(1);
}
