/* ═══════════════════════════════════════════════════════════
   xoleric — global WebGL background · Mercury Liquid Chrome
   Simplex-noise chrome surface + specular lighting, text-free
   Cursor-reactive "ship on the sea": the background drifts,
   ripples and re-tints slowly toward the cursor — the pointer
   itself stays 1:1 and unaffected.
   Fullscreen quad · u_resolution + u_time + u_cursor · DPR-aware
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const canvas = document.getElementById('webgl-bg');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 && ((navigator.deviceMemory || 8) <= 4);
  const glDisabled = (function () {
    try { return localStorage.getItem('xoleric-gl') === '0'; }
    catch (e) { return false; }
  })();
  if (glDisabled) return;

  let gl = null;
  let program = null;
  let resolutionLocation = null;
  let timeLocation = null;
  let cursorLocation = null;
  let cursorVelLocation = null;
  let qualityLocation = null;
  let animationId = 0;
  let lastTime = null;
  let elapsed = 0;

  const lerp = (a, b, t) => a + (b - a) * t;

  let targetX = 0.5, targetY = 0.5;
  let shipX = 0.5, shipY = 0.5;
  let velX = 0, velY = 0;
  let lastShipX = shipX, lastShipY = shipY;

  function updateShip() {
    shipX += (targetX - shipX) * 0.025;
    shipY += (targetY - shipY) * 0.025;
    velX = lerp(velX, (shipX - lastShipX), 0.25);
    velY = lerp(velY, (shipY - lastShipY), 0.25);
    lastShipX = shipX;
    lastShipY = shipY;
  }

  window.addEventListener('pointermove', (e) => {
    targetX = e.clientX / Math.max(window.innerWidth, 1);
    targetY = e.clientY / Math.max(window.innerHeight, 1);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    targetX = t.clientX / Math.max(window.innerWidth, 1);
    targetY = t.clientY / Math.max(window.innerHeight, 1);
  }, { passive: true });

  const VERT = [
    'attribute vec2 position;',
    'void main() { gl_Position = vec4(position, 0.0, 1.0); }'
  ].join('\n');

  const FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    '  precision highp float;',
    '#else',
    '  precision mediump float;',
    '#endif',
    '',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    'uniform vec2 u_cursor;',
    'uniform vec2 u_cursorVel;',
    'uniform float u_quality;',
    '',
    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }',
    '',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '                     -0.577350269189626, 0.024390243902439);',
    '  vec2 i  = floor(v + dot(v, C.yy) );',
    '  vec2 x0 = v -   i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))',
    '    + i.x + vec3(0.0, i1.x, 1.0 ) );',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    'void main() {',
    '  vec2 st = gl_FragCoord.xy / u_resolution.xy;',
    '  float aspect = u_resolution.x / u_resolution.y;',
    '  st.x *= aspect;',
    '',
    '  vec2 cursor = vec2(u_cursor.x * aspect, u_cursor.y);',
    '  float time = u_time * 0.055;',
    '',
    '  vec2 p = st * 1.8;',
    '  p.y -= time;',
    '',
    '  // water flows back as the ship moves through it',
    '  p -= u_cursorVel * 0.32;',
    '',
    '  // distance to the ship',
    '  vec2 toShip = cursor - st;',
    '  float dist = length(toShip * vec2(1.0, 1.35));',
    '  float pull = exp(-dist * 3.0);',
    '',
    '  // slow swell rippling outward from the ship',
    '  float ripple = sin(dist * 16.0 - time * 1.4) * pull;',
    '',
    '  // bow the surface gently toward the ship',
    '  p += (toShip / (length(toShip) + 0.001)) * pull * 0.22;',
    '  p.y += ripple * 0.3;',
    '',
    '  float n1 = snoise(p);',
    '  float n2 = snoise(p * 2.2 + vec2(0.0, time * 0.25)) * u_quality;',
    '  float val = n1 * 0.65 + n2 * 0.35;',
    '  val += ripple * 0.1;',
    '',
    '  vec2 e = vec2(0.025, 0.0);',
    '  float nx = snoise(p + e.xy) - snoise(p - e.xy);',
    '  float ny = snoise(p + e.yx) - snoise(p - e.yx);',
    '  vec3 normal = normalize(vec3(-nx * 1.4, -ny * 1.4, 1.0));',
    '',
    '  vec3 lightDir = normalize(vec3(0.3 + u_cursorVel.x * 2.0, 0.7 + u_cursorVel.y * 2.0, 0.5));',
    '  vec3 viewDir = vec3(0.0, 0.0, 1.0);',
    '  vec3 reflectDir = reflect(-lightDir, normal);',
    '  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 24.0);',
    '',
    '  float chromeVal = sin(val * 3.8 + normal.y * 1.8) * 0.5 + 0.5;',
    '',
    '  vec3 darkSteel  = vec3(0.002, 0.002, 0.002);',
    '  vec3 midChrome  = vec3(0.035, 0.035, 0.035);',
    '  vec3 pureSilver = vec3(0.1, 0.1, 0.1);',
    '  vec3 whiteGlow  = vec3(0.16, 0.16, 0.16);',

    '  vec3 color = mix(darkSteel, midChrome, smoothstep(0.0, 0.45, chromeVal));',
    '  color = mix(color, pureSilver, smoothstep(0.45, 0.85, chromeVal));',
    '  color = mix(color, whiteGlow, smoothstep(0.85, 1.0, chromeVal));',

    '  // the sea harmonizes with the ship — gray accents swell around it',
    '  vec3 seaA = vec3(0.02, 0.02, 0.02);',
    '  vec3 seaB = vec3(0.05, 0.05, 0.05);',
    '  color = mix(color, seaA, pull * 0.4);',
    '  color = mix(color, seaB, clamp(u_cursor.x * 0.5 + u_cursor.y * 0.2, 0.0, 0.6) * 0.28);',
    '  color += seaB * (spec * 0.35 + ripple * 0.1);',

    '  // soft moonlight glow on the water at the ship',
    '  float glow = exp(-dist * dist * 5.0);',
    '  color += vec3(0.12, 0.12, 0.12) * glow * 0.16;',
    '  color += seaB * glow * 0.1;',

    '  color += vec3(spec * 0.06);',
    '',
    '  gl_FragColor = vec4(color, 1.0);',
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

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    timeLocation = gl.getUniformLocation(program, 'u_time');
    cursorLocation = gl.getUniformLocation(program, 'u_cursor');
    cursorVelLocation = gl.getUniformLocation(program, 'u_cursorVel');
    qualityLocation = gl.getUniformLocation(program, 'u_quality');
    return true;
  }

  function resize() {
    if (!gl) return;
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5);
    canvas.width = Math.round(window.innerWidth * maxPixelRatio);
    canvas.height = Math.round(window.innerHeight * maxPixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(qualityLocation, lowEnd ? 0.55 : 1.0);
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
    if (!reduceMotion) {
      updateShip();
      gl.uniform2f(cursorLocation, shipX, shipY);
      gl.uniform2f(cursorVelLocation, velX * 14, velY * 14);
    }
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
