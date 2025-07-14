let zoom = 1, brightness = 1, filterIndex = 0, frozen = false, stream = null, hideTimeout = null, muted = false, showFPS = false;

let frameCount = 0, frameTimeStart = 0, frameTimeSum = 0, frameAverageRate = 0;

const glCanvas = document.getElementById('glCanvas');
const video = document.getElementById('video');
const brightnessValue = document.getElementById('brightnessValue');
const zoomValue = document.getElementById('zoomValue');
const colorValue = document.getElementById('colorValue');
const freezeBtn = document.getElementById('secondFreeze');
const cameraBtn = document.getElementById('cameraBtn');
const cameraSelect = document.getElementById('cameraSelect');
const fpsBtn = document.getElementById('fpsBtn');

const groups = [
    document.getElementById('brightnessGroup'),
    document.getElementById('zoomGroup'),
    document.getElementById('colorGroup'),
    document.getElementById('actionsGroup'),
    document.getElementById('redBtn')
];

const header = document.querySelector('header');
const redBtn = document.getElementById('redBtn');
const secondMenu = document.getElementById('secondMenu');

// TODOS OS 19 FILTROS IMPLEMENTADOS
const filterNames = [
    "normal",              // 0
    "vermelho",            // 1
    "verde",               // 2
    "azul",                // 3
    "grayscale",           // 4
    "invert",              // 5
    "sepia",               // 6
    "solarize",            // 7
    "blur",                // 8
    "sharpen",             // 9
    "vintage",             // 10
    "posterize",           // 11
    "yellow-invert",       // 12 - Filtro amarelo com preto
    "green-dominant",      // 13 - Filtro verde dominante
    "blue-yellow-post",    // 14 - Filtro azul-amarelo posterizado
    "gray-natural",        // 15 - Cinza natural (nova imagem 1)
    "black-white-hard",    // 16 - Preto e branco alto contraste (nova imagem 2)
    "black-white-soft",    // 17 - Preto e branco suavizado (nova imagem 3)
    "blue-vibrant"         // 18 - Azul vibrante (nova imagem 4)
];

// ========== FILTROS BÁSICOS ==========

function applyGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    return imageData;
}

function applyInvert(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
    return imageData;
}

function applySepia(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
    return imageData;
}

function applySolarize(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] > 128 ? 255 - data[i] : data[i];
        data[i + 1] = data[i + 1] > 128 ? 255 - data[i + 1] : data[i + 1];
        data[i + 2] = data[i + 2] > 128 ? 255 - data[i + 2] : data[i + 2];
    }
    return imageData;
}

function applyBlur(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
                        sum += data[neighborIdx + c];
                    }
                }
                output[idx + c] = sum / 9;
            }
        }
    }
    
    for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
    }
    return imageData;
}

function applySharpen(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                let kernelIdx = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
                        sum += data[neighborIdx + c] * kernel[kernelIdx];
                        kernelIdx++;
                    }
                }
                output[idx + c] = Math.max(0, Math.min(255, sum));
            }
        }
    }
    
    for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
    }
    return imageData;
}

function applyVintage(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        data[i] = Math.min(255, r * 1.1 + 20);
        data[i + 1] = Math.min(255, g * 0.9 + 10);
        data[i + 2] = Math.min(255, b * 0.8);
    }
    return imageData;
}

function applyPosterize(imageData) {
    const data = imageData.data;
    const levels = 6;
    const step = 255 / (levels - 1);
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;
        data[i + 1] = Math.round(data[i + 1] / step) * step;
        data[i + 2] = Math.round(data[i + 2] / step) * step;
    }
    return imageData;
}

// ========== FILTROS PERSONALIZADOS ANTERIORES ==========

function applyYellowInvert(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        if (luminance > 100) {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 0;   // B
        } else {
            data[i] = 0;       // R
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
        }
    }
    return imageData;
}

function applyGreenDominant(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        if (luminance > 80) {
            data[i] = 0;       // R
            data[i + 1] = 255; // G
            data[i + 2] = 0;   // B
        } else {
            data[i] = 0;       // R
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
        }
    }
    return imageData;
}

function applyBlueYellowPosterize(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        if (luminance > 170) {
            data[i] = 255;     // R - Amarelo
            data[i + 1] = 255; // G
            data[i + 2] = 0;   // B
        } else if (luminance > 85) {
            data[i] = 0;       // R - Azul
            data[i + 1] = 0;   // G
            data[i + 2] = 255; // B
        } else {
            data[i] = 0;       // R - Preto
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
        }
    }
    return imageData;
}

// ========== NOVOS FILTROS BASEADOS NAS 4 IMAGENS ADICIONAIS ==========

