// Vercel Serverless: /api/templates — 알리고 알림톡 승인 템플릿 목록 (PROXY_URL 설정 시 프록시 우회)
const PURL = process.env.PROXY_URL, PTOK = process.env.PROXY_TOKEN || '';
async function viaProxy(path, body){
  const r = await fetch(PURL.replace(/\/$/,'') + path, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + PTOK }, body: JSON.stringify(body||{}) });
  return r.json().catch(()=>({ ok:false, error:'PROXY_BAD_JSON' }));
}
export default async function handler(req, res){
  try{
    if(PURL) return res.status(200).json(await viaProxy('/templates', {}));
    const KEY = process.env.ALIGO_API_KEY, UID = process.env.ALIGO_USER_ID, SK = process.env.ALIGO_SENDERKEY;
    if(!KEY || !UID || !SK) return res.status(200).json({ ok:false, error:'NO_ENV', message:'PROXY_URL 또는 ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDERKEY 를 설정하세요.' });
    const tr = await fetch('https://kakaoapi.aligo.in/akv10/token/create/30/s/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ apikey:KEY, userid:UID }).toString() });
    const tj = await tr.json().catch(()=>({})); const token = tj.token;
    if(!token) return res.status(200).json({ ok:false, error:'TOKEN', message: tj.message || '토큰 발급 실패', raw: tj });
    const f = new URLSearchParams({ apikey:KEY, userid:UID, token, senderkey:SK });
    const r = await fetch('https://kakaoapi.aligo.in/akv10/template/list/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: f.toString() });
    const j = await r.json().catch(()=>({}));
    const arr = j.list || j.data || [];
    const list = (Array.isArray(arr)?arr:[]).map(t => ({ code:t.templtCode||t.tpl_code||'', name:t.templtName||t.tpl_name||'', content:t.templtContent||t.tpl_content||'', status:t.status||t.inspStatus||'' }));
    return res.status(200).json({ ok:list.length>0, count:list.length, list, raw:j });
  }catch(e){ return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) }); }
}
