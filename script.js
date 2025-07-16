// ========== VARIÁVEIS GLOBAIS SEGURAS ==========
let zoom = 1, brightness = 1, filterIndex = 0, frozen = false, stream = null;
let hideTimeout = null, muted = false, showFPS = false, highContrast = false;
let frameCount = 0, frameTimeStart = 0, frameTimeSum = 0, frameAverageRate = 0;
let isInitialized = false, permissionGranted = false;

// ========== ELEMENTOS DOM SEGUROS ==========
const elements = {
    glCanvas: document.getElementById('glCanvas'),
    video: document.getElementById('video'),
    brightnessValue: document.getElementById('brightnessValue'),
    zoomValue: document.getElementById('zoomValue'),
    colorValue: document.getElementById('colorValue'),
    cameraSelect: document.getElementById('cameraSelect'),
    cameraStatus: document.getElementById('cameraStatus'),
    statusText: document.getElementById('statusText'),
    statusIndicator: document.getElementById('statusIndicator'),
    focusIndicator: document.getElementById('focusIndicator'),
    notifications: document.getElementById('notifications'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    helpModal: document.getElementById('helpModal'),
    secondMenu: document.getElementById('secondMenu')
};

// ========== CONFIGURAÇÕES AVANÇADAS DE CÂMERA ==========
const ADVANCED_CAMERA_CONSTRAINTS = {
    video: {
        width: { ideal: 3840, min: 1920 },
        height: { ideal: 2160, min: 1080 },
        frameRate: { ideal: 60, min: 30 },
        facingMode: 'environment',
        focusMode: 'continuous',
        exposureMode: 'continuous',
        whiteBalanceMode: 'continuous',
        autoGainControl: true,
        noiseSuppression: true,
        echoCancellation: false,
        latency: 0.01,
        aspectRatio: 16/9
    }
};

// ========== FILTROS SEGUROS ==========
const FILTER_CONFIGS = {
    names: [
        "normal", "vermelho", "verde", "azul", "grayscale", "invert", 
        "sepia", "solarize", "blur", "sharpen", "vintage", "posterize",
        "yellow-invert", "green-dominant", "blue-yellow-post", 
        "gray-natural", "black-white-hard", "black-white-soft", "blue-vibrant"
    ],
    descriptions: [
        "Visualização normal", "Filtro vermelho", "Filtro verde", "Filtro azul",
        "Escala de cinza", "Cores invertidas", "Sépia vintage", "Solarização",
        "Desfoque suave", "Nitidez aumentada", "Efeito vintage", "Posterização",
        "Amarelo-preto", "Verde dominante", "Azul-amarelo", "Cinza natural",
        "Preto e branco alto contraste", "Preto e branco suave", "Azul vibrante"
    ]
};

// ========== UTILIDADES SEGURAS ==========
function sanitizeInput(input) {
    if (typeof input !== 'string') return String(input);
    return input.replace(/[<>'"&]/g, '');
}

function validateNumber(value, min, max) {
    const num = parseFloat(value);
    return isNaN(num) ? min : Math.max(min, Math.min(max, num));
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = sanitizeInput(message);
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    elements.notifications.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function updateCameraStatus(status, type = 'info') {
    if (elements.statusText) {
        elements.statusText.textContent = sanitizeInput(status);
    }
    if (elements.statusIndicator) {
        elements.statusIndicator.className = `status-indicator ${type}`;
    }
}

function showLoading(text = 'Carregando...') {
    elements.loadingText.textContent = sanitizeInput(text);
    elements.loadingOverlay.style.display = 'flex';
    elements.loadingOverlay.setAttribute('aria-hidden', 'false');
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
    elements.loadingOverlay.setAttribute('aria-hidden', 'true');
}

// ========== FUNÇÕES DE FILTRO OTIMIZADAS ==========
function applyGrayscale(imageData) {
    const data = imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    return imageData;
}

function applyInvert(imageData) {
    const data = imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
    return imageData;
}

function applyHighContrast(imageData) {
    const data = imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        if (luminance > 128) {
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
        } else {
            data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
        }
    }
    return imageData;
}

function applyColorChannel(imageData, channel) {
    const data = imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
        switch (channel) {
            case "vermelho":
                data[i + 1] = 0; data[i + 2] = 0;
                break;
            case "verde":
                data[i] = 0; data[i + 2] = 0;
                break;
            case "azul":
                data[i] = 0; data[i + 1] = 0;
                break;
        }
    }
    return imageData;
}

// ========== RENDERIZAÇÃO AVANÇADA ==========
function renderFrame() {
    if (!elements.glCanvas || !elements.video || !isInitialized) return;
    
    measureAverageFrameRate();
    
    const ctx = elements.glCanvas.getContext('2d', {
        willReadFrequently: true,
        alpha: false,
        desynchronized: true,
        colorSpace: 'srgb'
    });
    
    if (!ctx) return;
    
    // Configurações de alta qualidade
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Ajustar tamanho do canvas
    if (elements.video.videoWidth > 0 && elements.video.videoHeight > 0) {
        const videoWidth = elements.video.videoWidth;
        const videoHeight = elements.video.videoHeight;
        
        if (elements.glCanvas.width !== videoWidth || elements.glCanvas.height !== videoHeight) {
            elements.glCanvas.width = videoWidth;
            elements.glCanvas.height = videoHeight;
            elements.glCanvas.style.width = '100vw';
            elements.glCanvas.style.height = '100vh';
        }
    }
    
    if (!frozen && stream && elements.video.readyState >= 2) {
        ctx.clearRect(0, 0, elements.glCanvas.width, elements.glCanvas.height);
        
        // Aplicar zoom
        const zoomFactor = validateNumber(zoom, 1, 10);
        const scaleFactor = 1 / Math.pow(1.15, zoomFactor - 1);
        const srcW = elements.video.videoWidth * scaleFactor;
        const srcH = elements.video.videoHeight * scaleFactor;
        const srcX = (elements.video.videoWidth - srcW) / 2;
        const srcY = (elements.video.videoHeight - srcH) / 2;
        
        // Aplicar brilho
        const brightnessLevel = validateNumber(brightness, 1, 10);
        const brightnessValue = 0.5 + (brightnessLevel - 1) * 0.15;
        ctx.filter = `brightness(${brightnessValue})`;
        
        // Desenhar vídeo
        ctx.drawImage(
            elements.video,
            srcX, srcY, srcW, srcH,
            0, 0, elements.glCanvas.width, elements.glCanvas.height
        );
        
        ctx.filter = 'none';
        
        // Aplicar filtros
        if (filterIndex > 0 || highContrast) {
            try {
                let frame = ctx.getImageData(0, 0, elements.glCanvas.width, elements.glCanvas.height);
                
                if (highContrast) {
                    frame = applyHighContrast(frame);
                } else {
                    const filterName = FILTER_CONFIGS.names[filterIndex];
                    switch (filterName) {
                        case "vermelho":
                        case "verde":
                        case "azul":
                            frame = applyColorChannel(frame, filterName);
                            break;
                        case "grayscale":
                            frame = applyGrayscale(frame);
                            break;
                        case "invert":
                            frame = applyInvert(frame);
                            break;
                        // Adicionar outros filtros aqui
                    }
                }
                
                ctx.putImageData(frame, 0, 0);
            } catch (error) {
                console.error('Erro ao aplicar filtro:', error);
            }
        }
    }
    
    // Exibir FPS
    if (showFPS) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 24px Inter, Arial, sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        const fps = frameCount > 1 ? (1000 / (frameAverageRate / 9)).toFixed(1) : 0;
        const fpsText = `FPS: ${fps}`;
        ctx.strokeText(fpsText, 20, 50);
        ctx.fillText(fpsText, 20, 50);
    }
    
    requestAnimationFrame(renderFrame);
}

function measureAverageFrameRate() {
    const now = performance.now();
    if (frameCount === 0) {
        frameTimeStart = now;
        frameCount = 1;
        return;
    }
    
    frameTimeSum += now - frameTimeStart;
    frameCount++;
    if (frameCount > 10) {
        frameAverageRate = frameTimeSum / (frameCount - 1);
        frameTimeSum = 0;
        frameCount = 1;
    }
    
    frameTimeStart = now;
}

// ========== FUNÇÕES DE CÂMERA SEGURAS ==========
async function requestCameraPermission() {
    try {
        showLoading('Solicitando permissão para câmera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        permissionGranted = true;
        updateCameraStatus('Permissão concedida', 'success');
        showNotification('Permissão de câmera concedida', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao solicitar permissão:', error);
        updateCameraStatus('Permissão negada', 'error');
        showNotification('Permissão de câmera necessária para usar o aplicativo', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

async function listCameras() {
    try {
        if (!navigator.mediaDevices?.enumerateDevices) {
            throw new Error('Navegador não suporta enumeração de dispositivos');
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        elements.cameraSelect.innerHTML = '<option value="">Selecione uma câmera</option>';
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = sanitizeInput(device.label || `Câmera ${index + 1}`);
            elements.cameraSelect.appendChild(option);
        });
        
        updateCameraStatus(`${videoDevices.length} câmera(s) encontrada(s)`, 'success');
        return videoDevices.length > 0;
    } catch (error) {
        console.error('Erro ao listar câmeras:', error);
        updateCameraStatus('Erro ao listar câmeras', 'error');
        return false;
    }
}

async function startCamera(deviceId) {
    try {
        showLoading('Iniciando câmera...');
        
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Navegador não suporta acesso à câmera');
        }
        
        // Parar stream anterior
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Configurações avançadas
        const constraints = {
            video: {
                ...ADVANCED_CAMERA_CONSTRAINTS.video,
                deviceId: deviceId ? { exact: deviceId } : undefined
            }
        };
        
        // Fallback para configurações básicas
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.warn('Configurações avançadas falharam, usando básicas:', error);
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                }
            });
        }
        
        if (!stream) {
            throw new Error('Falha ao obter stream da câmera');
        }
        
        // Configurar vídeo
        elements.video.srcObject = stream;
        elements.video.playsInline = true;
        elements.video.muted = true;
        
        // Eventos de vídeo
        elements.video.onloadedmetadata = () => {
            const width = elements.video.videoWidth;
            const height = elements.video.videoHeight;
            console.log(`Resolução da câmera: ${width}x${height}`);
            updateCameraStatus(`Câmera ativa: ${width}x${height}`, 'success');
        };
        
        elements.video.oncanplay = () => {
            elements.glCanvas.style.display = 'block';
            elements.video.style.display = 'none';
            isInitialized = true;
            
            if (!frozen) {
                renderFrame();
            }
            
            showNotification('Câmera iniciada com sucesso', 'success');
        };
        
        elements.video.onerror = (error) => {
            console.error('Erro no vídeo:', error);
            updateCameraStatus('Erro na câmera', 'error');
            showNotification('Erro na câmera', 'error');
        };
        
        await elements.video.play();
        
    } catch (error) {
        console.error('Erro ao iniciar câmera:', error);
        updateCameraStatus('Falha ao iniciar câmera', 'error');
        showNotification('Erro ao iniciar câmera: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ========== FUNÇÕES DE INTERFACE ACESSÍVEL ==========
function updateUI() {
    // Atualizar valores
    if (elements.brightnessValue) {
        elements.brightnessValue.textContent = brightness;
    }
    if (elements.zoomValue) {
        elements.zoomValue.textContent = zoom;
    }
    if (elements.colorValue) {
        elements.colorValue.textContent = FILTER_CONFIGS.names[filterIndex];
    }
    
    // Atualizar ARIA labels
    updateARIALabels();
}

function updateARIALabels() {
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const brightnessUpBtn = document.getElementById('brightnessUp');
    const brightnessDownBtn = document.getElementById('brightnessDown');
    const colorNextBtn = document.getElementById('colorNext');
    const colorPrevBtn = document.getElementById('colorPrev');
    
    if (zoomInBtn) {
        zoomInBtn.setAttribute('aria-label', `Aumentar zoom. Zoom atual: ${zoom}x`);
    }
    if (zoomOutBtn) {
        zoomOutBtn.setAttribute('aria-label', `Diminuir zoom. Zoom atual: ${zoom}x`);
    }
    if (brightnessUpBtn) {
        brightnessUpBtn.setAttribute('aria-label', `Aumentar brilho. Brilho atual: ${brightness}`);
    }
    if (brightnessDownBtn) {
        brightnessDownBtn.setAttribute('aria-label', `Diminuir brilho. Brilho atual: ${brightness}`);
    }
    if (colorNextBtn) {
        colorNextBtn.setAttribute('aria-label', `Próximo filtro. Filtro atual: ${FILTER_CONFIGS.descriptions[filterIndex]}`);
    }
    if (colorPrevBtn) {
        colorPrevBtn.setAttribute('aria-label', `Filtro anterior. Filtro atual: ${FILTER_CONFIGS.descriptions[filterIndex]}`);
    }
}

// ========== CONTROLES SEGUROS ==========
function setupControls() {
    // Zoom
    document.getElementById('zoomIn')?.addEventListener('click', () => {
        if (zoom < 10) {
            zoom++;
            updateUI();
            saveSettings();
            playSound('success');
            showNotification(`Zoom: ${zoom}x`, 'info', 1000);
        }
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', () => {
        if (zoom > 1) {
            zoom--;
            updateUI();
            saveSettings();
            playSound('success');
            showNotification(`Zoom: ${zoom}x`, 'info', 1000);
        }
    });
    
    // Brilho
    document.getElementById('brightnessUp')?.addEventListener('click', () => {
        if (brightness < 10) {
            brightness++;
            updateUI();
            saveSettings();
            playSound('success');
            showNotification(`Brilho: ${brightness}`, 'info', 1000);
        }
    });
    
    document.getElementById('brightnessDown')?.addEventListener('click', () => {
        if (brightness > 1) {
            brightness--;
            updateUI();
            saveSettings();
            playSound('success');
            showNotification(`Brilho: ${brightness}`, 'info', 1000);
        }
    });
    
    // Filtros
    document.getElementById('colorNext')?.addEventListener('click', () => {
        filterIndex = (filterIndex + 1) % FILTER_CONFIGS.names.length;
        updateUI();
        saveSettings();
        playSound('success');
        showNotification(`Filtro: ${FILTER_CONFIGS.descriptions[filterIndex]}`, 'info', 1500);
    });
    
    document.getElementById('colorPrev')?.addEventListener('click', () => {
        filterIndex = (filterIndex - 1 + FILTER_CONFIGS.names.length) % FILTER_CONFIGS.names.length;
        updateUI();
        saveSettings();
        playSound('success');
        showNotification(`Filtro: ${FILTER_CONFIGS.descriptions[filterIndex]}`, 'info', 1500);
    });
}

// ========== ATALHOS DE TECLADO ==========
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case ' ':
                event.preventDefault();
                toggleFreeze();
                break;
            case 's':
            case 'S':
                event.preventDefault();
                saveImage();
                break;
            case '+':
            case '=':
                event.preventDefault();
                document.getElementById('zoomIn')?.click();
                break;
            case '-':
            case '_':
                event.preventDefault();
                document.getElementById('zoomOut')?.click();
                break;
            case 'ArrowUp':
                event.preventDefault();
                document.getElementById('brightnessUp')?.click();
                break;
            case 'ArrowDown':
                event.preventDefault();
                document.getElementById('brightnessDown')?.click();
                break;
            case 'ArrowRight':
                event.preventDefault();
                document.getElementById('colorNext')?.click();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                document.getElementById('colorPrev')?.click();
                break;
            case 'Escape':
                event.preventDefault();
                closeAllModals();
                break;
        }
    });
}

