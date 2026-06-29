const axios = require('axios');
const fs = require('fs');

const PROXY_URL = 'https://coupang-proxy-pearl.vercel.app/api/coupang';
const COUPANG_ACCESS_KEY = process.env.COUPANG_ACCESS_KEY || '38f69b89-bf56-477e-82d0-ad1d934fc2f3';
const COUPANG_SECRET_KEY = process.env.COUPANG_SECRET_KEY || '3f192ef7a2bbe383b3909690793e84967de88e16';

const CLIENT_ID = '9qR6cesxG_fHgEDfnRQO';
const CLIENT_SECRET = 'qMiS0Q33pp';
const CLUB_ID = '31745334';

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  'AIzaSyDS_fDJ-22nn59OR0nekqm43on9FfGNtRw',
  'AIzaSyDKvJ_oX4CHjVMI4Nw6Z_sX-YOIfzLw368',
  'AIzaSyBsJmJFt6JYt77NwdB0E3cPaXCKGbRQIjQ',
  'AIzaSyBN1L4gD1Bu6vxoltmvc-1XX-yV2ZSl9GM',
  'AIzaSyBTuTYrvz9m4mrf6MqsDyhwL3jdkaxd_tA',
  'AIzaSyCGHvOi10yGxZC8giZxRcpZ73smLiUbmRs',
  'AIzaSyCqX18ZtNksY0GB-zY3VqXAD5uYZnXiWbY',
  'AIzaSyC5rS1Mu7g8o7rH_KdVaciJVMKKwwk8zOI',
  'AIzaSyCewwdnVEEoz7hX4Wg_wlvCKFcS0rLFnNQ',
  'AIzaSyB-R6kljD7ROZN9EmRoxCl_SEKq8LMsX58',
  'AIzaSyCr4t0oeqHGv0UbChlIZCjw86OdTw6sAJU',
  'AIzaSyBC35rmlGgMqUEXDGY0lYKQKZ-KNIkhAJM',
  'AIzaSyBqhZJC8mBHjprBdiYd6cK6uxFFsuyvg80',
  'AIzaSyAT1to7zvLHzuDZE2k7TjLV7z8zKBC6dQo',
  'AIzaSyBVNADjSx70B0dL8SvUXsxsPhcHjax20v0',
  'AIzaSyD2h9JP9hYLKcMATpTz87JUyDNIv2zmNtc',
  'AIzaSyBbr_fyhE9HcAnd1oB_z41U6IB0W__dFC4',
  'AIzaSyDYpWxkww2zrlFg71uPfA7iucabyXFLjSg'
].filter(Boolean);

const MENU_MAP = {
  '뷰티': '8', '패션': '6', '생활용품': '3',
  '식품': '2', '건강식품': '2', '유아용품': '5',
  '가전제품': '3', '스포츠용품': '7', '반려동물': '4', '기타': '8'
};

const BTN_TEXTS = {
  '뷰티': ['직접 써보고 괜찮아서 공유해요', '성분이랑 가격 한번 보세요', '다른 분들 후기도 확인해 보세요'],
  '패션': ['입어본 사람 후기 모아둔 곳이에요', '사이즈 가이드랑 재고 확인하기', '비슷한 스타일도 같이 보세요'],
  '건강식품': ['성분 직접 확인해 보세요', '복용 방법이랑 주의사항 꼭 보세요', '다른 분들 후기도 많이 있어요'],
  '가전제품': ['스펙이랑 가격 비교해 보세요', '설치 서비스 포함인지 확인하기', '실제 쓰는 분들 후기 보러 가기'],
  '유아용품': ['안전 인증 정보 확인해 보세요', '월령별로 맞는지 꼭 보세요', '다른 부모님들 후기 많이 있어요'],
  '식품': ['원산지랑 성분 확인해 보세요', '묶음 구성이 더 저렴해요', '정기배송 신청하면 할인돼요'],
  '생활용품': ['저도 실제로 쓰고 있는 거예요', '용량이랑 색상 선택 여기서 해요', '묶음 구매가 더 경제적이에요'],
  '스포츠용품': ['사이즈랑 무게 스펙 확인하기', '초보자용 구성이랑 비교해 보세요', '실제 운동하는 분들 후기 있어요'],
  '반려동물': ['성분이랑 급여량 확인해 보세요', '우리 아이 사이즈 맞는지 보세요', '다른 견주님들 후기 있어요'],
  '기타': ['직접 써보고 괜찮아서 공유해요', '가격이랑 재고 한번 확인해 보세요', '다른 분들 후기도 보세요']
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

// ✅ GitHub Actions에서 환경변수로 토큰 읽기 + 자동갱신
async function getAccessToken() {
  let accessToken = process.env.NAVER_ACCESS_TOKEN;
  const refreshToken = process.env.NAVER_REFRESH_TOKEN;

  console.log('🔍 디버그: accessToken 존재?', !!accessToken, '길이:', accessToken?.length);
  console.log('🔍 디버그: refreshToken 존재?', !!refreshToken, '길이:', refreshToken?.length);

  // 로컬 실행 시 tokens.json에서 읽기
  if (!accessToken && fs.existsSync('tokens.json')) {
    const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
    if (Date.now() > tokens.expires_at - 60000) {
      console.log('토큰 만료 → 자동 갱신 중...');
      const response = await axios.post('https://nid.naver.com/oauth2.0/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: tokens.refresh_token
        }
      });
      tokens.access_token = response.data.access_token;
      tokens.expires_at = Date.now() + (3600 * 1000);
      fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2), 'utf8');
      console.log('✅ 토큰 갱신 완료!');
    }
    return tokens.access_token;
  }

  // GitHub Actions: refresh_token으로 새 토큰 발급
  if (refreshToken) {
    console.log('🔄 GitHub Actions: refresh_token으로 토큰 갱신 중...');
    try {
      const response = await axios.post('https://nid.naver.com/oauth2.0/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken
        }
      });
      if (response.data.access_token) {
        console.log('✅ 토큰 갱신 성공!');
        return response.data.access_token;
      }
    } catch (e) {
      console.log('⚠️ 토큰 갱신 실패, 기존 토큰 사용:', e.message);
    }
  }

  return accessToken;
}

