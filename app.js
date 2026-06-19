// 실시간 디버그 로그 가로채기 (모바일 디버깅용)
const debugLogs = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function addDebugLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const logMsg = `[${time}] [${type.toUpperCase()}] ${message}`;
    debugLogs.push({ message: logMsg, type });
    
    if (debugLogs.length > 150) debugLogs.shift();
    
    const logListEl = document.getElementById('debug-log-list');
    if (logListEl) {
        const item = document.createElement('div');
        item.className = `debug-log-item ${type}`;
        item.textContent = logMsg;
        logListEl.appendChild(item);
        logListEl.scrollTop = logListEl.scrollHeight;
    }
}

console.log = function(...args) {
    originalLog.apply(console, args);
    addDebugLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'info');
};
console.warn = function(...args) {
    originalWarn.apply(console, args);
    addDebugLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'warn');
};
console.error = function(...args) {
    originalError.apply(console, args);
    addDebugLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'error');
};

window.onerror = function(message, source, lineno, colno, error) {
    console.error(`Global Error: ${message} at ${source}:${lineno}:${colno}`);
    return false;
};

// 프로그램 상태 관리
const state = {
    stream: null,
    zoom: 1.0,
    rotation: 0,          // 회전 각도 (0, 90, 180, 270)
    brightness: 1.15,     // 기본 밝기 배율 (1.15x - 기존 1.44x 대비 20% 감소)
    isFullScreen: false,
    controlsTimer: null,
    cameras: [],          // 탐색된 카메라 기기 목록
    activeCameraIndex: 0, // 현재 활성화된 카메라 인덱스
    debugClicks: 0,       // 디버그 활성화를 위한 클릭 횟수
    debugLastClick: 0     // 디버그 클릭 타임스탬프
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
const btnRotateCamera = document.getElementById('btn-rotate-camera');
const iconCollapse = document.getElementById('icon-collapse');
const iconExpand = document.getElementById('icon-expand');

// 디버그 관련 DOM
const debugOverlay = document.getElementById('debug-overlay');
const debugLogList = document.getElementById('debug-log-list');
const btnClearCache = document.getElementById('btn-clear-cache');
const btnCloseDebug = document.getElementById('btn-close-debug');

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

// 연결된 모든 비디오 장치 목록 탐색 (이미 권한이 있는 스트림 활용)
async function enumerateCameraDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        state.cameras = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
        console.log("발견된 카메라 목록:", state.cameras);
    } catch (err) {
        console.error("카메라 장치 목록 탐색 실패:", err);
    }
}

