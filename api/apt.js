// Vercel Serverless Function: /api/apt
// 공공데이터포털(data.go.kr) 공동주택 기본/상세정보 + 아파트 매매 실거래가 프록시
// 환경변수: DATA_GO_KR_KEY  (data.go.kr "일반 인증키(Decoding)")
//
// 사용:
//   /api/apt?op=ping                         → 키 설정 확인
//   /api/apt?name=타워팰리스3차&sgg=11680      → 단지 기본정보(세대수·주차·연식·시공사) + 시세
//   /api/apt?op=price&lawd=11680&name=...     → 시세만
// 같은 도메인에서 호출하므로 CORS 불필요.

const KEY = process.env.DATA_GO_KR_KEY || '';

function tag(xml, name){
  const m = xml.match(new RegExp('<' + name + '>([\\s\\S]*?)<\\/' + name + '>'));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}
function tagAny(xml, names){ for (const n of names){ const v = tag(xml, n); if (v) return v; } return ''; }
function blocks(xml, name){ return [...xml.matchAll(new RegExp('<' + name + '>([\\s\\S]*?)<\\/' + name + '>', 'g'))].map(m => m[1]); }
function norm(s){ return String(s || '').replace(/\s|\(.*?\)|[·\-]/g, ''); }

async function getXml(url){
  const r = await fetch(url);
  const t = await r.text();
  return { status: r.status, text: t };
}

// 단지목록(시군구) → kaptCode 후보
async function findKaptCode(sgg, name){
  const endpoints = [
    'http://apis.data.go.kr/1611000/AptListService3/getSigunguAptList3',
    'http://apis.data.go.kr/1611000/AptListService2/getSigunguAptList'
  ];
  let cands = [];
  for (const ep of endpoints){
    const url = `${ep}?serviceKey=${encodeURIComponent(KEY)}&sigunguCode=${sgg}&numOfRows=3000&pageNo=1`;
    const { text } = await getXml(url);
    const items = blocks(text, 'item');
    if (items.length){
      cands = items.map(it => ({ code: tagAny(it, ['kaptCode']), name: tagAny(it, ['kaptName']) })).filter(x => x.code);
      if (cands.length) break;
    }
  }
  const want = norm(name);
  const exact = cands.find(c => norm(c.name) === want);
  const partial = cands.filter(c => want && (norm(c.name).includes(want) || want.includes(norm(c.name))));
  return { match: exact || partial[0] || null, candidates: partial.slice(0, 8), total: cands.length };
}

// 기본 + 상세 정보 병합
async function getInfo(code){
  const eps = [
    'http://apis.data.go.kr/1611000/AptBasisInfoServiceV3/getAphusBassInfoV3',
    'http://apis.data.go.kr/1611000/AptBasisInfoService/getAphusBassInfo'
  ];
  const dps = [
    'http://apis.data.go.kr/1611000/AptBasisInfoServiceV3/getAphusDtlInfoV3',
    'http://apis.data.go.kr/1611000/AptBasisInfoService/getAphusDtlInfo'
  ];
  let merged = {};
  for (const ep of eps){
    const { text } = await getXml(`${ep}?serviceKey=${encodeURIComponent(KEY)}&kaptCode=${code}`);
    const it = blocks(text, 'item')[0] || text;
    if (tag(it, 'kaptName')) { mergeTags(merged, it); break; }
  }
  for (const dp of dps){
    const { text } = await getXml(`${dp}?serviceKey=${encodeURIComponent(KEY)}&kaptCode=${code}`);
    const it = blocks(text, 'item')[0] || text;
    if (tag(it, 'kaptdPcntu') || tag(it, 'kaptdPcnt')) { mergeTags(merged, it); break; }
  }
  return {
    raw: merged,
    세대수: merged.kaptdaCnt || '',
    동수: merged.kaptDongCnt || '',
    사용승인일: merged.kaptUsedate || '',
    시공사: merged.kaptBcompany || merged.kaptAcompany || '',
    총주차대수: String((+(merged.kaptdPcnt || 0)) + (+(merged.kaptdPcntu || 0)) || merged.kaptdPcnt || ''),
    난방방식: merged.codeHeatNm || '',
    단지명: merged.kaptName || ''
  };
}
function mergeTags(obj, xml){
  for (const m of xml.matchAll(/<([a-zA-Z][\w]*)>([\s\S]*?)<\/\1>/g)){
    obj[m[1]] = m[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
  }
}

// 실거래가: 최근 N개월 스캔, 단지명 일치 거래 평균
async function getPrice(lawd, name, months = 6){
  const now = new Date();
  const want = norm(name);
  const eps = [
    'http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
    'http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade'
  ];
  for (let i = 0; i < months; i++){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (const ep of eps){
      const url = `${ep}?serviceKey=${encodeURIComponent(KEY)}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=1`;
      const { text } = await getXml(url);
      const items = blocks(text, 'item');
      if (!items.length) continue;
      const deals = items.map(it => ({
        apt: tagAny(it, ['aptNm', '아파트']),
        amt: parseInt((tagAny(it, ['dealAmount', '거래금액']) || '').replace(/[^0-9]/g, ''), 10) || 0,
        area: tagAny(it, ['excluUseAr', '전용면적']),
        floor: tagAny(it, ['floor', '층'])
      })).filter(x => x.amt && want && norm(x.apt).includes(want));
      if (deals.length){
        const avg = Math.round(deals.reduce((s, x) => s + x.amt, 0) / deals.length);
        return { 기준월: ym, 건수: deals.length, 평균만원: avg, 최근거래: deals.slice(0, 5), 표시: `${(avg/10000).toFixed(1)}억(${ym.slice(0,4)}.${ym.slice(4)}, ${deals.length}건 평균)` };
      }
    }
  }
  return { 표시: '최근 6개월 실거래 없음', 건수: 0 };
}

export default async function handler(req, res){
  try{
    const q = req.query || {};
    if (!KEY) return res.status(200).json({ ok: false, error: 'NO_KEY', message: 'Vercel 환경변수 DATA_GO_KR_KEY가 설정되지 않았습니다.' });
    if (q.op === 'ping') return res.status(200).json({ ok: true, keySet: true });

    const name = (q.name || '').trim();
    const sgg = (q.sgg || q.lawd || '').trim();
    if (!name || !sgg) return res.status(200).json({ ok: false, error: 'BAD_PARAM', message: 'name과 sgg(5자리)가 필요합니다.' });

    if (q.op === 'price'){
      const price = await getPrice(sgg, name);
      return res.status(200).json({ ok: true, price });
    }

    const found = await findKaptCode(sgg, name);
    let info = null;
    if (found.match) info = await getInfo(found.match.code);
    const price = await getPrice(sgg, name);
    return res.status(200).json({
      ok: true,
      matched: found.match,
      candidates: found.candidates,
      listTotal: found.total,
      info,
      price
    });
  } catch (e){
    return res.status(200).json({ ok: false, error: 'EXCEPTION', message: String(e && e.message || e) });
  }
}