function applyGrayNatural(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Conversão grayscale natural preservando detalhes
        const gray = (r * 0.299 + g * 0.587 + b * 0.114);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    return imageData;
}

function applyBlackWhiteHard(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        // Threshold alto para contraste extremo
        if (luminance > 140) {
            data[i] = 255;     // R - Branco
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
        } else {
            data[i] = 0;       // R - Preto
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
        }
    }
    return imageData;
}

function applyBlackWhiteSoft(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        // Threshold médio para transições mais suaves
        if (luminance > 100) {
            data[i] = 255;     // R - Branco
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
        } else {
            data[i] = 0;       // R - Preto
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
        }
    }
    return imageData;
}

function applyBlueVibrant(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        
        if (luminance > 70) {
            data[i] = 0;       // R - Azul vibrante
            data[i + 1] = 0;   // G
            data[i + 2] = 255; // B
        } else {
            data[i] = 0;       // R - Preto
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
        }
    }
    return imageData;
}

function applyColorChannel(frame, channel) {
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
        if (channel === "vermelho") {
            d[i + 1] = 0; // G
            d[i + 2] = 0; // B
        } else if (channel === "verde") {
            d[i] = 0; // R
            d[i + 2] = 0; // B
        } else if (channel === "azul") {
            d[i] = 0; // R
            d[i + 1] = 0; // G
        }
    }
    return frame;
}

// ========== FUNÇÕES PRINCIPAIS ==========

function indexMapper(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function updateUI() {
    if (brightnessValue) brightnessValue.textContent = brightness;
    if (zoomValue) zoomValue.textContent = zoom;
    if (colorValue) colorValue.textContent = filterNames[filterIndex];
    renderFrame();
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

function renderFrame() {
    measureAverageFrameRate();
    if (!glCanvas) return;
    
    const ctx = glCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (!frozen && stream && video.readyState >= 2) {
        if (!glCanvas.width || !glCanvas.height) {
            glCanvas.width = video.videoWidth || window.innerWidth;
            glCanvas.height = video.videoHeight || window.innerHeight;
        }

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            const zoomFactor = indexMapper(zoom, 1, 10, 1, 0.2);
            const srcW = video.videoWidth * zoomFactor;
            const srcH = video.videoHeight * zoomFactor;
            const srcX = (video.videoWidth - srcW) / 2;
            const srcY = (video.videoHeight - srcH) / 2;

            ctx.filter = `brightness(${indexMapper(brightness, 1, 10, 0.5, 2)})`;
            ctx.drawImage(
                video,
                srcX, srcY, srcW, srcH,
                0, 0, glCanvas.width, glCanvas.height
            );
            ctx.filter = 'none';

            // Aplica todos os filtros implementados
            if (filterIndex > 0) {
                try {
                    let frame = ctx.getImageData(0, 0, glCanvas.width, glCanvas.height);
                    
                    switch (filterNames[filterIndex]) {
                        case "vermelho":
                            frame = applyColorChannel(frame, "vermelho");
                            break;
                        case "verde":
                            frame = applyColorChannel(frame, "verde");
                            break;
                        case "azul":
                            frame = applyColorChannel(frame, "azul");
                            break;
                        case "grayscale":
                            frame = applyGrayscale(frame);
                            break;
                        case "invert":
                            frame = applyInvert(frame);
                            break;
                        case "sepia":
                            frame = applySepia(frame);
                            break;
                        case "solarize":
                            frame = applySolarize(frame);
                            break;
                        case "blur":
                            frame = applyBlur(frame);
                            break;
                        case "sharpen":
                            frame = applySharpen(frame);
                            break;
                        case "vintage":
                            frame = applyVintage(frame);
                            break;
                        case "posterize":
                            frame = applyPosterize(frame);
                            break;
                        case "yellow-invert":
                            frame = applyYellowInvert(frame);
                            break;
                        case "green-dominant":
                            frame = applyGreenDominant(frame);
                            break;
                        case "blue-yellow-post":
                            frame = applyBlueYellowPosterize(frame);
                            break;
                        // NOVOS FILTROS ADICIONADOS
                        case "gray-natural":
                            frame = applyGrayNatural(frame);
                            break;
                        case "black-white-hard":
                            frame = applyBlackWhiteHard(frame);
                            break;
                        case "black-white-soft":
                            frame = applyBlackWhiteSoft(frame);
                            break;
                        case "blue-vibrant":
                            frame = applyBlueVibrant(frame);
                            break;
                    }
                    
                    ctx.putImageData(frame, 0, 0);
                } catch (e) {
                    console.error('Erro ao aplicar filtro:', e);
                    alert('Erro ao aplicar filtro: ' + e.message);
                }
            }
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(0, 0, glCanvas.width, glCanvas.height);
        }
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, glCanvas.width, glCanvas.height);
    }

    if (showFPS) {
        ctx.fillStyle = 'red';
        ctx.font = '20px Arial';
        const fps = frameCount > 1 ? (1000 / (frameAverageRate / 9)).toFixed(1) : 0;
        ctx.fillText(`fps: ${fps}`, 10, 30);
    }

    requestAnimationFrame(renderFrame);
}