// 카메라 스트림 시작 (안정성 및 신뢰성 개선)
async function startCamera() {
    console.log("카메라 스트림 시작 요청됨");
    
    // 기존 스트림 중단
    if (state.stream) {
        console.log("기존 스트림 중지 처리 중...");
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }

    let activeCam = null;
    if (state.cameras.length > 0) {
        activeCam = state.cameras[state.activeCameraIndex];
        console.log(`선택된 활성 카메라 기기: ${activeCam.label} (${activeCam.deviceId})`);
    } else {
        console.log("탐색된 카메라 기기 목록이 비어 있어 facingMode를 기준으로 시작합니다.");
    }

    // 시도할 해상도 순서: 안정성을 위해 FHD (1920x1080) -> HD (1280x720)로 수정 (4K는 생략하여 에러 방지)
    const resolutions = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 }
    ];

    let success = false;

    // 1. 특정 해상도들로 순차적 시도
    for (const res of resolutions) {
        try {
            let videoConstraint = {};
            if (activeCam) {
                // 특정 카메라 기기를 지정하여 가져오는 경우
                videoConstraint.deviceId = { exact: activeCam.deviceId };
            } else {
                // ideal environment 카메라 요구
                videoConstraint.facingMode = { ideal: 'environment' };
            }
            videoConstraint.width = { ideal: res.width };
            videoConstraint.height = { ideal: res.height };

            console.log(`[getUserMedia] 시도 해상도: ${res.width}x${res.height}`);
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraint,
                audio: false
            });
            success = true;
            console.log(`[getUserMedia] 성공한 해상도: ${res.width}x${res.height}`);
            break;
        } catch (err) {
            console.warn(`[getUserMedia] ${res.width}x${res.height} 해상도 시도 실패: ${err.name} - ${err.message}`);
            // deviceId exact 가 거부되었을 수 있으므로 ideal로 낮추어 fallback 시도
            if (activeCam) {
                try {
                    console.log(`[getUserMedia-Fallback] deviceId ideal로 재시도...`);
                    state.stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            deviceId: activeCam.deviceId,
                            width: { ideal: res.width },
                            height: { ideal: res.height }
                        },
                        audio: false
                    });
                    success = true;
                    console.log(`[getUserMedia-Fallback] ideal deviceId로 성공`);
                    break;
                } catch (fallbackErr) {
                    console.warn(`[getUserMedia-Fallback] ideal deviceId 시도 실패: ${fallbackErr.message}`);
                }
            }
        }
    }

    // 2. 모든 고해상도가 실패할 경우, 최소 제약조건으로 최종 시도
    if (!success) {
        try {
            console.log("고해상도 연결 실패, facingMode: 'environment'로 최종 시도 중...");
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            success = true;
            console.log("facingMode: 'environment' 기본 해상도 연결 성공");
        } catch (err1) {
            console.warn("facingMode: 'environment' 연결 실패. 단순 video: true 로 마지막 시도...");
            try {
                state.stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
                success = true;
                console.log("기본 video: true 연결 성공");
            } catch (fallbackErr) {
                console.error("모든 카메라 연결 시도 실패:", fallbackErr);
                showNotification("카메라에 연결할 수 없습니다. 권한 승인 상태나 다른 앱의 카메라 점유 여부를 확인하세요.");
                return;
            }
        }
    }

    // 밝기 필터 즉각 보정 실행
    applyBrightness();

    // 회전 각도 보정 로직
    if (state.stream) {
        const activeTrack = state.stream.getVideoTracks()[0];
        if (activeTrack) {
            const trackLabel = activeTrack.label || 'default';
            const savedRotation = localStorage.getItem(`rotation_${trackLabel}`);
            
            // 트랙의 설정 가져오기 (실패 가능성에 대비해 빈 객체 기본값 설정)
            const settings = (typeof activeTrack.getSettings === 'function') ? activeTrack.getSettings() : {};
            const trackWidth = settings.width || 0;
            const trackHeight = settings.height || 0;
            console.log(`카메라 트랙 정보 - Label: ${trackLabel}, 해상도: ${trackWidth}x${trackHeight}`);

            if (savedRotation !== null) {
                state.rotation = parseInt(savedRotation, 10);
                console.log(`저장된 회전 각도 불러옴: ${state.rotation}도`);
            } else {
                // 가로/세로 왜곡 방지를 위한 기본 회전 보정
                if (window.innerWidth > window.innerHeight) {
                    state.rotation = 90;
                    console.log("가로 뷰포트 감지로 기본 회전 90도 설정");
                } else if (trackWidth > 0 && trackHeight > 0 && trackWidth < trackHeight) {
                    state.rotation = 90;
                    console.log("세로 방향 트랙 해상도로 인해 회전 90도 설정");
                } else {
                    state.rotation = 0;
                }
            }
            applyRotationAndZoom();
        }
    }

    // srcObject 할당 및 재생
    try {
        videoStream.srcObject = state.stream;
        console.log("videoStream srcObject 할당 완료. play() 호출 시작.");
        
        // play() 호출과 에러 제어
        videoStream.play()
            .then(() => {
                console.log("카메라 비디오 play() 재생 성공");
            })
            .catch(err => {
                console.error("비디오 play() 시작 실패 (자동재생 정책 제한 등):", err);
                showNotification("화면을 가볍게 탭(클릭)하면 카메라 재생이 시작됩니다.");
            });
    } catch (err) {
        console.error("srcObject 할당 과정 중 오류 발생:", err);
    }

    // --- 2단계: 카메라가 켜진 후 백그라운드에서 장치 목록 탐색 ---
    if (state.cameras.length === 0) {
        enumerateCameraDevices().then(() => {
            const activeTrack = state.stream && state.stream.getVideoTracks()[0];
            if (activeTrack && state.cameras.length > 0) {
                const settings = (typeof activeTrack.getSettings === 'function') ? activeTrack.getSettings() : {};
                const matchIdx = state.cameras.findIndex(c => c.deviceId === settings.deviceId);
                if (matchIdx >= 0) {
                    state.activeCameraIndex = matchIdx;
                    console.log(`현재 구동 중인 카메라 인덱스 설정됨: ${matchIdx}`);
                }
            }
        });
    }

    console.log("카메라 활성화 완료");
}

