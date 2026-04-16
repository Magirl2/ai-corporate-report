import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...valParts] = line.split('=');
  if (key && valParts.length > 0) {
    let val = valParts.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key.trim()] = val;
  }
});
const apiKey = process.env.GEMINI_API_KEY;
import https from 'https';

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
        console.log(JSON.parse(data).models?.map(m => m.name).join('\n') || data);
    } catch(e) {
        console.log("Error parsing:", data);
    }
  });
});
