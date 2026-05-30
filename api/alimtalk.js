// Vercel Serverless: /api/alimtalk — 알리고 알림톡 발송 (PROXY_URL 설정 시 프록시 우회)
const PURL = process.env.PROXY_URL, PTOK = process.env.PROXY_TOKEN || '';
async function viaProxy(path, body){
  const r = await fetch(PURL.replace(/\/$/,'') + path, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + PTOK }, body: JSON.stringify(body) });
  return r.json().catch(()=>({ ok:false, error:'PROXY_BAD_JSON' }));
}
export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST_ONLY' });
    let body = req.body; if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    if(PURL) return res.status(200).json(await viaProxy('/alimtalk', body));

    const KEY = process.env.ALIGO_API_KEY, UID = process.env.ALIGO_USER_ID, SK = process.env.ALIGO_SENDERKEY, TPL = process.env.ALIGO_TPL_CODE, SENDER = process.env.ALIGO_SENDER;
    if(!KEY || !UID || !SK || !TPL) return res.status(200).json({ ok:false, error:'NO_ENV', message:'PROXY_URL 또는 ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDERKEY/ALIGO_TPL_CODE 를 설정하세요.' });
    const receiver = String(body.receiver||'').replace(/\D/g,'');
    const message = String(body.message||'').trim();
    if(!receiver || !message) return res.status(200).json({ ok:false, error:'BAD_PARAM' });
    const tr = await fetch('https://kakaoapi.aligo.in/akv10/token/create/30/s/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ apikey:KEY, userid:UID }).toString() });
    const tj = await tr.json().catch(()=>({})); const token = tj.token;
    if(!token) return res.status(200).json({ ok:false, error:'TOKEN', message: tj.message || '토큰 발급 실패', raw: tj });
    const f = new URLSearchParams();
    f.set('apikey', KEY); f.set('userid', UID); f.set('token', token); f.set('senderkey', SK); f.set('tpl_code', TPL);
    if(SENDER) f.set('sender', SENDER);
    f.set('receiver_1', receiver); f.set('recvname_1', String(body.recvname||'').slice(0,30)); f.set('subject_1', String(body.subject||'안내').slice(0,40)); f.set('message_1', message);
    const sr = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: f.toString() });
    const sj = await sr.json().catch(()=>({}));
    return res.status(200).json({ ok:String(sj.code)==='0', message:sj.message||'', raw:sj });
  }catch(e){ return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) }); }
}
