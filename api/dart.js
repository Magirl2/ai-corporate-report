// api/dart.js (Vercel Serverless Function)
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 1. 브라우저에서 보낸 파라미터를 받습니다.
  const { crtfc_key, corp_name, corp_code } = req.query;

  // 2. 한글 검색어의 경우 안전하게 인코딩합니다.
  const encodedName = encodeURIComponent(corp_name);

  // 3. DART API 호출 (예: 기업개황 조회)
  // 만약 corp_code가 있으면 그걸 쓰고, 없으면 이름을 씁니다.
  const targetUrl = corp_code 
    ? `https://opendart.fss.or.kr/api/company.json?crtfc_key=${crtfc_key}&corp_code=${corp_code}`
    : `https://opendart.fss.or.kr/api/list.json?crtfc_key=${crtfc_key}&corp_name=${encodedName}&bgn_de=20240101`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    // 결과를 브라우저로 다시 보내줌
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'DART API 통신 오류' });
  }
}