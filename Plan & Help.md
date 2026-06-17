# 📱 심플 카메라 제어기 - 개발 계획 및 도움말 (Plan & Help)

이 문서는 **스텔스 UI 및 비율 자동 전환이 적용된 휴대폰 카메라 제어 웹 프로그램**의 전체 개발 이력 및 도움말입니다.

- **GitHub 저장소**: https://github.com/bsshin1960/simple_camera.git
- **영구 접속 주소 (GitHub Pages)**: https://bsshin1960.github.io/simple_camera/

---

## 1. 개발 결과 요약 (Plan Summary)

### 기술 스택
- **HTML5 + Vanilla CSS + Vanilla JavaScript**
- **PWA (Progressive Web App)** 모바일 설치 지원
- **Service Worker** 기반 오프라인 캐싱 (`sw.js`)
- **manifest.json** 홈 화면 추가 지원
- **GitHub Pages** 영구 호스팅 (HTTPS 자동 제공)

### 디자인 콘셉트
- 배경에 **은은한 화이트 톤의 문제 텍스트(투명도 15%)** 배치
- 마우스 커서가 화면에 진입하거나 모바일에서 탭하면 조작 버튼과 줌 슬라이더가 반투명하게 나타남
- **마우스가 화면 밖으로 나가면** 배경 텍스트, 스크롤바, 컨트롤 모두 투명하게 사라져 카메라 영상만 보임

---

## 2. 개발 이력 (Development History)

### v1.0 – 웹 브라우저 기반 초기 버전
- HTML + CSS + JS로 기본 카메라 제어 웹 페이지 구현
- PC 브라우저에서 웹캠 스트리밍 정상 작동 확인
- 문제점: 브라우저에서 보안 승인 팝업, 불필요한 주소창 UI 등이 노출됨

### v2.0 – PWA 모바일 앱 전환
- 웹 브라우저 보안 승인 팝업과 불필요한 UI 요소 문제로 **PWA 앱으로 전환**
- `manifest.json` + `sw.js` (Service Worker) 추가 → 홈 화면에 앱 아이콘으로 설치 가능
- 모바일에서 아이콘 탭으로 실행하면 브라우저 주소창 없이 전체 화면 앱처럼 동작
- localhost.run SSH 터널을 통해 HTTPS 외부 접속 URL 제공

### v2.1 – 세로/가로 모드 비율 자동 전환
- **세로 모드**: 카메라 화면이 `9:16` 비율로 표시 (화면 높이 기준으로 꽉 차게)
- **가로 모드**: 카메라 화면이 `16:9` 비율로 자동 전환
- CSS `orientation: landscape` 미디어 쿼리 + `aspect-ratio` 속성 활용
- `100dvh` (Dynamic Viewport Height) 단위 적용으로 모바일 주소창 영역까지 정확히 대응

### v2.2 – 스텔스 UI (마우스 아웃 시 전체 화면 숨김)
- 마우스가 화면 영역 밖으로 나가거나 모바일에서 2.5초 동안 터치가 없으면:
  - 조작 버튼, 줌 슬라이더 숨김
  - 배경 질문 텍스트 숨김
  - 스크롤바도 함께 숨김 → 카메라 영상만 깔끔하게 전체 화면으로 보임
- CSS `opacity` 트랜지션으로 부드럽게 사라지는 효과 적용

### v2.3 – 스크롤바 완전 제거 및 화면 비율 개선
- `* { scrollbar-width: none; }` + `*::-webkit-scrollbar { display: none; }` 으로 **모든 스크롤바 완전 숨김**
- 세로 모드: 고정 픽셀 대신 **`height: calc(100dvh - 120px)` + `aspect-ratio: 9/16`** 으로 화면에 꽉 차게
- 가로 모드: **`height: calc(100dvh - 100px)` + `aspect-ratio: 16/9`** 으로 화면 높이 기준 자동 계산
- HTML에 **캐시 방지 메타 태그** 추가 (`Cache-Control: no-cache`)
- CSS, JS 파일에 **버전 파라미터** 추가 (`style.css?v=20260615c`, `app.js?v=20260615c`)

### v2.4 – 카메라 시작 속도 최적화 (최신)
- **기존 문제**: 임시 스트림을 열었다 닫고 장치 목록 탐색이 끝날 때까지 기다린 후에야 실제 카메라를 켜는 직렬 처리 방식
- **개선 내용**:
  1. **임시 스트림 완전 제거** - 권한 획득을 위해 카메라를 켰다 끄는 이중 작업 삭제
  2. **카메라 즉시 시작** - 장치 목록 탐색 없이 `facingMode: environment` 로 바로 스트림 요청
  3. **장치 목록 병렬 탐색** - 카메라가 켜진 후 백그라운드에서 비동기로 장치 목록 갱신
  4. **`play()` 즉시 호출** - `onloadedmetadata` 이벤트 대기 없이 `srcObject` 할당 즉시 `play()` 실행
  5. **DOM 준비 즉시 실행** - `document.readyState` 확인으로 불필요한 이벤트 대기 최소화

