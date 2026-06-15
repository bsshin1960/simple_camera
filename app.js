// 프로그램 상태 관리
const state = {
    stream: null,
    zoom: 1.0,
    isFullScreen: false,
    controlsTimer: null,
    cameras: [],          // 탐색된 카메라 기기 목록
    activeCameraIndex: 0  // 현재 활성화된 카메라 인덱스
};

// 알림 표시 함수 (시스템 얼럿 대체용 프리미엄 UI)
function showNotification(message) {
    let notification = document.getElementById('custom-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'custom-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translate(-50%, -20px);
            background: rgba(220, 53, 69, 0.9);
            color: #fff;
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: center;
            width: 90%;
            max-width: 380px;
            opacity: 0;
            pointer-events: none;
        `;
        document.body.appendChild(notification);
        // Force reflow
        notification.offsetHeight;
    }
    notification.textContent = message;
    notification.style.opacity = '1';
    notification.style.transform = 'translate(-50%, 0)';
    
    // 이전 타이머 해제 및 재설정
    if (state.notificationTimer) {
        clearTimeout(state.notificationTimer);
    }
    state.notificationTimer = setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}


// DOM 요소들
const appContainer = document.getElementById('app-container');
const videoStream = document.getElementById('video-stream');
const cameraBox = document.getElementById('camera-box');
const questionsArea = document.getElementById('questions-area');
const zoomSlider = document.getElementById('zoom-slider');
const zoomBadge = document.getElementById('zoom-badge');

// 컨트롤 버튼 & 아이콘
const btnToggleScreen = document.getElementById('btn-toggle-screen');
const btnSwitchCamera = document.getElementById('btn-switch-camera');
const iconCollapse = document.getElementById('icon-collapse');
const iconExpand = document.getElementById('icon-expand');

// 화면을 가득 채울 문제 목록 생성 함수
function fillQuestions() {
    const mockQuestions = [
        "Q1. 다음 중 스마트폰 카메라를 제어하는 API 이름은 무엇인가요?",
        "Q2. HTML5에서 동영상을 재생하기 위해 사용하는 태그는 무엇인가요?",
        "Q3. CSS에서 전체 화면을 꽉 채우기 위해 사용하는 단위는 무엇인가요?",
        "Q4. 모바일 화면에서 두 손가락으로 크기를 조절하는 제스처의 이름은?",
        "Q5. JavaScript에서 요소를 선택하기 위해 사용하는 함수 이름은?",
        "Q6. PWA(Progressive Web App)를 스마트폰에 설치하는 표준 방법은 무엇인가요?",
        "Q7. 웹 브라우저에서 카메라 스트림을 받기 위해 필요한 프로토콜(HTTPS)의 이유는?",
        "Q8. 스마트폰 카메라 확대/축소를 브라우저 수준에서 제어하기 위한 CSS 속성은?",
        "Q9. 카메라 제어 앱에서 최대화면과 중간화면을 전환하는 원리는 무엇인가요?",
        "Q10. 이 프로그램에서 제공하는 줌 범위의 최솟값과 최댓값은 얼마인가요?"
    ];

    let content = "";
    // 모바일 화면에 문제가 빽빽이 들어차도록 질문 리스트를 반복 생성합니다.
    for (let i = 0; i < 8; i++) {
        mockQuestions.forEach((q, idx) => {
            content += `<p>[문제 ${i * 10 + idx + 1}] ${q.substring(4)}</p>`;
        });
    }
    questionsArea.innerHTML = content;
}

// 연결된 모든 비디오 장치 목록 탐색
async function getCameraDevices() {
    try {
        // 장치 정보를 읽기 위해 임시로 권한 획득 유도
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        state.cameras = devices.filter(device => device.kind === 'videoinput');
        console.log("발견된 카메라 목록:", state.cameras);
    } catch (err) {
        console.error("카메라 장치 목록 탐색 실패:", err);
    }
}

// 카메라 스트림 시작
async function startCamera() {
    // 1. 카메라 목록이 비어 있으면 장치를 탐색합니다.
    if (state.cameras.length === 0) {
        await getCameraDevices();
    }

    // 기본 제약 조건 설정
    let constraints = {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    };

    // 2. 검색된 카메라 목록에 따라 특정 deviceId 지정
    if (state.cameras.length > 0) {
        const activeCamera = state.cameras[state.activeCameraIndex];
        constraints.video.deviceId = { exact: activeCamera.deviceId };
        console.log(`카메라 적용: ${activeCamera.label} (${activeCamera.deviceId})`);
    } else {
        // 카메라 목록이 확인되지 않을 경우 ideal 폴백 사용
        constraints.video.facingMode = { ideal: 'environment' };
    }

    try {
        // 기존 실행 중인 카메라 중단
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
        }

        // 스트림 획득
        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoStream.srcObject = state.stream;
        
        // 브라우저 캐시 및 레이팅 딜레이 방지를 위해 직접 play() 호출
        videoStream.onloadedmetadata = () => {
            videoStream.play()
                .then(() => console.log("카메라 활성화 성공"))
                .catch(err => console.error("비디오 렌더링 재생 오류:", err));
        };
    } catch (err) {
        console.error("선택된 카메라 구동 실패:", err);
        // 권한 충돌 또는 구동 실패 시 다른 카메라로 재시도
        if (state.cameras.length > 1) {
            console.log("다음 사용 가능한 카메라로 폴백 시도합니다...");
            cycleCamera();
        } else {
            // 다른 대안이 없을 시 완전 기본 비디오 요청
            try {
                state.stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoStream.srcObject = state.stream;
                videoStream.play().catch(e => console.error(e));
            } catch (fallbackErr) {
                showNotification("웹캠/카메라에 연결할 수 없습니다. 권한 승인 상태 혹은 다른 앱에서 카메라를 사용 중인지 확인해 주세요.");
            }
        }
    }
}

// 다음 장치로 카메라 전환
function cycleCamera() {
    if (state.cameras.length <= 1) {
        console.log("전환할 수 있는 다른 카메라 장치가 없습니다.");
        // 장치 목록을 다시 탐색해 봅니다.
        getCameraDevices().then(() => {
            if (state.cameras.length > 1) {
                switchNextCamera();
            } else {
                showNotification("사용 가능한 다른 카메라 장치가 발견되지 않았습니다.");
            }
        });
        return;
    }
    switchNextCamera();
}

function switchNextCamera() {
    state.activeCameraIndex = (state.activeCameraIndex + 1) % state.cameras.length;
    startCamera();
    showControlsTemporarily();
}

// 줌(확대/축소) 효과 적용
function applyZoom(val) {
    state.zoom = parseFloat(val);
    videoStream.style.transform = `scale(${state.zoom})`;
    zoomBadge.textContent = `${state.zoom.toFixed(1)}x`;

    // 하드웨어 카메라 줌 시도
    if (state.stream) {
        const videoTrack = state.stream.getVideoTracks()[0];
        if (typeof videoTrack.getCapabilities === 'function') {
            const capabilities = videoTrack.getCapabilities();
            if (capabilities.zoom) {
                const min = capabilities.zoom.min || 1;
                const max = capabilities.zoom.max || 1;
                const hardwareZoom = min + (state.zoom - 1) / 3 * (max - min);
                videoTrack.applyConstraints({
                    advanced: [{ zoom: Math.min(hardwareZoom, max) }]
                }).catch(e => console.log("하드웨어 줌 실패:", e));
            }
        }
    }
}

// 화면 모드 토글 (최대화면 <-> 중간화면)
function toggleScreenMode() {
    state.isFullScreen = !state.isFullScreen;
    
    if (state.isFullScreen) {
        // 최대화면 설정
        cameraBox.classList.remove('medium-mode');
        cameraBox.classList.add('full-mode');
        appContainer.classList.add('full-mode');
        
        // 아이콘 변경 (축소 아이콘 노출)
        iconCollapse.classList.remove('hidden');
        iconExpand.classList.add('hidden');
    } else {
        // 중간화면 설정
        cameraBox.classList.remove('full-mode');
        cameraBox.classList.add('medium-mode');
        appContainer.classList.remove('full-mode');
        
        // 아이콘 변경 (확대 아이콘 노출)
        iconExpand.classList.remove('hidden');
        iconCollapse.classList.add('hidden');
    }
    
    showControlsTemporarily();
}

// 컨트롤러(반투명 인터페이스) 일시 표출 및 자동 페이드아웃 기능
function showControlsTemporarily() {
    appContainer.classList.add('show-controls');
    
    // 기존 타이머 클리어
    if (state.controlsTimer) {
        clearTimeout(state.controlsTimer);
    }
    
    // 2.5초간 움직임이 없으면 자동으로 컨트롤 숨김
    state.controlsTimer = setTimeout(() => {
        // 줌 슬라이더를 잡고 드래그하는 중에는 감추지 않음
        if (document.activeElement !== zoomSlider) {
            appContainer.classList.remove('show-controls');
        }
    }, 2500);
}

// 이벤트 리스너 설정
function setupEvents() {
    // 1. 화면 크기 토글 버튼 클릭
    btnToggleScreen.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScreenMode();
    });

    // 2. 카메라 기기 전환 버튼 클릭
    btnSwitchCamera.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleCamera();
    });

    // 3. 줌 슬라이더 입력 연동
    zoomSlider.addEventListener('input', (e) => {
        applyZoom(e.target.value);
        showControlsTemporarily();
    });

    // 4. 커서/터치 반응형 제어
    appContainer.addEventListener('mousemove', () => {
        showControlsTemporarily();
    });

    appContainer.addEventListener('mouseleave', () => {
        if (state.controlsTimer) {
            clearTimeout(state.controlsTimer);
        }
        appContainer.classList.remove('show-controls');
    });

    appContainer.addEventListener('touchstart', () => {
        showControlsTemporarily();
    }, { passive: true });

    appContainer.addEventListener('touchmove', () => {
        showControlsTemporarily();
    }, { passive: true });

    // 더블 탭/클릭 시 화면 모드 토글 지원
    appContainer.addEventListener('dblclick', (e) => {
        // 버튼 및 슬라이더 영역 제외 클릭 시 작동
        if (e.target !== zoomSlider && !btnToggleScreen.contains(e.target) && !btnSwitchCamera.contains(e.target)) {
            toggleScreenMode();
        }
    });
}

// 앱 초기화
function init() {
    fillQuestions();
    
    // 초기 아이콘 상태 정렬 (처음에는 중간화면이므로 확대 아이콘이 보여야 함)
    iconExpand.classList.remove('hidden');
    iconCollapse.classList.add('hidden');
    
    startCamera();
    setupEvents();
}

document.addEventListener('DOMContentLoaded', init);

// 서비스 워커 등록 (PWA 설치 및 오프라인 지원)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('서비스 워커 등록 성공:', reg.scope))
            .catch(err => console.log('서비스 워커 등록 실패:', err));
    });
}
