// src/api/companyService.js

// ... (fetchDartDisclosures 등 윗부분 코드는 그대로 유지) ...

// --- 3. 핵심 분석 실행 ---
export const fetchCompanyData = async (companyName, onStatusUpdate) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini API 키가 설정되지 않았습니다.");

  // 💡 1. 모델을 최신, 최고성능의 Pro 모델로 변경 (플래시보다 훨씬 길고 논리적으로 씁니다)
  const model = 'gemini-1.5-pro'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  onStatusUpdate?.(`[${companyName}] DART 전자공시 데이터 수집 중...`);
  const dartInfo = await fetchDartDisclosures(companyName);

  onStatusUpdate?.(`[${companyName}] AI 통합 심층 분석 및 리포트 작성 중...`);

  // 💡 2. 프롬프트 강화: AI가 대충 쓰지 않도록 '분량'과 '전문성'을 강제합니다.
  const prompt = `
    당신은 월스트리트 최고 수준의 시니어 기업 분석가입니다.
    Analyze the company: '${companyName}'.
    
    [Official DART Disclosures Data from Korea]:
    ${dartInfo}

    Provide a VERY COMPREHENSIVE business report in JSON format.
    
    [CRITICAL INSTRUCTIONS FOR LENGTH & QUALITY]
    - 각 항목의 "detail" 필드는 최소 3~4개의 문단으로 아주 길고 상세하게 작성하세요.
    - 두루뭉술한 설명 대신 구체적인 수치, 글로벌 시장 동향, 경쟁사 비교, 리스크 원인을 반드시 포함하세요.
    
    Include:
    1. Macro trends impacting them.
    2. Market sentiment (Positive, Neutral, Negative) with 3 specific reasons.
    3. Core business model and vision.
    4. Financial health metrics for the last 3 years (Growth, Margin, Debt, ROE, EPS).
    5. Two recent significant news headlines. (If Korean company, deeply analyze the DART data provided).
    6. Future risks and outlook (Be very specific).

    Response must be ONLY JSON in this structure:
    {
      "companyName": "Official Name",
      "macroTrend": { "summary": "Short summary", "detail": "Longer detail (Minimum 3 paragraphs)" },
      "report": {
        "marketSentiment": { "status": "Positive/Neutral/Negative", "analysis": ["Reason 1", "Reason 2", "Reason 3"] },
        "vision": { "summary": "...", "detail": "..." },
        "businessModel": { "summary": "...", "detail": "..." },
        "industryStatus": { "summary": "...", "detail": "..." },
        "financialAnalysis": {
          "overview": { "summary": "...", "detail": "..." },
          "keyMetrics": [
            { "year": "2024", "revenueGrowth": "X%", "operatingMargin": "X%", "debtRatio": "X%", "roe": "X%", "eps": "X" }
          ]
        },
        "recentNews": [
          { "headline": "Title", "summary": "Summary", "detail": "Detail" }
        ],
        "marketRiskAndOutlook": { "summary": "...", "detail": "..." }
      }
    }
    Translate all text content to Korean.
  `;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    // 💡 3. 유료 API에 맞춰 출력 토큰 증가 및 JSON 포맷 강제 설정 추가
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.3, // 0.3으로 설정하여 분석의 객관성과 논리성을 높임
      responseMimeType: "application/json" // 확실한 JSON 응답 보장
    }
  };

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("분석 결과를 처리할 수 없습니다.");
  return JSON.parse(jsonStr);
};