// 다음 장치로 카메라 전환
function cycleCamera() {
    if (state.cameras.length <= 1) {
        console.log("전환할 수 있는 다른 카메라 장치가 없습니다.");
        // 장치 목록을 다시 탐색해 봅니다.
        enumerateCameraDevices().then(() => {
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

// 밝기 효과 적용 (contrast는 1.05로 기본 조율하고 brightness만 연계)
function applyBrightness() {
    videoStream.style.filter = `brightness(${state.brightness}) contrast(1.05)`;
}


// 회전 및 줌 효과 적용
function applyRotationAndZoom() {
    let transformStr = `scale(${state.zoom})`;
    
    if (state.rotation === 90 || state.rotation === 270) {
        // 비디오 박스 비율에 따른 자동 스케일링 계산 (여백 방지)
        const rect = cameraBox ? cameraBox.getBoundingClientRect() : null;
        if (rect && rect.width > 0 && rect.height > 0) {
            const scaleFactor = Math.max(rect.width / rect.height, rect.height / rect.width);
            transformStr = `scale(${state.zoom * scaleFactor}) rotate(${state.rotation}deg)`;
        } else {
            // 박스 크기가 0이거나 유효하지 않은 경우 기본 비율 1.78(16:9)로 보완
            console.warn("cameraBox bounding rect가 0이거나 유효하지 않아 기본 scaleFactor 1.78을 적용합니다.");
            transformStr = `scale(${state.zoom * 1.78}) rotate(${state.rotation}deg)`;
        }
    } else if (state.rotation === 180) {
        transformStr = `scale(${state.zoom}) rotate(180deg)`;
    }
    
    if (videoStream) {
        videoStream.style.transform = transformStr;
    }
}

// 줌(확대/축소) 효과 적용
function applyZoom(val) {
    state.zoom = parseFloat(val);
    applyRotationAndZoom();
    if (zoomBadge) {
        zoomBadge.textContent = `${state.zoom.toFixed(1)}x`;
    }

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

// 화면 회전 조절
function cycleRotation() {
    state.rotation = (state.rotation + 90) % 360;
    
    // 사용자가 직접 회전한 상태를 localStorage에 저장하여 다음 진입 시 유지
    if (state.stream) {
        const activeTrack = state.stream.getVideoTracks()[0];
        if (activeTrack) {
            const trackLabel = activeTrack.label || 'default';
            localStorage.setItem(`rotation_${trackLabel}`, state.rotation);
            console.log(`회전 각도 저장 완료 (${trackLabel}): ${state.rotation}도`);
        }
    }
    
    applyRotationAndZoom();
    showControlsTemporarily();
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
    
    setTimeout(applyRotationAndZoom, 50);
    showControlsTemporarily();
}

// 컨트롤러(반투명 인터페이스) 일시 표출 및 자동 페이드아웃 기능
function showControlsTemporarily() {
    if (appContainer) {
        appContainer.classList.add('show-controls');
    }
    
    // 기존 타이머 클리어
    if (state.controlsTimer) {
        clearTimeout(state.controlsTimer);
    }
    
    // 2.5초간 움직임이 없으면 자동으로 컨트롤 숨김
    state.controlsTimer = setTimeout(() => {
        // 슬라이더를 잡고 드래그하는 중에는 감추지 않음
        const isDragging = (zoomSlider && document.activeElement === zoomSlider);
        if (!isDragging && appContainer) {
            appContainer.classList.remove('show-controls');
        }
    }, 2500);
}

// 디버그 패널 토글 트리거 기능
function triggerDebugPanel() {
    const now = Date.now();
    if (now - state.debugLastClick < 800) {
        state.debugClicks++;
    } else {
        state.debugClicks = 1;
    }
    state.debugLastClick = now;

    if (state.debugClicks >= 5) {
        console.log("5회 연속 클릭 감지: 디버그 모니터 창을 활성화합니다.");
        if (debugOverlay) {
            debugOverlay.classList.remove('hidden');
            // 장치 및 스트림 현재 상태 점검 정보 출력
            console.log(`[Status] UserAgent: ${navigator.userAgent}`);
            console.log(`[Status] Stream: ${state.stream ? '구동중' : '없음'}`);
            if (state.stream) {
                const tracks = state.stream.getVideoTracks();
                console.log(`[Status] Video Tracks 개수: ${tracks.length}`);
                tracks.forEach((t, i) => {
                    const settings = (typeof t.getSettings === 'function') ? t.getSettings() : {};
                    console.log(` - Track ${i}: label='${t.label}', readyState='${t.readyState}', enabled=${t.enabled}, settings=${JSON.stringify(settings)}`);
                });
            }
            console.log(`[Status] Video Element: paused=${videoStream.paused}, readyState=${videoStream.readyState}, srcObject=${videoStream.srcObject ? '설정됨' : '비었음'}`);
        }
        state.debugClicks = 0;
    }
}

// 캐시 및 서비스 워커 강제 제거 함수
async function forceClearAppCache() {
    console.log("캐시 및 서비스 워커 강제 초기화를 진행합니다...");
    try {
        // 1. 서비스 워커 등록 취소
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log("서비스 워커 Unregistered 성공:", registration);
            }
        }
        
        // 2. 브라우저 캐시 삭제
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
                await caches.delete(key);
                console.log("캐시 저장소 삭제 완료:", key);
            }
        }
        
        console.log("초기화 완료. 페이지를 강제로 새로고침합니다.");
        showNotification("앱 초기화 완료. 잠시 후 새로고침됩니다.");
        setTimeout(() => {
            // 강제 새로고침 (버전 파라미터를 추가하여 브라우저 로컬 캐시 우회)
            window.location.href = window.location.pathname + '?r=' + Date.now();
        }, 1500);
    } catch (err) {
        console.error("캐시 초기화 실패:", err);
        showNotification("캐시 초기화에 실패했습니다. 수동 새로고침을 해주세요.");
    }
}

// 이벤트 리스너 설정
function setupEvents() {
    // 1. 화면 크기 토글 버튼 클릭
    if (btnToggleScreen) {
        btnToggleScreen.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleScreenMode();
        });
    }

    // 2. 카메라 기기 전환 버튼 클릭
    if (btnSwitchCamera) {
        btnSwitchCamera.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleCamera();
        });
    }

    // 2.5 화면 회전 버튼 클릭
    if (btnRotateCamera) {
        btnRotateCamera.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleRotation();
        });
    }

    // 3. 줌 슬라이더 입력 연동
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            applyZoom(e.target.value);
            showControlsTemporarily();
        });
    }

    // 4. 커서/터치 반응형 제어 및 자동재생 정책 대응
    if (appContainer) {
        appContainer.addEventListener('mousemove', () => {
            showControlsTemporarily();
        });

        appContainer.addEventListener('mouseleave', () => {
            if (state.controlsTimer) {
                clearTimeout(state.controlsTimer);
            }
            appContainer.classList.remove('show-controls');
        });

        // 모바일 터치 및 자동재생 복구 트리거
        appContainer.addEventListener('touchstart', () => {
            showControlsTemporarily();
            
            // 모바일 오토플레이 방지 해제 대응 (멈춰있다면 탭으로 강제 재생)
            if (state.stream && videoStream && videoStream.paused) {
                console.log("[AutoPlay Recovery] 터치 발생 감지 - 비디오 재생을 재시도합니다.");
                videoStream.play().catch(e => console.warn("터치 재생 실패:", e));
            }
        }, { passive: true });

        appContainer.addEventListener('touchmove', () => {
            showControlsTemporarily();
        }, { passive: true });

        // 더블 탭/클릭 시 화면 모드 토글 지원
        appContainer.addEventListener('dblclick', (e) => {
            const isSlider = e.target === zoomSlider;
            const isButton = (btnToggleScreen && btnToggleScreen.contains(e.target)) || 
                             (btnSwitchCamera && btnSwitchCamera.contains(e.target)) || 
                             (btnRotateCamera && btnRotateCamera.contains(e.target));
            if (!isSlider && !isButton) {
                toggleScreenMode();
            }
        });

        // 화면 상단 영역(또는 임의의 곳) 연속 5회 탭 시 디버그 모니터 켜기
        appContainer.addEventListener('click', (e) => {
            // 버튼 클릭 등이 아닌 영역 클릭인 경우만 디버그 카운트
            const isInteractive = e.target.closest('button') || e.target.closest('input');
            if (!isInteractive) {
                triggerDebugPanel();
                
                // PC 오토플레이 방지 해제 대응 (클릭 발생 시)
                if (state.stream && videoStream && videoStream.paused) {
                    console.log("[AutoPlay Recovery] 클릭 발생 감지 - 비디오 재생을 재시도합니다.");
                    videoStream.play().catch(e => console.warn("클릭 재생 실패:", e));
                }
            }
        });
    }

    // 디버그 액션 버튼 연동
    if (btnCloseDebug) {
        btnCloseDebug.addEventListener('click', () => {
            if (debugOverlay) debugOverlay.classList.add('hidden');
        });
    }

    if (btnClearCache) {
        btnClearCache.addEventListener('click', () => {
            if (confirm("정말 전체 캐시를 초기화하고 앱을 다시 시작하시겠습니까?\n이전 캐시로 인한 실행 문제가 해결됩니다.")) {
                forceClearAppCache();
            }
        });
    }

    // 창 크기 변경 시 회전 비율 동적 재정렬
    window.addEventListener('resize', () => {
        applyRotationAndZoom();
    });
}

