const axios = require('axios');

const PROXY_URL = 'https://coupang-proxy-pearl.vercel.app/api/coupang';
const CAFE_PROXY_URL = process.env.CAFE_PROXY_URL;
const COUPANG_ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const COUPANG_SECRET_KEY = process.env.COUPANG_SECRET_KEY;
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
];

const MENU_MAP = {
  '뷰티': '6', '패션': '6', '생활용품': '3',
  '식품': '2', '건강식품': '2', '유아용품': '5',
  '가전제품': '3', '스포츠용품': '7', '반려동물': '4', '기타': '8'
};

const SEARCH_KEYWORDS = [
  { keyword: '스킨케어 크림', category: '뷰티' },
  { keyword: '마스크팩', category: '뷰티' },
  { keyword: '비타민', category: '건강식품' },
  { keyword: '유산균', category: '건강식품' },
  { keyword: '주방용품', category: '생활용품' },
  { keyword: '청소용품', category: '생활용품' },
  { keyword: '간편식', category: '식품' },
  { keyword: '운동기구', category: '스포츠용품' },
  { keyword: '아기용품', category: '유아용품' },
  { keyword: '반려동물 간식', category: '반려동물' }
];

let geminiKeyIdx = 0;

async function searchCoupang(keyword) {
  const res = await axios.post(PROXY_URL, {
    action: 'search',
    accessKey: COUPANG_ACCESS_KEY,
    secretKey: COUPANG_SECRET_KEY,
    keyword,
    limit: 3
  });
  return res.data.products || [];
}

async function getDeeplink(productUrl) {
  try {
    const res = await axios.post(PROXY_URL, {
      action: 'deeplink',
      accessKey: COUPANG_ACCESS_KEY,
      secretKey: COUPANG_SECRET_KEY,
      productUrl
    });
    return res.data.url || productUrl;
  } catch (e) {
    return productUrl;
  }
}

async function generateReview(productName, category, productUrl, price) {
  const prompt = `당신은 네이버 카페 전문 리뷰어입니다.

상품명: ${productName}
카테고리: ${category}
가격: ${price}원
구매링크: ${productUrl}

아래 조건으로 카페 리뷰를 작성해주세요:
- 800자 내외
- 친근한 말투
- 제목 1개 (30자 이내)
- 줄바꿈은 <br> 사용
- 굵은글씨는 <b>태그 사용
- 장단점 포함
- 마지막에 반드시: 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.

출력형식:
제목: (제목)
내용:
(내용)`;

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const idx = (geminiKeyIdx + i) % GEMINI_KEYS.length;
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEYS[idx]}`,
        { contents: [{ parts: [{ text: prompt }] }] }
      );
      geminiKeyIdx = idx;
      return res.data.candidates[0].content.parts[0].text;
    } catch (e) {
      if (e.response?.status === 429) continue;
      throw e;
    }
  }
  throw new Error('모든 Gemini 키 실패');
}

async function postToCafe(menuId, title, content) {
  const res = await axios.post(CAFE_PROXY_URL, {
    action: 'post',
    menu_id: menuId,
    title,
    content
  });
  return res.data.result?.articleUrl;
}

function extractTitle(text) {
  const match = text.match(/제목:\s*(.+)/);
  return match ? match[1].trim() : '상품 리뷰';
}

function extractContent(text) {
  const match = text.match(/내용:\s*([\s\S]+)/);
  return match ? match[1].trim() : text;
}

async function main() {
  const count = parseInt(process.env.POST_COUNT || '5');
  const keywords = SEARCH_KEYWORDS.slice(0, count);
  
  console.log(`🚀 자동 포스팅 시작! ${count}개 게시 예정`);
  
  let success = 0;
  
  for (let i = 0; i < keywords.length; i++) {
    const { keyword, category } = keywords[i];
    console.log(`\n[${i+1}/${count}] ${keyword} 처리 중...`);
    
    try {
      const products = await searchCoupang(keyword);
      if (!products.length) { console.log('상품 없음'); continue; }
      
      const product = products[0];
      console.log(`상품: ${product.productName}`);
      
      const deeplink = await getDeeplink(product.productUrl);
      const review = await generateReview(product.productName, category, deeplink, product.productPrice);
      
      const title = extractTitle(review);
      const content = extractContent(review);
      const menuId = MENU_MAP[category] || '8';
      
      const url = await postToCafe(menuId, title, content);
      console.log(`✅ 게시 완료! ${url}`);
      success++;
      
      await new Promise(r => setTimeout(r, 10000));
      
    } catch (e) {
      console.log(`❌ 오류: ${e.message}`);
    }
  }
  
  console.log(`\n🎉 완료! ${success}/${count}개 성공`);
}

main();
