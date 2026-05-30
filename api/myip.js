// Vercel Serverless: /api/myip — 이 함수가 외부로 나갈 때의 IP 확인(알리고 IP 등록용)
export default async function handler(req, res){
  try{
    const r = await fetch('https://api.ipify.org?format=json');
    const j = await r.json();
    res.status(200).json({ ok:true, ip: j.ip, note: 'Vercel 서버리스는 IP가 유동적일 수 있어 호출마다 달라질 수 있습니다.' });
  }catch(e){
    res.status(200).json({ ok:false, message: String(e && e.message || e) });
  }
}
