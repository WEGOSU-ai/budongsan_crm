// Vercel Serverless: /api/sms — 알리고 문자 발송
// PROXY_URL 설정 시: 고정 IP 프록시로 우회(알리고엔 프록시 IP만 등록).
// 미설정 시: Vercel에서 직접 알리고 호출(IP 유동 → 알리고 IP 인증 꺼야 함).
const PURL = process.env.PROXY_URL, PTOK = process.env.PROXY_TOKEN || '';
async function viaProxy(path, body){
  const r = await fetch(PURL.replace(/\/$/,'') + path, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + PTOK }, body: JSON.stringify(body) });
  return r.json().catch(()=>({ ok:false, error:'PROXY_BAD_JSON' }));
}
export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST_ONLY' });
    let body = req.body; if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    if(PURL) return res.status(200).json(await viaProxy('/sms', body));

    const KEY = process.env.ALIGO_API_KEY, UID = process.env.ALIGO_USER_ID, SENDER = process.env.ALIGO_SENDER;
    if(!KEY || !UID || !SENDER) return res.status(200).json({ ok:false, error:'NO_ENV', message:'PROXY_URL 또는 ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDER 를 설정하세요.' });
    const receiver = String(body.receiver||'').replace(/\D/g,'');
    const msg = String(body.msg||'').trim();
    if(!receiver || !msg) return res.status(200).json({ ok:false, error:'BAD_PARAM', message:'receiver, msg 가 필요합니다.' });
    const form = new URLSearchParams();
    form.set('key', KEY); form.set('user_id', UID); form.set('sender', SENDER);
    form.set('receiver', receiver); form.set('msg', msg);
    if(body.title) form.set('title', String(body.title).slice(0,40));
    form.set('msg_type', (Buffer.byteLength(msg,'utf8') > 90) ? 'LMS' : 'SMS');
    if(body.testmode) form.set('testmode_yn', 'Y');
    const r = await fetch('https://apis.aligo.in/send/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: form.toString() });
    const j = await r.json().catch(()=>({}));
    let callerIp = null; try{ callerIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; }catch(e){}
    return res.status(200).json({ ok:String(j.result_code)==='1', message:j.message||'', mid:j.msg_id||null, callerIp, raw:j });
  }catch(e){ return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) }); }
}
