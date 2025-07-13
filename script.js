let zoom = 1, brightness = 1, colorIndex = 1, frozen = false, stream = null, hideTimeout = null, muted = false, showFPS = false;
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

function indexMapper(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function initWebGL() {
    const gl = glCanvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
        console.error('WebGL não suportado, usando fallback 2D.');
        return null;
    }
    console.log('WebGL context initialized.');

    const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        uniform sampler2D u_image;
        uniform float u_brightness;
        uniform float u_zoomScale;
        uniform int u_colorIndex;
        varying vec2 v_texCoord;
        void main() {
            float zoomFactor = 1.0 - u_zoomScale;
            vec2 zoomedCoord = vec2(
                v_texCoord.x * (1.0 + zoomFactor) - (zoomFactor * 0.5),
                v_texCoord.y * (1.0 + zoomFactor) - (zoomFactor * 0.5)
            );
            if (zoomedCoord.x > 1.0 || zoomedCoord.y > 1.0 || zoomedCoord.x < 0.0 || zoomedCoord.y < 0.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }
            vec4 color = texture2D(u_image, zoomedCoord);
            if (color.a == 0.0 || color.r < 0.0 || color.g < 0.0 || color.b < 0.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }

            vec3 adjustedColor = color.rgb;
            if (u_brightness != 0.0) {
                adjustedColor += vec3(u_brightness);
            }

            vec3 foreground = vec3(1.0, 1.0, 1.0);
            vec3 background = vec3(0.0, 0.0, 0.0);
            float threshold = 0.5;

            if (u_colorIndex == 1) { // Natural RGB
                // No change
            } else if (u_colorIndex == 2) { // GrayScale
                float luminance = 0.299 * adjustedColor.r + 0.587 * adjustedColor.g + 0.114 * adjustedColor.b;
                adjustedColor = vec3(luminance, luminance, luminance);
            } else if (u_colorIndex == 3) { // GrayScaleInverted
                float luminance = 0.299 * adjustedColor.r + 0.587 * adjustedColor.g + 0.114 * adjustedColor.b;
                adjustedColor = vec3(1.0 - luminance, 1.0 - luminance, 1.0 - luminance) * 1.5;
                adjustedColor = clamp(adjustedColor, 0.0, 1.0);
            } else if (u_colorIndex >= 4) { // HiContrast (4-11)
                float luminance = 0.299 * adjustedColor.r + 0.587 * adjustedColor.g + 0.114 * adjustedColor.b;
                if (luminance > threshold) {
                    adjustedColor = foreground;
                } else {
                    adjustedColor = background;
                }
                if (u_colorIndex == 5) { foreground = vec3(1.0, 1.0, 0.0); } // Black/Yellow
                else if (u_colorIndex == 6) { foreground = vec3(0.0, 1.0, 0.0); } // Black/Green
                else if (u_colorIndex == 7) { foreground = vec3(0.0, 0.0, 0.0); background = vec3(1.0, 1.0, 1.0); } // White/Black
                else if (u_colorIndex == 8) { foreground = vec3(0.0, 0.0, 1.0); } // White/Blue
                else if (u_colorIndex == 9) { foreground = vec3(0.0, 0.0, 1.0); background = vec3(1.0, 1.0, 1.0); } // Blue/White
                else if (u_colorIndex == 10) { foreground = vec3(0.0, 0.0, 1.0); background = vec3(1.0, 1.0, 0.0); } // Blue/Yellow
                else if (u_colorIndex == 11) { foreground = vec3(1.0, 1.0, 0.0); } // Yellow/Black
            }

            adjustedColor = clamp(adjustedColor, 0.0, 1.0);
            gl_FragColor = vec4(adjustedColor, color.a);
        }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Erro no vertex shader:', gl.getShaderInfoLog(vertexShader));
        return null;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Erro no fragment shader:', gl.getShaderInfoLog(fragmentShader));
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Erro no linking do programa:', gl.getProgramInfoLog(program));
        return null;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoords = new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        0.0, 0.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    return { gl, program };
}

