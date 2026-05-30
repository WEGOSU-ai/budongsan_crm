// Vercel Serverless Function: /api/alimtalk — 알리고(Aligo) 카카오 알림톡 발송
// 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDERKEY(발신프로필키), ALIGO_TPL_CODE(승인 템플릿), ALIGO_SENDER(대체문자 발신번호, 선택)
// 호출: POST /api/alimtalk  {receiver, message, recvname?, subject?}
// ※ 메시지 내용은 카카오 심사 승인된 템플릿과 일치해야 발송됩니다.

export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST_ONLY' });
    const KEY = process.env.ALIGO_API_KEY, UID = process.env.ALIGO_USER_ID, SK = process.env.ALIGO_SENDERKEY, TPL = process.env.ALIGO_TPL_CODE, SENDER = process.env.ALIGO_SENDER;
    if(!KEY || !UID || !SK || !TPL) return res.status(200).json({ ok:false, error:'NO_ENV', message:'환경변수 ALIGO_API_KEY / ALIGO_USER_ID / ALIGO_SENDERKEY / ALIGO_TPL_CODE 를 설정하세요.' });

    let body = req.body; if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    const receiver = String(body.receiver||'').replace(/\D/g,'');
    const message = String(body.message||'').trim();
    const recvname = String(body.recvname||'').slice(0,30);
    if(!receiver || !message) return res.status(200).json({ ok:false, error:'BAD_PARAM', message:'receiver, message 가 필요합니다.' });

    // 1) 토큰 발급
    const tr = await fetch('https://kakaoapi.aligo.in/akv10/token/create/30/s/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ apikey:KEY, userid:UID }).toString() });
    const tj = await tr.json().catch(()=>({}));
    const token = tj.token;
    if(!token) return res.status(200).json({ ok:false, error:'TOKEN', message: tj.message || '토큰 발급 실패', raw: tj });

    // 2) 알림톡 발송
    const f = new URLSearchParams();
    f.set('apikey', KEY); f.set('userid', UID); f.set('token', token);
    f.set('senderkey', SK); f.set('tpl_code', TPL);
    if(SENDER) f.set('sender', SENDER);
    f.set('receiver_1', receiver); f.set('recvname_1', recvname);
    f.set('subject_1', String(body.subject||'안내').slice(0,40));
    f.set('message_1', message);
    if(body.testmode) f.set('testMode', 'Y');

    const sr = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: f.toString() });
    const sj = await sr.json().catch(()=>({}));
    const ok = String(sj.code) === '0';
    return res.status(200).json({ ok, message: sj.message || '', raw: sj });
  }catch(e){
    return res.status(200).json({ ok:false, error:'EXCEPTION', message:String(e && e.message || e) });
  }
}
