// Vercel Serverless: /api/solapi-templates — 솔라피 카카오 알림톡 템플릿 목록 조회
// 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, (선택)SOLAPI_PFID(특정 채널만 필터)
import crypto from 'node:crypto';
const KEY = process.env.SOLAPI_API_KEY, SEC = process.env.SOLAPI_API_SECRET, PFID = process.env.SOLAPI_PFID;
function authHeader(){
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', SEC).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}
export default async function handler(req, res){
  try{
    if(!KEY || !SEC) return res.status(200).json({ ok:false, error:'NO_ENV', message:'환경변수 SOLAPI_API_KEY / SOLAPI_API_SECRET 를 설정하세요.' });
    const r = await fetch('https://api.solapi.com/kakao/v2/templates?limit=100', { headers:{ 'Authorization': authHeader() } });
    const j = await r.json().catch(()=>({}));
    const arr = j.templateList || j.list || j.data || (Array.isArray(j) ? j : []);
    let list = (Array.isArray(arr) ? arr : []).map(t => ({
      code: t.templateId || t.id || '',
      name: t.name || '',
      content: t.content || '',
      status: t.status || t.inspectionStatus || '',
      pfId: t.pfId || t.channelId || '',
      emphasizeType: t.emphasizeType || 'NONE',
      emphasizeTitle: t.emphasizeTitle || '',
      emphasizeSubtitle: t.emphasizeSubtitle || '',
      buttons: (Array.isArray(t.buttons) ? t.buttons : []).map(b => ({ name: b.buttonName || b.name || '', type: b.buttonType || '' }))
    }));
    if(PFID){ const f = list.filter(t => t.pfId === PFID); if(f.length) list = f; }
    return res.status(200).json({ ok: list.length > 0, count: list.length, list, raw: j });
  }catch(e){ return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) }); }
}