let webGLContext = initWebGL();

function updateUI() {
    brightnessValue.textContent = brightness;
    zoomValue.textContent = zoom;
    colorValue.textContent = colorIndex;
    if (webGLContext) {
        const { gl, program } = webGLContext;
        const brightnessLoc = gl.getUniformLocation(program, 'u_brightness');
        const zoomLoc = gl.getUniformLocation(program, 'u_zoomScale');
        const colorIndexLoc = gl.getUniformLocation(program, 'u_colorIndex');
        if (brightnessLoc && zoomLoc && colorIndexLoc) {
            gl.uniform1f(brightnessLoc, indexMapper(brightness, 1, 10, -0.3, 0.3) * 13.0 / 255.0);
            gl.uniform1f(zoomLoc, indexMapper(zoom, 1, 10, 0.0, 0.9));
            gl.uniform1i(colorIndexLoc, colorIndex);
            renderFrame();
        } else {
            console.error('Uniform locations not found.');
        }
    }
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
    if (webGLContext && !frozen && stream && video.readyState >= 2) {
        const { gl, program } = webGLContext;
        if (!glCanvas.width || !glCanvas.height) {
            glCanvas.width = video.videoWidth || window.innerWidth;
            glCanvas.height = video.videoHeight || window.innerHeight;
            console.log('Canvas dimensions set:', glCanvas.width, 'x', glCanvas.height);
        }
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
            console.log('Texture loaded successfully, video readyState:', video.readyState);
        } catch (e) {
            console.error('Erro ao carregar textura:', e);
            gl.clearColor(1.0, 0.0, 0.0, 1.0); // Tela vermelha para indicar erro
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (showFPS) {
            const ctx = glCanvas.getContext('2d');
            ctx.fillStyle = 'red';
            ctx.font = '20px Arial';
            const fps = frameCount > 1 ? (1000 / (frameAverageRate / 9)).toFixed(1) : 0;
            ctx.fillText(`fps: ${fps}`, 10, 30);
        }
    } else if (!webGLContext && !frozen && stream) {
        if (!glCanvas.width || !glCanvas.height) {
            glCanvas.width = video.videoWidth || window.innerWidth;
            glCanvas.height = video.videoHeight || window.innerHeight;
            console.log('Fallback canvas dimensions set:', glCanvas.width, 'x', glCanvas.height);
        }
        const ctx = glCanvas.getContext('2d');
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0);
            console.log('Fallback 2D render successful.');
        } else {
            console.warn('Video dimensions not available:', video.videoWidth, 'x', video.videoHeight);
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, glCanvas.width, glCanvas.height);
        }
        if (showFPS) {
            ctx.fillStyle = 'red';
            ctx.font = '20px Arial';
            const fps = frameCount > 1 ? (1000 / (frameAverageRate / 9)).toFixed(1) : 0;
            ctx.fillText(`fps: ${fps}`, 10, 30);
        }
    } else {
        console.warn('RenderFrame conditions not met:', {
            frozen, stream: !!stream, readyState: video.readyState, videoWidth: video.videoWidth, videoHeight: video.videoHeight
        });
        if (!frozen && !stream) {
            const ctx = glCanvas.getContext('2d');
            ctx.fillStyle = 'yellow';
            ctx.fillRect(0, 0, glCanvas.width, glCanvas.height);
        }
    }
    requestAnimationFrame(renderFrame);
}

// Zoom
document.getElementById('zoomIn').onclick = () => { if (zoom < 10) { zoom++; updateUI(); saveSettings(); playSound(); scaleButton('zoomIn'); } };
document.getElementById('zoomOut').onclick = () => { if (zoom > 1) { zoom--; updateUI(); saveSettings(); playSound(); scaleButton('zoomOut'); } };

