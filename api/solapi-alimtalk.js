// Vercel Serverless: /api/solapi-alimtalk — 솔라피 카카오 알림톡 발송 (HMAC 인증)
// 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER(대체문자 발신번호),
//          SOLAPI_PFID(카카오 발신프로필 ID), SOLAPI_TEMPLATE_ID(승인 템플릿 ID)
// 변수 치환: body.variables (예: {"#{이름}":"홍길동"}) — 승인 템플릿의 변수명과 일치해야 함.
import crypto from 'node:crypto';
const KEY = process.env.SOLAPI_API_KEY, SEC = process.env.SOLAPI_API_SECRET, FROM = process.env.SOLAPI_SENDER, PFID = process.env.SOLAPI_PFID, TPLID = process.env.SOLAPI_TEMPLATE_ID;
function authHeader(){
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', SEC).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}
export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST_ONLY' });
    if(!KEY || !SEC || !PFID || !TPLID) return res.status(200).json({ ok:false, error:'NO_ENV', message:'환경변수 SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_PFID / SOLAPI_TEMPLATE_ID 를 설정하세요.' });
    let body = req.body; if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    const to = String(body.receiver||'').replace(/\D/g,'');
    if(!to) return res.status(200).json({ ok:false, error:'BAD_PARAM', message:'receiver 가 필요합니다.' });
    const variables = (body.variables && typeof body.variables === 'object') ? body.variables : { '#{이름}': String(body.recvname||'') };
    const message = {
      to, from: FROM || undefined,
      type: 'ATA',
      kakaoOptions: { pfId: PFID, templateId: TPLID, variables, disableSms: false }
    };
    const r = await fetch('https://api.solapi.com/messages/v4/send', {
      method:'POST', headers:{ 'Authorization': authHeader(), 'Content-Type':'application/json' },
      body: JSON.stringify({ message })
    });
    const j = await r.json().catch(()=>({}));
    const ok = !!(j.messageId || (j.statusCode && String(j.statusCode).startsWith('2')) || (j.groupInfo));
    return res.status(200).json({ ok, message: j.statusMessage || j.errorMessage || '', raw: j });
  }catch(e){ return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) }); }
}
