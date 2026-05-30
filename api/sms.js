// Vercel Serverless Function: /api/sms — 알리고(Aligo) 문자(SMS/LMS) 발송
// 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER(사전등록 발신번호)
// 호출(브라우저, 같은 도메인): POST /api/sms  {receiver, msg, title?, testmode?}

export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST_ONLY' });
    const KEY = process.env.ALIGO_API_KEY, UID = process.env.ALIGO_USER_ID, SENDER = process.env.ALIGO_SENDER;
    if(!KEY || !UID || !SENDER) return res.status(200).json({ ok:false, error:'NO_ENV', message:'Vercel 환경변수 ALIGO_API_KEY / ALIGO_USER_ID / ALIGO_SENDER 를 설정하세요.' });

    let body = req.body; if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    const receiver = String(body.receiver||'').replace(/\D/g,'');
    const msg = String(body.msg||'').trim();
    if(!receiver || !msg) return res.status(200).json({ ok:false, error:'BAD_PARAM', message:'receiver, msg 가 필요합니다.' });

    const form = new URLSearchParams();
    form.set('key', KEY); form.set('user_id', UID); form.set('sender', SENDER);
    form.set('receiver', receiver); form.set('msg', msg);
    if(body.title) form.set('title', String(body.title).slice(0,40));
    // 90바이트 초과면 LMS 자동(미지정 시 알리고가 길이로 판단). 명시하려면:
    form.set('msg_type', (Buffer.byteLength(msg,'utf8') > 90) ? 'LMS' : 'SMS');
    if(body.testmode) form.set('testmode_yn', 'Y');

    const r = await fetch('https://apis.aligo.in/send/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: form.toString() });
    const j = await r.json().catch(()=>({}));
    const ok = String(j.result_code) === '1';
    let callerIp = null; try{ callerIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; }catch(e){}
    return res.status(200).json({ ok, message: j.message || '', mid: j.msg_id || null, callerIp, raw: j });
  }catch(e){
    return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) });
  }
}
