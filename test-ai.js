import fs from 'fs';
const envPaths = ['c:/Users/wnsru/ai-corporate-report/.env'];
let apiKey = '';
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf-8');
    const match = content.match(/VITE_GEMINI_API_KEY="([^"]+)"/);
    if (match) apiKey = match[1];
  }
}

async function testAI(companyName) {
  const prompt = `
Task: Identify the stock exchange of "${companyName}".
If it is a South Korean company traded on KRX (KOSPI/KOSDAQ, e.g., 삼성전자, 카카오), output EXACTLY the word: KOREAN
If it is a US or global company traded on US exchanges (e.g., Apple, Nvidia, 조비 에비에이션), output EXACTLY its official US ticker symbol (e.g., AAPL, NVDA, JOBY).
DO NOT output any markdown, punctuation, or thinking blocks. Output ONLY the uppercase ticker or the word KOREAN.
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.0, maxOutputTokens: 100 }
    })
  }).then(r => r.json());
  
  let text = response.candidates?.[0]?.content?.parts?.[0]?.text?.toUpperCase() || '';
  let finalResult = text.trim();
  if (text.includes('KOREAN')) finalResult = 'KOREAN';
  else {
    const words = text.match(/\b[A-Z0-9-]{1,8}\b/g);
    if (words && words.length > 0) {
      finalResult = words[words.length - 1];
    }
  }
  
  console.log(`[${companyName}] -> AI Text: "${text.trim().replace(/\n/g, '\\n')}" -> Final: ${finalResult}`);
}

(async () => {
    await testAI('조비 에비에이션');
    await testAI('루시드');
    await testAI('테슬라');
    await testAI('팔란티어');
    await testAI('마이크로소프트');
    await testAI('암');
    await testAI('쿠팡');
    await testAI('삼성바이오로직스');
})();