// Brilho
document.getElementById('brightnessUp').onclick = () => { if (brightness < 10) { brightness++; updateUI(); saveSettings(); playSound(); scaleButton('brightnessUp'); } };
document.getElementById('brightnessDown').onclick = () => { if (brightness > 1) { brightness--; updateUI(); saveSettings(); playSound(); scaleButton('brightnessDown'); } };

// Cor
document.getElementById('colorNext').onclick = () => { colorIndex = (colorIndex % 11) + 1; updateUI(); saveSettings(); playSound(); scaleButton('colorNext'); };
document.getElementById('colorPrev').onclick = () => { colorIndex = ((colorIndex - 2 + 11) % 11) + 1; updateUI(); saveSettings(); playSound(); scaleButton('colorPrev'); };

// Congelar imagem
freezeBtn.onclick = () => { toggleFreeze(); playSound(); scaleButton('secondFreeze'); };

// Seleção de câmera
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

// Ocultar botões e header após 8s sem interação
function showElements() {
    groups.forEach(g => g.classList.remove('hide'));
    header.classList.remove('hide');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        groups.forEach(g => g.classList.add('hide'));
        header.classList.add('hide');
    }, 8000);
}
['mousemove', 'touchstart', 'click'].forEach(ev => {
    document.body.addEventListener(ev, showElements);
});
showElements();

