precision mediump float;

uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_zoom;
uniform int u_colorIndex;
varying vec2 v_texCoord;

void main() {
  vec2 texCoord = v_texCoord * u_zoom;
  vec4 color = texture2D(u_image, texCoord);

  // Aplicar brilho
  if (u_brightness > 0.0) {
    color.rgb += vec3(u_brightness);
  } else {
    color.rgb -= vec3(-u_brightness);
  }

  // Exemplo de uso do colorIndex: preto e branco
  if (u_colorIndex == 2) {
    float luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
    color = vec4(luminance, luminance, luminance, color.a);
  } else if (u_colorIndex == 3) {
    color = vec4(1.0 - color.rgb, color.a); // Invertido
  }

  gl_FragColor = color;
}