// ========== CONTROLES E EVENT LISTENERS ==========

document.getElementById('zoomIn').onclick = () => { if (zoom < 10) { zoom++; updateUI(); saveSettings(); playSound(); scaleButton('zoomIn'); } };
document.getElementById('zoomOut').onclick = () => { if (zoom > 1) { zoom--; updateUI(); saveSettings(); playSound(); scaleButton('zoomOut'); } };
document.getElementById('brightnessUp').onclick = () => { if (brightness < 10) { brightness++; updateUI(); saveSettings(); playSound(); scaleButton('brightnessUp'); } };
document.getElementById('brightnessDown').onclick = () => { if (brightness > 1) { brightness--; updateUI(); saveSettings(); playSound(); scaleButton('brightnessDown'); } };
document.getElementById('colorNext').onclick = () => { filterIndex = (filterIndex + 1) % filterNames.length; updateUI(); saveSettings(); playSound(); scaleButton('colorNext'); };
document.getElementById('colorPrev').onclick = () => { filterIndex = (filterIndex - 1 + filterNames.length) % filterNames.length; updateUI(); saveSettings(); playSound(); scaleButton('colorPrev'); };

freezeBtn.onclick = () => { toggleFreeze(); playSound(); scaleButton('secondFreeze'); };

cameraBtn.onclick = () => {
    cameraSelect.style.display = cameraSelect.style.display === 'none' ? 'block' : 'none';
};

cameraSelect.onchange = () => {
    startCamera(cameraSelect.value);
    cameraSelect.style.display = 'none';
    saveSettings();
    playSound();
    scaleButton('cameraBtn');
};

function showElements() {
    groups.forEach(g => g && g.classList.remove('hide'));
    header && header.classList.remove('hide');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        groups.forEach(g => g && g.classList.add('hide'));
        header && header.classList.add('hide');
    }, 8000);
}

['mousemove', 'touchstart', 'click'].forEach(ev => {
    document.body.addEventListener(ev, showElements);
});
showElements();

// ========== FUNÇÕES DE CÂMERA ==========

