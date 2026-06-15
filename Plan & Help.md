# 📱 휴대폰 카메라 제어 프로그램 개발 계획 및 도움말 (Plan & Help)

이 문서는 **스텔스 UI 및 비율 자동 전환이 적용된 휴대폰 카메라 제어 웹 프로그램**의 전체 개발 이력 및 도움말입니다.

GitHub: https://github.com/bsshin1960/simple_camera.git

---

## 1. 개발 결과 요약 (Plan Summary)

### 기술 스택
- **HTML5 + Vanilla CSS + Vanilla JavaScript**
- **PWA (Progressive Web App)** 모바일 설치 지원
- **Service Worker** 기반 오프라인 캐싱 (`sw.js`)
- **manifest.json** 홈 화면 추가 지원

### 디자인 콘셉트
- 불필요한 고정 메뉴들을 배제하고, 배경에는 **은은한 화이트 톤의 문제 텍스트(투명도 15%)** 배치
- 마우스 커서가 화면에 진입하거나 모바일에서 탭하면 조작 버튼과 줌 슬라이더가 반투명하게 나타남
- **마우스가 화면 밖으로 나가면** 배경 텍스트, 스크롤바, 컨트롤 모두 투명하게 사라져 카메라 영상만 보임

---

## 2. 개발 이력 (Development History)

### v1.0 – 웹 브라우저 기반 초기 버전
- HTML + CSS + JS로 기본 카메라 제어 웹 페이지 구현
- PC 브라우저에서 웹캠 스트리밍 정상 작동 확인

### v2.0 – PWA 모바일 앱 전환
- 웹 브라우저에서 발생하는 보안 승인 팝업과 불필요한 UI 요소 문제로 **PWA 앱으로 전환**
- `manifest.json` + `sw.js` (Service Worker) 추가하여 홈 화면에 앱 아이콘으로 설치 가능
- 모바일에서 아이콘 탭으로 실행하면 브라우저 주소창 없이 전체 화면 앱처럼 동작

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

### v2.3 – 스크롤바 완전 제거 및 비율 개선 (최신)
- `* { scrollbar-width: none; }` + `*::-webkit-scrollbar { display: none; }` 로 **모든 스크롤바 완전 숨김**
- 세로 모드: 고정 픽셀 대신 **`height: calc(100dvh - 120px)` + `aspect-ratio: 9/16`** 으로 화면에 꽉 차게
- 가로 모드: **`height: calc(100dvh - 100px)` + `aspect-ratio: 16/9`** 으로 화면 높이 기준 자동 계산
- HTML에 **캐시 방지 메타 태그** 추가 (`Cache-Control: no-cache`)
- CSS, JS 파일에 **버전 파라미터** 추가 (`style.css?v=20260615b`, `app.js?v=20260615b`)

---

## 3. 파일 구성 (File Structure)

```
camera/
├── index.html      # 앱 메인 페이지 (PWA 메타 태그, 캐시 방지 헤더 포함)
├── style.css       # 전체 스타일시트 (스텔스 UI, 비율 자동 전환, 스크롤바 숨김)
├── app.js          # 카메라 제어 로직 (스트리밍, 줌, 기기 전환, 스텔스 제어)
├── manifest.json   # PWA 앱 매니페스트 (홈 화면 설치 지원)
├── sw.js           # Service Worker (오프라인 캐싱)
├── icon.png        # 앱 아이콘 이미지
└── Plan & Help.md  # 개발 계획 및 도움말 (이 파일)
```

---

## 4. 프로그램 조작 설명서 (Manual)

### 4.1 설치 방법 (모바일 홈 화면에 추가)
1. 크롬(Android) 또는 사파리(iOS)에서 앱 URL에 접속
2. 브라우저 메뉴(⋮ 또는 공유 아이콘) → **"홈 화면에 추가"** 선택
3. 이후 홈 화면 아이콘으로 실행하면 브라우저 주소창 없이 앱처럼 동작

### 4.2 화면 구성 및 조작부 노출
- **스텔스 상태**: 카메라 영상만 표시, 제어 단추 가려짐
- **조작부 나타내기**:
  - PC: 마우스 커서를 화면 안으로 이동
  - 모바일: 화면을 가볍게 한 번 탭(Tap)
- **조작부 구성 요소** (화면 하단 통합 컨트롤바):
  - `ZOOM 슬라이더`: 줌 비율(`1.0x` ~ `4.0x`) 조절
  - `카메라 전환` 버튼: 전/후면 카메라, PC 웹캠 순환 전환
  - `화면 전환` 버튼: 중간화면 모드(9:16/16:9) ↔ 전체화면 모드 전환

### 4.3 자동 감추기
- PC: 마우스 커서가 화면 밖으로 나가면 즉시 사라짐
- 모바일: 마지막 터치 후 **2.5초** 경과 시 서서히 사라짐

### 4.4 화면 비율
| 모드 | 비율 | 기준 |
|------|------|------|
| 세로 모드 (Portrait) | **9:16** | 화면 높이(dvh) 기준 자동 계산 |
| 가로 모드 (Landscape) | **16:9** | 화면 높이(dvh) 기준 자동 계산 |
| 전체화면 모드 | 화면 꽉 참 | `position: fixed` + `100vw × 100vh` |

---

## 5. 도움말 (Help) / FAQ

### Q1. 화면이 검게 나와요 (카메라 영상이 안 보임)
**원인**: PC에 OBS Virtual Camera 등 가상 카메라 드라이버가 기본으로 잡힌 경우

**대처법**:
1. 화면을 탭하여 조작 버튼 활성화
2. **카메라 전환 버튼**을 여러 번 클릭하여 실제 카메라 선택
3. 그래도 안 되면 브라우저 설정에서 카메라 권한 확인

### Q2. 화면 비율이 9:16이 아닌 것 같아요
**대처법**: 캐시 문제일 수 있습니다.
1. **시크릿 모드(인코그니토)** 로 접속 시도
2. 크롬 주소창에 `chrome://settings/clearBrowserData` 입력 → 캐시 삭제 후 재접속

### Q3. 설치한 앱(홈 화면 아이콘)이 업데이트가 안 돼요
**대처법**: PWA는 Service Worker가 캐시를 관리합니다.
1. 앱 실행 후 브라우저 내 **새로고침** 2~3번 시도
2. 또는 앱을 삭제 후 다시 "홈 화면에 추가"로 재설치

### Q4. 모바일에서 터널 URL로 접속하는 방법
- localhost.run SSH 터널을 사용하여 외부에서 접속 가능한 임시 URL 생성
- PC에서 아래 명령 실행:
  ```
  ssh -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run
  ```
- 생성된 `https://xxxxx.lhr.life` 형태의 URL을 휴대폰에서 접속

---

## 6. 기술 메모 (Technical Notes)

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
* { scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }
```

### PWA 서비스워커 캐시 전략
- 설치 시 핵심 파일(`index.html`, `style.css`, `app.js`, `manifest.json`, `icon.png`) 사전 캐싱
- 네트워크 우선(Network First) 전략으로 항상 최신 버전 우선 시도
