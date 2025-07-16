// ========== FILTROS AVANÇADOS PARA LUPA TERRA ==========

class ImageFilters {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // Filtro Sepia Avançado
    applySepia(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Matriz de transformação sepia
            data[i] = Math.min(255, Math.round((r * 0.393) + (g * 0.769) + (b * 0.189)));
            data[i + 1] = Math.min(255, Math.round((r * 0.349) + (g * 0.686) + (b * 0.168)));
            data[i + 2] = Math.min(255, Math.round((r * 0.272) + (g * 0.534) + (b * 0.131)));
        }
        
        return imageData;
    }

    // Filtro Solarize Avançado
    applySolarize(imageData) {
        const data = imageData.data;
        const len = data.length;
        const threshold = 128;
        
        for (let i = 0; i < len; i += 4) {
            data[i] = data[i] > threshold ? 255 - data[i] : data[i];
            data[i + 1] = data[i + 1] > threshold ? 255 - data[i + 1] : data[i + 1];
            data[i + 2] = data[i + 2] > threshold ? 255 - data[i + 2] : data[i + 2];
        }
        
        return imageData;
    }

    // Filtro Blur Gaussiano
    applyGaussianBlur(imageData, radius = 1) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Kernel Gaussiano 3x3
        const kernel = [
            1/16, 2/16, 1/16,
            2/16, 4/16, 2/16,
            1/16, 2/16, 1/16
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
                    
                    output[idx + c] = Math.round(sum);
                }
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
        
        return imageData;
    }

    // Filtro Sharpen Avançado
    applySharpen(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Kernel de nitidez
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
                    
                    output[idx + c] = Math.max(0, Math.min(255, Math.round(sum)));
                }
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
        
        return imageData;
    }

    // Filtro Vintage
    applyVintage(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Aplicar tom vintage
            data[i] = Math.min(255, Math.round(r * 1.2 + 30));
            data[i + 1] = Math.min(255, Math.round(g * 1.0 + 20));
            data[i + 2] = Math.min(255, Math.round(b * 0.8 + 10));
        }
        
        return imageData;
    }

    // Filtro Posterize
    applyPosterize(imageData, levels = 8) {
        const data = imageData.data;
        const len = data.length;
        const step = 255 / (levels - 1);
        
        for (let i = 0; i < len; i += 4) {
            data[i] = Math.round(data[i] / step) * step;
            data[i + 1] = Math.round(data[i + 1] / step) * step;
            data[i + 2] = Math.round(data[i + 2] / step) * step;
        }
        
        return imageData;
    }

    // Filtro Emboss
    applyEmboss(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Kernel de relevo
        const kernel = [
            -2, -1, 0,
            -1, 1, 1,
            0, 1, 2
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
                    
                    output[idx + c] = Math.max(0, Math.min(255, Math.round(sum + 128)));
                }
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
        
        return imageData;
    }

    // Filtro Edge Detection
    applyEdgeDetection(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Kernel Sobel X
        const sobelX = [
            -1, 0, 1,
            -2, 0, 2,
            -1, 0, 1
        ];
        
        // Kernel Sobel Y
        const sobelY = [
            -1, -2, -1,
            0, 0, 0,
            1, 2, 1
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                let gx = 0, gy = 0;
                let kernelIdx = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
                        const gray = (data[neighborIdx] + data[neighborIdx + 1] + data[neighborIdx + 2]) / 3;
                        
                        gx += gray * sobelX[kernelIdx];
                        gy += gray * sobelY[kernelIdx];
                        kernelIdx++;
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const value = Math.max(0, Math.min(255, Math.round(magnitude)));
                
                output[idx] = value;
                output[idx + 1] = value;
                output[idx + 2] = value;
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
        
        return imageData;
    }

    // Filtro Warm
    applyWarm(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
            data[i] = Math.min(255, Math.round(data[i] * 1.1));
            data[i + 1] = Math.min(255, Math.round(data[i + 1] * 1.05));
            data[i + 2] = Math.min(255, Math.round(data[i + 2] * 0.9));
        }
        
        return imageData;
    }

    // Filtro Cool
    applyCool(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
            data[i] = Math.min(255, Math.round(data[i] * 0.9));
            data[i + 1] = Math.min(255, Math.round(data[i + 1] * 1.05));
            data[i + 2] = Math.min(255, Math.round(data[i + 2] * 1.1));
        }
        
        return imageData;
    }

    // Filtro Brightness/Contrast
    applyBrightnessContrast(imageData, brightness = 0, contrast = 0) {
        const data = imageData.data;
        const len = data.length;
        
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < len; i += 4) {
            // Aplicar brilho
            let r = data[i] + brightness;
            let g = data[i + 1] + brightness;
            let b = data[i + 2] + brightness;
            
            // Aplicar contraste
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
            
            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        }
        
        return imageData;
    }

    // Filtro Hue/Saturation
    applyHueSaturation(imageData, hue = 0, saturation = 0) {
        const data = imageData.data;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            // Converter RGB para HSV
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            
            let h = 0;
            if (delta !== 0) {
                if (max === r) {
                    h = ((g - b) / delta) % 6;
                } else if (max === g) {
                    h = (b - r) / delta + 2;
                } else {
                    h = (r - g) / delta + 4;
                }
                h *= 60;
                if (h < 0) h += 360;
            }
            
            const s = max === 0 ? 0 : delta / max;
            const v = max;
            
            // Aplicar ajustes
            h = (h + hue) % 360;
            const newS = Math.max(0, Math.min(1, s + saturation / 100));
            
            // Converter HSV para RGB
            const c = v * newS;
            const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
            const m = v - c;
            
            let newR = 0, newG = 0, newB = 0;
            
            if (h >= 0 && h < 60) {
                newR = c; newG = x; newB = 0;
            } else if (h >= 60 && h < 120) {
                newR = x; newG = c; newB = 0;
            } else if (h >= 120 && h < 180) {
                newR = 0; newG = c; newB = x;
            } else if (h >= 180 && h < 240) {
                newR = 0; newG = x; newB = c;
            } else if (h >= 240 && h < 300) {
                newR = x; newG = 0; newB = c;
            } else if (h >= 300 && h < 360) {
                newR = c; newG = 0; newB = x;
            }
            
            data[i] = Math.round((newR + m) * 255);
            data[i + 1] = Math.round((newG + m) * 255);
            data[i + 2] = Math.round((newB + m) * 255);
        }
        
        return imageData;
    }
}

// Exportar classe para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageFilters;
} else {
    window.ImageFilters = ImageFilters;
}