```
기존 흐름 (느림):
임시 스트림 열기 → 닫기 → 장치 탐색 완료 대기 → 스트림 시작 → metadata 이벤트 대기 → play()

개선 후 흐름 (빠름):
스트림 즉시 요청 → srcObject 할당 → play() 즉시 실행
                                          ↓ (동시에 백그라운드에서)
                              장치 목록 탐색 (비동기, 병렬)
```

### v2.5 – GitHub Pages 영구 호스팅 배포
- localhost.run 무료 터널의 한계(URL이 매번 변경, PC 꺼지면 접속 불가) 해결
- **GitHub Pages** 로 영구 HTTPS 호스팅 설정
- 영구 접속 주소: **https://bsshin1960.github.io/simple_camera/**
- PC가 꺼져 있어도 언제든 접속 가능, URL 변경 없음

### v2.6 – 모바일 호환성 개선 및 디버그 모니터 탑재 (최신)
- **자동 재생 정책 차단 우회**: 모바일 브라우저의 재생 락을 풀기 위해 화면 터치/클릭 시 비디오 멈춤 여부를 체크하여 `play()` 강제 재트리거
- **카메라 연결 안정성 극대화**: OverconstrainedError를 일으키는 4K 해상도를 배제하고 FHD -> HD 순으로 요청. 특정 디바이스 전환 실패 시 ideal 매칭 및 최종 `video: true`로 떨어지는 다단계 Fallback 구축
- **온스크린 디버그 모니터**: 화면 빈 영역을 **빠르게 5회 연속 탭**하면 작동하는 개발자용 실시간 콘솔 패널 구현
- **원터치 앱 초기화**: 디버그 패널 내 **[캐시초기화]** 버튼으로 서비스 워커 등록 취소(Unregister) 및 브라우저 캐시 전면 삭감 후 강제 리로드 지원
- **PWA 오프라인 쿼리 지원**: 쿼리스트링(`?v=...`) 버전 파라미터가 들어가도 오프라인 캐시를 매칭하도록 `sw.js`에 `ignoreSearch: true` 적용

---

## 3. 파일 구성 (File Structure)

```
camera/
├── index.html       # 앱 메인 페이지 (PWA 메타 태그, 캐시 방지 헤더 포함)
├── style.css        # 전체 스타일시트 (스텔스 UI, 비율 자동 전환, 스크롤바 숨김)
├── app.js           # 카메라 제어 로직 (빠른 시작, 줌, 기기 전환, 스텔스 제어)
├── manifest.json    # PWA 앱 매니페스트 (홈 화면 설치 지원)
├── sw.js            # Service Worker (오프라인 캐싱)
├── icon.png         # 앱 아이콘 이미지
└── Plan & Help.md   # 개발 계획 및 도움말 (이 파일)
```

---

## 4. 접속 방법 (Access Guide)

### 4.1 GitHub Pages (영구 주소 - 권장)
| 항목 | 내용 |
|------|------|
| **URL** | https://bsshin1960.github.io/simple_camera/ |
| **특징** | PC 꺼져도 접속 가능, URL 고정, HTTPS 자동 |
| **업데이트** | `git push` 하면 1~2분 후 자동 반영 |

### 4.2 로컬 서버 + SSH 터널 (개발/테스트용)
```powershell
# 1. 로컬 HTTP 서버 시작
python -m http.server 8000 --directory c:\Temp\Antigrvity\camera

# 2. SSH 터널로 외부 접속 URL 생성
ssh -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run
```
- 생성된 `https://xxxxx.lhr.life` 형태의 URL을 휴대폰에서 접속
- ⚠️ PC가 꺼지거나 연결 끊기면 URL이 바뀜 (임시용)

### 4.3 모바일 홈 화면에 앱 설치
1. 크롬(Android) 또는 사파리(iOS)에서 GitHub Pages URL 접속
2. 브라우저 메뉴(`⋮` 또는 공유 아이콘) → **"홈 화면에 추가"** 선택
3. 이후 홈 화면 아이콘으로 실행하면 브라우저 주소창 없이 앱처럼 동작

---

## 5. 프로그램 조작 설명서 (Manual)

### 5.1 화면 구성 및 조작부 노출
- **스텔스 상태**: 카메라 영상만 표시, 제어 단추 가려짐
- **조작부 나타내기**:
  - PC: 마우스 커서를 화면 안으로 이동
  - 모바일: 화면을 가볍게 한 번 탭(Tap)
