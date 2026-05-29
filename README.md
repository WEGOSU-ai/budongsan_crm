# 매칭홈 부동산 CRM

매물·고객 매칭 관리 도구. 단일 HTML(`index.html` / `부동산-CRM.html`)로 서버 없이 동작합니다. 사용법은 `CLAUDE.md` 참고.

## ⚡ 가장 빠른 방법 (더블클릭)
- **`deploy.bat`** 더블클릭 → Vercel 배포 (엔터=브라우저 로그인, 또는 새 토큰 붙여넣기). 이미 한 번 배포했으면 이걸로 재배포만 하면 됩니다.
- **`github-push.bat`** 더블클릭 → GitHub 업로드(저장소 URL만 붙여넣기). 이후 Vercel에서 그 저장소 Import → push할 때마다 자동 배포.

> 전제: PC에 git, Node(npm)가 설치돼 있어야 합니다. (없으면 git-scm.com, nodejs.org 에서 설치)
> 보안: 채팅에 노출된 Vercel 토큰은 폐기하고 새로 발급하세요.

---

## 1) GitHub 업로드 (PC 터미널에서)

> 깃허브 계정·인증이 필요합니다. 아래는 이 폴더(`dev_budongsan`)에서 실행하는 명령입니다.

```bash
cd "C:\Users\yeoul\OneDrive\바탕 화면\dev_budongsan"
git init
git add .
git commit -m "매칭홈 부동산 CRM 초기 배포"
git branch -M main
# 깃허브에서 빈 저장소를 먼저 만든 뒤, 그 주소로:
git remote add origin https://github.com/<아이디>/<저장소명>.git
git push -u origin main
```

처음이면 깃허브 로그인(토큰)이 필요합니다: 깃허브 → Settings → Developer settings → Personal access tokens 에서 토큰 발급 후, 비밀번호 자리에 붙여넣기.

## 2) Vercel 자동 배포

가장 쉬운 방법(클릭):
1. https://vercel.com 가입 후 **Add New → Project**
2. 위에서 만든 GitHub 저장소를 **Import**
3. Framework Preset = **Other**, 빌드 설정 비움, 그대로 **Deploy**
4. 끝. 이후 깃허브에 `git push` 하면 **자동 재배포**됩니다.

루트의 `index.html`이 자동으로 서비스되고, `vercel.json`이 기본 보안 헤더를 적용합니다.

CLI로 하려면:
```bash
npm i -g vercel
vercel        # 최초 1회 로그인·설정
vercel --prod # 운영 배포
```

## 3) 카카오 로그인 / 구글 연동 (배포 도메인 확보 후)

배포되면 `https://<프로젝트>.vercel.app` 주소가 생깁니다. 그 주소로:
- 카카오 개발자센터 → 내 애플리케이션 → 플랫폼(Web)·Redirect URI 등록 → JavaScript 키를 `index.html` 상단 `KAKAO_JS_KEY`에 입력
- 구글 OAuth(연락처/캘린더) 사용 시 Google Cloud 콘솔에서 OAuth 클라이언트 ID 발급 → 승인된 자바스크립트 원본에 도메인 등록

## 4) 데이터베이스(SQL) 연동 — 선택

현재는 브라우저 localStorage 저장입니다. 여러 기기·직원이 공유하려면 Supabase(PostgreSQL)를 권장합니다.
1. https://supabase.com 프로젝트 생성
2. SQL Editor에 `db/supabase_schema.sql` 붙여넣고 실행 → 테이블·보안정책 생성
3. 프로젝트의 `Project URL`과 `anon key`를 받아 앱에 연동(연동 코드는 별도 작업 필요)

> ⚠️ DB·키 발급은 법인박사님 계정에서만 가능합니다. 비밀키는 절대 깃허브에 올리지 마세요(`.gitignore`에 차단해 두었습니다).

---

## 보안 점검 요약 (this build)
- 시크릿/비밀번호 하드코딩 **없음** (카카오 JS 키는 공개용이며 비어 있음).
- 업로드(엑셀/CSV) 데이터의 화면 출력은 모두 **HTML escape** 처리 → 스크립트 주입(XSS) 차단.
- 외부 라이브러리는 https CDN(SheetJS·html2canvas·jsPDF·Kakao)만 사용.
- 개인정보는 헤더 **🔒 가리기**로 마스킹, 데이터는 기기 내 localStorage에만 저장(외부 전송 없음).
- `vercel.json`에 `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` 보안 헤더 적용.
