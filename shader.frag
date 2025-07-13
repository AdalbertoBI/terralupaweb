precision mediump float;
uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_zoom;
varying vec2 v_texCoord;

void main() {
    vec2 texCoord = v_texCoord * u_zoom;
    vec4 color = texture2D(u_image, texCoord);

    // Aplicar filtros baseados em colorIndex (a ser expandido)
    if (u_brightness > 0.0) {
        color.rgb += vec3(u_brightness);
    } else {
        color.rgb -= vec3(-u_brightness);
    }

    // Placeholder para matrizes de cor
    float r = color.r, g = color.g, b = color.b;
    if (false) { // Substituir por lógica condicional baseada em colorIndex
        // Exemplo: Preto e Branco
        float luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        color = vec4(luminance, luminance, luminance, color.a);
    } else if (false) {
        // Exemplo: Invertido
        color = vec4(1.0 - r, 1.0 - g, 1.0 - b, color.a);
    }

    gl_FragColor = color;
}