// Câmeras
async function listCameras() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.error('MediaDevices API não suportada.');
            alert('Seu navegador não suporta acesso a dispositivos de mídia.');
            return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices:', devices);
        cameraSelect.innerHTML = '';
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length > 0) {
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Câmera ${i+1}`;
                cameraSelect.appendChild(option);
            });
            console.log('Camera options populated:', videoDevices.length);
        } else {
            console.warn('Nenhum dispositivo de vídeo encontrado.');
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
            console.error('getUserMedia não suportado.');
            alert('Seu navegador não suporta acesso à câmera.');
            return;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log('Previous stream stopped.');
        }
        console.log('Requesting camera with deviceId:', deviceId);
        stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: window.innerWidth }, height: { ideal: window.innerHeight } }
        });
        if (!stream) {
            console.error('Stream não recebido.');
            alert('Falha ao iniciar a câmera: stream inválido.');
            return;
        }
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.warn('Metadados de vídeo inválidos.');
            }
        };
        video.oncanplay = () => {
            console.log('Video can play, starting render:', video.readyState);
            glCanvas.style.display = 'block';
            video.style.display = 'none';
            updateUI();
        };
        video.onerror = (e) => {
            console.error('Erro no elemento de vídeo:', e);
            alert('Erro ao carregar o vídeo: ' + e.message);
        };
    } catch (e) {
        console.error('Erro ao acessar a câmera:', e);
        alert('Erro ao acessar a câmera: ' + e.message);
    }
}

// Salvar/restaurar preferências
function saveSettings() {
    localStorage.setItem('lupaTerraWeb', JSON.stringify({ zoom, brightness, colorIndex, cameraId: cameraSelect.value, muted, showFPS }));
}
function loadSettings() {
    const s = JSON.parse(localStorage.getItem('lupaTerraWeb') || '{}');
    zoom = s.zoom || 1;
    brightness = s.brightness || 1;
    colorIndex = s.colorIndex || 1;
    muted = s.muted || false;
    showFPS = s.showFPS || false;
    if (muted) {
        document.getElementById('muteBtn').innerHTML = '🔊 Ligar Som';
    } else {
        document.getElementById('muteBtn').innerHTML = '🔇 Mute';
    }
    if (showFPS) {
        document.getElementById('fpsBtn').innerHTML = 'ℹ️ Ocultar FPS';
    } else {
        document.getElementById('fpsBtn').innerHTML = 'ℹ️ FPS';
    }
}

// Congelar/descongelar imagem
function toggleFreeze() {
    frozen = !frozen;
    if (frozen) {
        glCanvas.style.display = 'none';
        video.style.display = 'block';
        const ctx = glCanvas.getContext('2d');
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0);
        } else {
            console.warn('Não foi possível congelar: vídeo sem dimensões.');
        }
    } else {
        video.style.display = 'none';
        glCanvas.style.display = 'block';
    }
}

// Função para salvar imagem
function saveImage() {
    try {
        const ctx = glCanvas.getContext('2d');
        if (!frozen && video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0);
        }
        const link = document.createElement('a');
        link.download = 'lupa_terra_img.png';
        link.href = glCanvas.toDataURL('image/png');
        link.click();
        alert("IMAGEM SALVA!");
    } catch (e) {
        alert('Erro ao salvar imagem: ' + e.message);
        console.error(e);
    }
}

// Função para mostrar taxa de atualização
function showInfo() {
    try {
        const fps = video.srcObject?.getVideoTracks()[0]?.getSettings()?.frameRate;
        alert(`Taxa de atualização: ${fps ? fps + ' fps' : 'Indisponível'}`);
    } catch (e) {
        alert('Erro ao obter taxa de atualização: ' + e.message);
        console.error(e);
    }
}

// Função para resetar configurações
function resetConfig() {
    zoom = 1;
    brightness = 1;
    colorIndex = 1;
    muted = false;
    showFPS = false;
    updateUI();
    saveSettings();
    playSound();
    scaleButton('resetBtn');
    document.getElementById('muteBtn').innerHTML = '🔇 Mute';
    document.getElementById('fpsBtn').innerHTML = 'ℹ️ FPS';
}

// Função para ligar/desligar flash (simulado)
function toggleFlash() {
    alert("Função de lanterna não suportada no navegador.");
    playSound();
    scaleButton('flashBtn');
}

// Função mute
function toggleMute() {
    muted = !muted;
    playSound();
    scaleButton('muteBtn');
    if (muted) {
        document.getElementById('muteBtn').innerHTML = '🔊 Ligar Som';
    } else {
        document.getElementById('muteBtn').innerHTML = '🔇 Mute';
    }
    saveSettings();
}

// Função para mostrar/ocultar FPS
function toggleFPS() {
    showFPS = !showFPS;
    playSound();
    scaleButton('fpsBtn');
    if (showFPS) {
        document.getElementById('fpsBtn').innerHTML = 'ℹ️ Ocultar FPS';
    } else {
        document.getElementById('fpsBtn').innerHTML = 'ℹ️ FPS';
    }
    saveSettings();
}

// Sons simples
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

// Botão vermelho — menu avançado
redBtn.onclick = () => {
    secondMenu.style.display = secondMenu.style.display === 'flex' ? 'none' : 'flex';
    setTimeout(() => { secondMenu.style.display = 'none'; }, 5000);
    scaleButton('redBtn');
};

// Segundo menu — funções
document.getElementById('secondFreeze').onclick = () => { toggleFreeze(); playSound(); scaleButton('secondFreeze'); };
document.getElementById('secondSave').onclick = () => { saveImage(); playSound(); scaleButton('secondSave'); };
document.getElementById('infoBtn').onclick = () => { showInfo(); playSound(); scaleButton('infoBtn'); };
document.getElementById('resetBtn').onclick = () => { resetConfig(); playSound(); };
document.getElementById('flashBtn').onclick = () => { toggleFlash(); playSound(); };
document.getElementById('muteBtn').onclick = () => { toggleMute(); playSound(); };
document.getElementById('fpsBtn').onclick = () => { toggleFPS(); playSound(); };

// Escala visual dos botões ao clicar
function scaleButton(id) {
    const button = document.getElementById(id);
    if (button) {
        button.style.transform = 'scale(1.15)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
    }
}

// Inicialização
window.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await listCameras();
    if (cameraSelect.options.length > 0) {
        await startCamera(cameraSelect.value);
    } else {
        console.warn('Nenhuma câmera disponível para iniciar.');
        alert('Nenhuma câmera disponível. Verifique as conexões ou permissões.');
    }
});