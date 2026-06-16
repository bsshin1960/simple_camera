// 프로그램 상태 관리
const state = {
    stream: null,
    zoom: 1.0,
    rotation: 0,          // 회전 각도 (0, 90, 180, 270)
    brightness: 1.8,      // 기본 밝기 배율 (1.8x - 기존 2.25x 대비 20% 감소)
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
const btnRotateCamera = document.getElementById('btn-rotate-camera');
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

// 카메라 스트림 시작 (속도 최적화)
async function startCamera() {
    // 기존 스트림 중단
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }

    // --- 1단계: 최대한 빠르게 카메라를 즉시 켜기 ---
    // 장치 목록 탐색 없이 바로 스트림 요청 (지연 최소화)
    let constraints;
    if (state.cameras.length > 0) {
        // 이미 장치 목록이 있으면 해당 deviceId 직접 지정
        const cam = state.cameras[state.activeCameraIndex];
        constraints = {
            video: { deviceId: { exact: cam.deviceId }, width: { ideal: 3840 }, height: { ideal: 2160 } },
            audio: false
        };
        console.log(`카메라 적용: ${cam.label}`);
    } else {
        // 처음 실행: 장치 목록 없이 즉시 후면 카메라(또는 기본 카메라) 요청
        constraints = {
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
            audio: false
        };
    }

    try {
        state.stream = await navigator.mediaDevices.getUserMedia(constraints);

        // 밝기 필터 즉각 보정 실행 (기본 1.50배)
        applyBrightness();

        // 가로 화면인데 비디오 스트림이 세로로 왜곡되어 들어오는 경우 자동 90도 회전 설정
        const activeTrack = state.stream.getVideoTracks()[0];
        if (activeTrack) {
            // 회전 값 결정 (저장된 값 우선, 없으면 가로 모드 기본 90도 또는 세로 해상도 대응)
            const trackLabel = activeTrack.label || 'default';
            const savedRotation = localStorage.getItem(`rotation_${trackLabel}`);
            if (savedRotation !== null) {
                state.rotation = parseInt(savedRotation, 10);
            } else {
                const settings = activeTrack.getSettings();
                if (window.innerWidth > window.innerHeight) {
                    // 가로 화면인데 물체가 세로로 누워 보이는 문제 해결을 위해 기본 회전 각도를 90도로 자동 보정
                    state.rotation = 90;
                } else if (settings.width < settings.height) {
                    state.rotation = 90;
                } else {
                    state.rotation = 0;
                }
            }
            applyRotationAndZoom();
        }

        // srcObject 할당 후 즉시 play() - onloadedmetadata 이벤트 대기 없이 바로 실행
        videoStream.srcObject = state.stream;
        videoStream.play().catch(err => console.warn("play() 자동실행 경고 (무시 가능):", err));

        // --- 2단계: 카메라가 켜진 후 백그라운드에서 장치 목록 탐색 ---
        // 처음 실행이거나 목록이 비어 있으면 비동기로 장치 목록 갱신
        if (state.cameras.length === 0) {
            enumerateCameraDevices().then(() => {
                // 탐색된 목록에서 현재 활성 스트림과 일치하는 카메라 인덱스 설정
                const activeTrack = state.stream && state.stream.getVideoTracks()[0];
                if (activeTrack && state.cameras.length > 0) {
                    const settings = activeTrack.getSettings();
                    const matchIdx = state.cameras.findIndex(c => c.deviceId === settings.deviceId);
                    if (matchIdx >= 0) state.activeCameraIndex = matchIdx;
                }
            });
        }

        console.log("카메라 활성화 성공");
    } catch (err) {
        console.error("카메라 구동 실패:", err);
        // 특정 deviceId 실패 시 기본 video:true 로 재시도
        if (constraints.video.deviceId) {
            console.log("기본 방식으로 재시도합니다...");
            try {
                state.stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: { ideal: 3840 }, height: { ideal: 2160 } }, 
                    audio: false 
                });
                
                // 밝기 필터 즉각 보정 실행
                applyBrightness();

                const activeTrack = state.stream.getVideoTracks()[0];
                if (activeTrack) {
                    const trackLabel = activeTrack.label || 'default';
                    const savedRotation = localStorage.getItem(`rotation_${trackLabel}`);
                    if (savedRotation !== null) {
                        state.rotation = parseInt(savedRotation, 10);
                    } else {
                        const settings = activeTrack.getSettings();
                        if (window.innerWidth > window.innerHeight) {
                            state.rotation = 90;
                        } else if (settings.width < settings.height) {
                            state.rotation = 90;
                        } else {
                            state.rotation = 0;
                        }
                    }
                    applyRotationAndZoom();
                }

                videoStream.srcObject = state.stream;
                videoStream.play().catch(e => console.warn(e));
            } catch (fallbackErr) {
                showNotification("카메라에 연결할 수 없습니다. 권한 설정 또는 다른 앱의 카메라 점유 여부를 확인해 주세요.");
            }
        } else {
            showNotification("카메라에 연결할 수 없습니다. 권한 설정 또는 다른 앱의 카메라 점유 여부를 확인해 주세요.");
        }
    }
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
        const rect = cameraBox.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const scaleFactor = Math.max(rect.width / rect.height, rect.height / rect.width);
            transformStr = `scale(${state.zoom * scaleFactor}) rotate(${state.rotation}deg)`;
        } else {
            transformStr = `scale(${state.zoom * 1.78}) rotate(${state.rotation}deg)`;
        }
    } else if (state.rotation === 180) {
        transformStr = `scale(${state.zoom}) rotate(180deg)`;
    }
    
    videoStream.style.transform = transformStr;
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


    // 4. 커서/터치 반응형 제어
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

        appContainer.addEventListener('touchstart', () => {
            showControlsTemporarily();
        }, { passive: true });

        appContainer.addEventListener('touchmove', () => {
            showControlsTemporarily();
        }, { passive: true });

        // 더블 탭/클릭 시 화면 모드 토글 지원
        appContainer.addEventListener('dblclick', (e) => {
            // 버튼 및 슬라이더 영역 제외 클릭 시 작동
            const isSlider = e.target === zoomSlider;
            const isButton = (btnToggleScreen && btnToggleScreen.contains(e.target)) || 
                             (btnSwitchCamera && btnSwitchCamera.contains(e.target)) || 
                             (btnRotateCamera && btnRotateCamera.contains(e.target));
            if (!isSlider && !isButton) {
                toggleScreenMode();
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
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('서비스 워커 등록 성공:', reg.scope))
            .catch(err => console.log('서비스 워커 등록 실패:', err));
    });
}
