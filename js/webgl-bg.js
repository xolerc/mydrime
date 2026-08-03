/* ═══════════════════════════════════════════════════════════
   xoleric — global WebGL background (clean, text-free shader)
   Fullscreen quad · u_resolution + u_time · DPR-aware · pauses
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const canvas = document.getElementById('webgl-bg');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let gl = null;
  let program = null;
  let resolutionLocation = null;
  let timeLocation = null;
  let animationId = 0;
  let lastTime = null;
  let elapsed = 0;

  const VERT = [
    'attribute vec2 a_position;',
    'void main() { gl_Position = vec4(a_position, 0.0, 1.0); }'
  ].join('\n');

  const FRAG = [
    'precision highp float;',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    '',
    'void main() {',
    '  vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);',
    '',
    '  vec3 col = vec3(0.012, 0.014, 0.03);',
    '',
    '  for (int i = 0; i < 4; i++) {',
    '    float fi = float(i);',
    '    float t = u_time * (0.05 + 0.022 * fi);',
    '    vec2 c = vec2(',
    '      cos(t + fi * 2.3) * (0.55 + 0.12 * fi),',
    '      sin(t * 1.2 + fi * 1.9) * (0.5 + 0.1 * fi)',
    '    );',
    '    float g = exp(-pow(length(p - c), 2.0) * 1.8);',
    '    vec3 tint;',
    '    if (i == 0) tint = vec3(0.02, 0.12, 0.34);',
    '    else if (i == 1) tint = vec3(0.0, 0.28, 0.5);',
    '    else if (i == 2) tint = vec3(0.36, 0.10, 0.5);',
    '    else tint = vec3(0.0, 0.45, 0.58);',
    '    col += tint * g;',
    '  }',
    '',
    '  float vig = smoothstep(1.4, 0.45, length(p));',
    '  col *= mix(0.5, 1.0, vig);',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('webgl-bg shader:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function initWebGL() {
    gl = canvas.getContext('webgl', { antialias: false })
      || canvas.getContext('experimental-webgl', { antialias: false });
    return !!gl;
  }

  function setupProgram() {
    const vs = createShader(gl.VERTEX_SHADER, VERT);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('webgl-bg link:', gl.getProgramInfoLog(program));
      return false;
    }
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1, 1,   1, -1,   1, 1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    timeLocation = gl.getUniformLocation(program, 'u_time');
    return true;
  }

  function resize() {
    if (!gl) return;
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * maxPixelRatio);
    canvas.height = Math.round(window.innerHeight * maxPixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 100);
  }, { passive: true });

  function draw(now) {
    if (!gl || gl.isContextLost()) return;
    if (lastTime != null) elapsed += (now - lastTime) / 1000;
    lastTime = now;
    gl.uniform1f(timeLocation, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function render(now) {
    draw(now);
    animationId = requestAnimationFrame(render);
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(animationId);
    animationId = 0;
    lastTime = null;
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    if (initWebGL() && setupProgram()) {
      resize();
      if (!reduceMotion) animationId = requestAnimationFrame(render);
    }
  }, false);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
      animationId = 0;
      lastTime = null;
    } else if (!reduceMotion && !animationId) {
      animationId = requestAnimationFrame(render);
    }
  });

  if (initWebGL() && setupProgram()) {
    resize();
    if (reduceMotion) {
      draw(performance.now());
    } else {
      animationId = requestAnimationFrame(render);
    }
  }
})();