function cleanContent(content) {
  return content
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<a[^>]*>/gi, '')
    .replace(/<\/a>/gi, '');
}

async function searchCoupang(keyword) {
  const res = await axios.post(PROXY_URL, {
    action: 'search', accessKey: COUPANG_ACCESS_KEY,
    secretKey: COUPANG_SECRET_KEY, keyword, limit: 3
  });
  return res.data.products || [];
}

async function getDeeplink(productUrl) {
  try {
    const res = await axios.post(PROXY_URL, {
      action: 'deeplink', accessKey: COUPANG_ACCESS_KEY,
      secretKey: COUPANG_SECRET_KEY, productUrl
    });
    return res.data.url || productUrl;
  } catch (e) { return productUrl; }
}

async function callGemini(prompt) {
  const startIdx = geminiKeyIdx;
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const idx = (startIdx + i) % GEMINI_KEYS.length;
    const key = GEMINI_KEYS[idx];
    if (!key) continue;
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.92 } }
      );
      const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('응답 비어있음');
      geminiKeyIdx = (idx + 1) % GEMINI_KEYS.length;
      return text.trim();
    } catch (e) {
      const status = e.response?.status;
      if (status === 429 || status === 503 || status === 500) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error('모든 Gemini 키 실패');
}

async function generateTitle(productName, category) {
  return await callGemini(`상품명: ${productName}, 카테고리: ${category}\n네이버 카페 리뷰 제목 1개만 작성. 30자 이내. SEO 최적화. 제목만 출력.`);
}

async function generateReview(productName, category, productUrl, price, btnTexts) {
  const btn1 = `<br><br>─────────────────────────<br><b>👉 ${btnTexts[0]}</b><br>${productUrl}<br>─────────────────────────<br><br>`;
  const btn2 = `<br><br>─────────────────────────<br><b>👉 ${btnTexts[1]}</b><br>${productUrl}<br>─────────────────────────<br><br>`;
  const btn3 = `<br><br>─────────────────────────<br><b>👉 ${btnTexts[2]}</b><br>${productUrl}<br>─────────────────────────`;
  return await callGemini(`당신은 네이버 카페 전문 리뷰어입니다.\n상품명: ${productName}\n카테고리: ${category}\n가격: ${price}원\n\n아래 조건으로 카페 리뷰 본문만 작성:\n- 1000자 내외\n- 친근한 말투\n- 제목 없이 본문만 시작\n- 줄바꿈은 <br> 사용\n- 굵은글씨는 <b>태그 사용\n- 본문을 3등분해서 각 파트 끝에 버튼 삽입:\n  파트1 끝: ${btn1}\n  파트2 끝: ${btn2}\n  파트3 끝: ${btn3}\n- 본문 마지막에 해시태그 25개 한줄로\n\n본문만 출력. 제목/라벨 없이 바로 시작.`);
}

async function postToCafe(menuId, title, content) {
  const accessToken = await getAccessToken();
  const subject = encodeURIComponent(encodeURIComponent(title));
  const body = encodeURIComponent(encodeURIComponent(content));
  const response = await axios.post(
    `https://openapi.naver.com/v1/cafe/${CLUB_ID}/menu/${menuId}/articles`,
    'subject=' + subject + '&content=' + body + '&openyn=true',
    {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  return response.data.message.result.articleUrl;
}

async function main() {
  const count = parseInt(process.env.POST_COUNT || process.argv[2] || '5');
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
      const btnTexts = BTN_TEXTS[category] || BTN_TEXTS['기타'];
      const title = await generateTitle(product.productName, category);
      const reviewContent = await generateReview(product.productName, category, deeplink, product.productPrice, btnTexts);
      const disclaimer = `<b>※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</b><br><br>`;
      const finalContent = disclaimer + cleanContent(reviewContent);
      const menuId = MENU_MAP[category] || '8';
      const url = await postToCafe(menuId, title, finalContent);
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