- **조작부 구성 요소** (화면 하단 통합 컨트롤바):
  - `ZOOM 슬라이더`: 줌 비율(`1.0x` ~ `4.0x`) 조절
  - `카메라 전환` 버튼: 전/후면 카메라, PC 웹캠 순환 전환
  - `화면 전환` 버튼: 중간화면 모드(9:16/16:9) ↔ 전체화면 모드 전환

### 5.2 자동 감추기
- PC: 마우스 커서가 화면 밖으로 나가면 즉시 사라짐
- 모바일: 마지막 터치 후 **2.5초** 경과 시 서서히 사라짐

### 5.3 화면 비율
| 모드 | 비율 | 기준 |
|------|------|------|
| 세로 모드 (Portrait) | **9:16** | 화면 높이(dvh) 기준 자동 계산 |
| 가로 모드 (Landscape) | **16:9** | 화면 높이(dvh) 기준 자동 계산 |
| 전체화면 모드 | 화면 꽉 참 | `position: fixed` + `100vw × 100vh` |

---

## 6. 도움말 (Help) / FAQ

### Q1. 화면이 검게 나와요 (카메라 영상이 안 보임)
**원인**: PC에 OBS Virtual Camera 등 가상 카메라 드라이버가 기본으로 잡힌 경우

**대처법**:
1. 화면을 탭하여 조작 버튼 활성화
2. **카메라 전환 버튼**을 여러 번 클릭하여 실제 카메라 선택
3. 그래도 안 되면 브라우저 설정에서 카메라 권한 확인

### Q2. GitHub Pages에서 카메라가 작동하지 않아요
**원인**: 카메라는 반드시 HTTPS에서만 작동합니다.

**확인 사항**:
- GitHub Pages는 HTTPS가 자동으로 제공되므로 정상 작동해야 합니다
- 주소가 `https://`로 시작하는지 확인

### Q3. GitHub Pages 업데이트가 앱에 바로 반영되지 않아요
**대처법**: GitHub Pages는 `git push` 후 1~2분 후에 반영됩니다.
1. 앱 실행 후 **새로고침** 2~3번 시도
2. 또는 **시크릿 모드(인코그니토)** 로 접속하면 캐시 없이 최신 버전 로드

### Q4. 홈 화면 앱(PWA)이 업데이트가 안 돼요
**대처법**: Service Worker가 이전 파일을 캐싱하고 있을 수 있습니다.
1. 앱 실행 후 **새로고침을 2~3번** 반복
2. 그래도 안 되면 앱 삭제 후 다시 "홈 화면에 추가"로 재설치

### Q5. 화면 비율이 9:16이 아닌 것 같아요
**대처법**: 캐시 문제일 수 있습니다.
- **시크릿 모드(인코그니토)** 로 접속 시도
- 크롬 주소창에 `chrome://settings/clearBrowserData` → 캐시 삭제 후 재접속

---

## 7. 기술 메모 (Technical Notes)

### CSS 핵심 구조
```css
/* 세로 모드 9:16 - 화면 높이 기준 */
.camera-box.medium-mode {
    height: calc(100dvh - 120px);
    aspect-ratio: 9 / 16;
    max-width: 95vw;
}

/* 가로 모드 16:9 - 화면 높이 기준 */
@media (orientation: landscape) {
    .camera-box.medium-mode {
        height: calc(100dvh - 100px);
        aspect-ratio: 16 / 9;
        max-width: 95vw;
    }
}

/* 스크롤바 완전 숨김 */
* { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar { display: none; }
```

### JS 카메라 시작 및 Fallback 구조 (v2.6)
```javascript
async function startCamera() {
    // 1. FHD -> HD 순차적getUserMedia 시도
    for (const res of resolutions) {
        try {
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: activeCam.deviceId }, width: { ideal: res.width }, height: { ideal: res.height } }
            });
            break;
        } catch (err) {
            // 실패 시 exact를 해제하고 ideal 디바이스 매칭 fallback 시도
        }
    }
    
    // 2. 고해상도 실패 시 facingMode: 'environment' -> video: true 최종 Fallback
    if (!success) {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
    }

    // 3. 비디오 강제 재생 및 모바일 자동재생 정책 대응
    videoStream.srcObject = state.stream;
    videoStream.play().catch(err => showNotification("탭하여 재생 가능"));
}
```

### GitHub Pages 배포
- 저장소: https://github.com/bsshin1960/simple_camera
- 배포 브랜치: `master` (루트 폴더)
- 영구 URL: https://bsshin1960.github.io/simple_camera/
- 업데이트 방법:
  ```
  git add .
  git commit -m "업데이트 내용"
  git push origin master
  ```