// 앱 초기화
function init() {
    // 초기 아이콘 상태 정렬
    iconExpand.classList.remove('hidden');
    iconCollapse.classList.add('hidden');

    console.log("심플 카메라 제어기 초기화 시작");

    // 카메라를 최우선으로 즉시 시작 (가장 먼저 호출)
    startCamera();

    // 카메라 시작과 병렬로 나머지 초기화 수행
    fillQuestions();
    setupEvents();
}

// DOMContentLoaded 대신 script가 </body> 직전에 있으므로
// 즉시 실행 가능. DOMContentLoaded는 불필요한 대기를 추가할 수 있음.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM이 이미 준비된 경우 즉시 실행
    init();
}

// 서비스 워커 등록 (PWA 설치 및 오프라인 지원)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 서비스 워커에도 버전 파라미터를 추가하여 브라우저의 서비스 워커 파일 자체의 캐시 꼬임 방지
        navigator.serviceWorker.register('./sw.js?v=20260619_bright_reduced_2')
            .then(reg => {
                console.log('서비스 워커 등록 성공:', reg.scope);
                // 새 서비스 워커 업데이트가 감지되었을 때 로그
                reg.onupdatefound = () => {
                    console.log('서비스 워커 업데이트 발견됨');
                };
            })
            .catch(err => console.log('서비스 워커 등록 실패:', err));
    });
}
