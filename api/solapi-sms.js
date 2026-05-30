// Vercel Serverless: /api/solapi-sms — 솔라피(Solapi) 문자 발송 (HMAC 인증, IP 제한 없음)
// 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER(등록 발신번호)
import crypto from 'node:crypto';
const KEY = process.env.SOLAPI_API_KEY, SEC = process.env.SOLAPI_API_SECRET, FROM = process.env.SOLAPI_SENDER;
function authHeader(){
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', SEC).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}
export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST_ONLY' });
    if(!KEY || !SEC || !FROM) return res.status(200).json({ ok:false, error:'NO_ENV', message:'환경변수 SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER 를 설정하세요.' });
    let body = req.body; if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    const to = String(body.receiver||'').replace(/\D/g,'');
    const text = String(body.msg||body.message||'').trim();
    if(!to || !text) return res.status(200).json({ ok:false, error:'BAD_PARAM', message:'receiver, msg 가 필요합니다.' });
    const r = await fetch('https://api.solapi.com/messages/v4/send', {
      method:'POST', headers:{ 'Authorization': authHeader(), 'Content-Type':'application/json' },
      body: JSON.stringify({ message: { to, from: FROM, text } })
    });
    const j = await r.json().catch(()=>({}));
    const ok = !!(j.messageId || (j.statusCode && String(j.statusCode).startsWith('2')) || (j.groupInfo));
    return res.status(200).json({ ok, message: j.statusMessage || j.errorMessage || '', raw: j });
  }catch(e){ return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) }); }
}