async function listCameras() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            alert('Seu navegador não suporta acesso a dispositivos de mídia.');
            return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraSelect.innerHTML = '';
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        if (videoDevices.length > 0) {
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Câmera ${i + 1}`;
                cameraSelect.appendChild(option);
            });
        } else {
            alert('Nenhuma câmera detectada. Verifique as conexões ou permissões.');
        }
    } catch (e) {
        console.error('Erro ao listar câmeras:', e);
        alert('Erro ao listar câmeras: ' + e.message);
    }
}

async function startCamera(deviceId) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Seu navegador não suporta acesso à câmera.');
            return;
        }

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined }
        });

        if (!stream) {
            alert('Falha ao iniciar a câmera: stream inválido.');
            return;
        }

        video.srcObject = stream;
        video.play().catch(e => {
            console.error('Erro ao reproduzir vídeo:', e);
        });

        video.oncanplay = () => {
            glCanvas.style.display = 'block';
            video.style.display = 'none';
            updateUI();
        };

        video.onerror = (e) => {
            console.error('Erro no vídeo:', e);
            alert('Erro no vídeo: ' + e.message);
        };
    } catch (e) {
        console.error('Erro ao acessar a câmera:', e);
        alert('Erro ao acessar a câmera: ' + e.message);
    }
}

// ========== FUNÇÕES DE CONFIGURAÇÃO ==========

function saveSettings() {
    try {
        localStorage.setItem('lupaTerraWeb', JSON.stringify({
            zoom, brightness, filterIndex, cameraId: cameraSelect.value, muted, showFPS
        }));
    } catch (e) {
        console.error('Erro ao salvar configurações:', e);
    }
}

function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem('lupaTerraWeb') || '{}');
        zoom = s.zoom || 1;
        brightness = s.brightness || 1;
        filterIndex = s.filterIndex || 0;
        muted = s.muted || false;
        showFPS = s.showFPS || false;
        
        const muteBtn = document.getElementById('muteBtn');
        const fpsBtn = document.getElementById('fpsBtn');
        
        if (muteBtn) muteBtn.innerHTML = muted ? '🔊 Ligar Som' : '🔇 Mute';
        if (fpsBtn) fpsBtn.innerHTML = showFPS ? 'ℹ️ Ocultar FPS' : 'ℹ️ FPS';
    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
    }
}

// ========== FUNÇÕES DE MENU ==========

function toggleFreeze() {
    frozen = !frozen;
    if (frozen) {
        glCanvas.style.display = 'none';
        video.style.display = 'block';
        const ctx = glCanvas.getContext('2d', { willReadFrequently: true });
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0, glCanvas.width, glCanvas.height);
        }
    } else {
        video.style.display = 'none';
        glCanvas.style.display = 'block';
    }
}

function saveImage() {
    try {
        const ctx = glCanvas.getContext('2d', { willReadFrequently: true });
        if (!frozen && video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0, glCanvas.width, glCanvas.height);
        }

        const link = document.createElement('a');
        link.download = 'lupa_terra_img.png';
        link.href = glCanvas.toDataURL('image/png');
        link.click();
        alert('IMAGEM SALVA!');
    } catch (e) {
        console.error('Erro ao salvar imagem:', e);
        alert('Erro ao salvar imagem: ' + e.message);
    }
}

function showInfo() {
    try {
        const fps = video.srcObject?.getVideoTracks()[0]?.getSettings()?.frameRate;
        alert(`Taxa de atualização: ${fps ? fps + ' fps' : 'Indisponível'}`);
    } catch (e) {
        console.error('Erro ao obter taxa de atualização:', e);
        alert('Erro ao obter taxa de atualização: ' + e.message);
    }
}

function resetConfig() {
    zoom = 1;
    brightness = 1;
    filterIndex = 0;
    muted = false;
    showFPS = false;
    updateUI();
    saveSettings();
    scaleButton('resetBtn');
    
    const muteBtn = document.getElementById('muteBtn');
    const fpsBtn = document.getElementById('fpsBtn');
    
    if (muteBtn) muteBtn.innerHTML = '🔇 Mute';
    if (fpsBtn) fpsBtn.innerHTML = 'ℹ️ FPS';
}

function toggleFlash() {
    alert('Função de lanterna não suportada no navegador.');
    scaleButton('flashBtn');
}

function toggleMute() {
    muted = !muted;
    scaleButton('muteBtn');
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) muteBtn.innerHTML = muted ? '🔊 Ligar Som' : '🔇 Mute';
    saveSettings();
}

function toggleFPS() {
    showFPS = !showFPS;
    scaleButton('fpsBtn');
    const fpsBtn = document.getElementById('fpsBtn');
    if (fpsBtn) fpsBtn.innerHTML = showFPS ? 'ℹ️ Ocultar FPS' : 'ℹ️ FPS';
    saveSettings();
}

// ========== FUNÇÕES DE ÁUDIO E VISUAL ==========

function playSound() {
    if (muted) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 880;
        const g = ctx.createGain();
        g.gain.value = 0.07;
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.08);
        o.onended = () => ctx.close();
    } catch (e) {
        console.error('Erro ao reproduzir som:', e);
    }
}

function scaleButton(id) {
    const button = document.getElementById(id);
    if (button) {
        button.style.transform = 'scale(1.15)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
    }
}

// ========== EVENT LISTENERS DO MENU ==========

if (redBtn) {
    redBtn.onclick = () => {
        if (secondMenu) {
            secondMenu.style.display = secondMenu.style.display === 'flex' ? 'none' : 'flex';
            setTimeout(() => { secondMenu.style.display = 'none'; }, 5000);
        }
        scaleButton('redBtn');
    };
}

document.getElementById('secondFreeze')?.addEventListener('click', () => { toggleFreeze(); scaleButton('secondFreeze'); });
document.getElementById('secondSave')?.addEventListener('click', () => { saveImage(); scaleButton('secondSave'); });
document.getElementById('infoBtn')?.addEventListener('click', () => { showInfo(); scaleButton('infoBtn'); });
document.getElementById('resetBtn')?.addEventListener('click', () => { resetConfig(); });
document.getElementById('flashBtn')?.addEventListener('click', () => { toggleFlash(); });
document.getElementById('muteBtn')?.addEventListener('click', () => { toggleMute(); });
document.getElementById('fpsBtn')?.addEventListener('click', () => { toggleFPS(); });

// ========== INICIALIZAÇÃO ==========

window.addEventListener('DOMContentLoaded', async () => {
    try {
        loadSettings();
        await listCameras();
        if (cameraSelect.options.length > 0) {
            await startCamera(cameraSelect.value);
        } else {
            alert('Nenhuma câmera disponível. Verifique as conexões ou permissões.');
        }
    } catch (e) {
        console.error('Erro na inicialização:', e);
        alert('Erro na inicialização: ' + e.message);
    }
});
