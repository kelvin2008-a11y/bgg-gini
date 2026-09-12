const SNU_PROGRAMS_URL = 'https://extra.snu.ac.kr/ptfol/pgm/index.do';

function decode(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function categoryFor(text) {
  if (/봉사|사회공헌|지역|나눔/.test(text)) return ['사회공헌 · 봉사', 'green'];
  if (/공모|경진|창업|아이디어/.test(text)) return ['공모전 · 경진대회', 'pink'];
  if (/인턴|현장|탐방/.test(text)) return ['현장학습 · 인턴', 'yellow'];
  if (/상담|진로|학습/.test(text)) return ['학습 · 진로상담', 'yellow'];
  return ['교육 · 특강/세미나', 'green'];
}

function parsePrograms(html) {
  const candidates = html.split(/(?=모집중|마감임박|모집대기)/).slice(1, 25);
  const seen = new Set();
  const programs = [];
  for (const chunk of candidates) {
    const text = decode(chunk);
    const titleMatch = text.match(/(?:교육\s*\(특강\/세미나\)|공모전\/경진대회|현장학습\/인턴|사회공헌\s*\(봉사\)|학습\/진로상담|레크리에이션|기타)\s*([^#]{8,160}?)(?=\s*#[가-힣A-Za-z0-9]|신청대상|신청기간|활동기간)/);
    const title = titleMatch ? titleMatch[1].trim() : null;
    if (!title || seen.has(title) || /프로그램명 또는 키워드/.test(title)) continue;
    seen.add(title);
    const [tag, type] = categoryFor(text);
    const period = (text.match(/신청기간\s*([^활]{5,50})/) || [])[1]?.trim() || '신청 기간은 SNU 비교과에서 확인';
    programs.push({ title, tag, type, match: 90 - programs.length * 3, desc: 'SNU 비교과에 등록된 최신 프로그램입니다. 상세 내용과 신청 조건을 확인해 보세요.', meta: period, live: true, url: SNU_PROGRAMS_URL });
    if (programs.length === 12) break;
  }
  return programs;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/programs') {
      try {
        const response = await fetch(SNU_PROGRAMS_URL, { headers: { 'User-Agent': 'Bigyogwa-Jini/1.0' }, cf: { cacheTtl: 900, cacheEverything: true } });
        if (!response.ok) throw new Error(`SNU response ${response.status}`);
        const programs = parsePrograms(await response.text());
        if (!programs.length) throw new Error('No program cards detected');
        return Response.json({ source: SNU_PROGRAMS_URL, updatedAt: new Date().toISOString(), programs }, { headers: { 'Cache-Control': 'public, max-age=900' } });
      } catch {
        return Response.json({ source: SNU_PROGRAMS_URL, updatedAt: null, programs: [], error: 'SNU 비교과 정보를 지금 가져오지 못했습니다.' }, { status: 502 });
      }
    }
    return env.ASSETS.fetch(request);
  }
};