// ========== FUNÇÕES DE ÁUDIO ACESSÍVEIS ==========
function playSound(type = 'click') {
    if (muted) return;
    
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        let frequency = 440;
        let duration = 0.1;
        
        switch (type) {
            case 'success':
                frequency = 660;
                duration = 0.15;
                break;
            case 'error':
                frequency = 220;
                duration = 0.2;
                break;
            case 'click':
            default:
                frequency = 440;
                duration = 0.1;
                break;
        }
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
        
        oscillator.onended = () => context.close();
    } catch (error) {
        console.error('Erro ao reproduzir som:', error);
    }
}

// ========== FUNÇÕES DE MENU ==========
function toggleFreeze() {
    frozen = !frozen;
    if (frozen) {
        const ctx = elements.glCanvas.getContext('2d');
        if (elements.video.videoWidth > 0 && elements.video.videoHeight > 0) {
            ctx.drawImage(elements.video, 0, 0, elements.glCanvas.width, elements.glCanvas.height);
        }
        showNotification('Imagem congelada', 'info');
    } else {
        showNotification('Imagem descongelada', 'info');
    }
    playSound('success');
}

function saveImage() {
    try {
        const ctx = elements.glCanvas.getContext('2d');
        if (!frozen && elements.video.videoWidth > 0 && elements.video.videoHeight > 0) {
            ctx.drawImage(elements.video, 0, 0, elements.glCanvas.width, elements.glCanvas.height);
        }
        
        const link = document.createElement('a');
        link.download = `lupa-terra-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = elements.glCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        showNotification('Imagem salva com sucesso!', 'success');
        playSound('success');
    } catch (error) {
        console.error('Erro ao salvar imagem:', error);
        showNotification('Erro ao salvar imagem', 'error');
        playSound('error');
    }
}

function toggleHighContrast() {
    highContrast = !highContrast;
    document.body.classList.toggle('high-contrast', highContrast);
    showNotification(highContrast ? 'Alto contraste ativado' : 'Alto contraste desativado', 'info');
    playSound('success');
    saveSettings();
}

function closeAllModals() {
    elements.helpModal.style.display = 'none';
    elements.helpModal.setAttribute('aria-hidden', 'true');
    elements.secondMenu.style.display = 'none';
    elements.secondMenu.setAttribute('aria-hidden', 'true');
}

// ========== SALVAMENTO SEGURO ==========
function saveSettings() {
    try {
        const settings = {
            zoom: validateNumber(zoom, 1, 10),
            brightness: validateNumber(brightness, 1, 10),
            filterIndex: validateNumber(filterIndex, 0, FILTER_CONFIGS.names.length - 1),
            muted: Boolean(muted),
            showFPS: Boolean(showFPS),
            highContrast: Boolean(highContrast),
            cameraId: sanitizeInput(elements.cameraSelect.value || ''),
            version: '2.0.0'
        };
        
        localStorage.setItem('lupaTerraWebSecure', JSON.stringify(settings));
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('lupaTerraWebSecure');
        if (saved) {
            const settings = JSON.parse(saved);
            
            zoom = validateNumber(settings.zoom, 1, 10);
            brightness = validateNumber(settings.brightness, 1, 10);
            filterIndex = validateNumber(settings.filterIndex, 0, FILTER_CONFIGS.names.length - 1);
            muted = Boolean(settings.muted);
            showFPS = Boolean(settings.showFPS);
            highContrast = Boolean(settings.highContrast);
            
            if (highContrast) {
                document.body.classList.add('high-contrast');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// ========== INICIALIZAÇÃO SEGURA ==========
async function initializeApp() {
    try {
        showLoading('Inicializando aplicação...');
        
        // Carregar configurações
        loadSettings();
        
        // Configurar controles
        setupControls();
        setupKeyboardShortcuts();
        
        // Solicitar permissão
        if (!await requestCameraPermission()) {
            throw new Error('Permissão de câmera necessária');
        }
        
        // Listar câmeras
        await listCameras();
        
        // Iniciar câmera
        if (elements.cameraSelect.options.length > 1) {
            await startCamera(elements.cameraSelect.value);
        } else {
            await startCamera();
        }
        
        // Atualizar UI
        updateUI();
        
        showNotification('Aplicação inicializada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro na inicialização: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', initializeApp);

// Controle de visibilidade
let visibilityTimeout;
function showControls() {
    document.querySelectorAll('.fab, header').forEach(el => {
        el.classList.remove('hide');
    });
    
    clearTimeout(visibilityTimeout);
    visibilityTimeout = setTimeout(() => {
        document.querySelectorAll('.fab, header').forEach(el => {
            el.classList.add('hide');
        });
    }, 8000);
}

['mousemove', 'touchstart', 'click', 'keydown'].forEach(event => {
    document.addEventListener(event, showControls);
});

showControls();
