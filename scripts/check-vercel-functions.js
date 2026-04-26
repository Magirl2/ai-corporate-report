import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const apiDir = path.join(projectRoot, 'api');

function countServerlessFunctions(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Vercel ignores folders starting with "_" or folders named "__tests__"
      if (!file.startsWith('_') && file !== '__tests__') {
        count += countServerlessFunctions(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      // Vercel ignores test files and files starting with "_"
      if (!file.startsWith('_') && !file.endsWith('.test.js') && !file.endsWith('.spec.js')) {
        count++;
      }
    }
  }

  return count;
}

try {
  const count = countServerlessFunctions(apiDir);
  console.log(`Total Vercel Serverless Functions in api/: ${count}`);

  if (count > 12) {
    console.error(`ERROR: Hobby plan allows max 12 functions. You have ${count}.`);
    process.exit(1);
  } else {
    console.log(`SUCCESS: Function count (${count}) is well within the Hobby plan limit of 12.`);
    process.exit(0);
  }
} catch (err) {
  console.error('Failed to count functions:', err);
  process.exit(1);
}
