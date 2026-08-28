/* ═══════════════════════════════════════════════════════════
   xoleric — global WebGL background · Mercury Liquid Chrome
   Simplex-noise chrome surface + specular lighting, text-free
   Cursor-reactive "ship on the sea": the background drifts,
   ripples and re-tints slowly toward the cursor — the pointer
   itself stays 1:1 and unaffected.
   Fullscreen quad · u_resolution + u_time + u_cursor · DPR-aware

   SAFETY (universal no-hang):
   - The ONLY page background — app.js enables it whenever the
     browser supports WebGL; the static body gradient is the
     invisible fallback when it cannot run.
   - Software renderers (SWGL/llvmpipe/SwiftShader) are detected
     and skipped — they freeze the tab on CPU-heavy shaders.
   - A frame watchdog auto-disables the loop if it ever runs
     slower than ~12 slow frames or a single 500ms frame.
   - DPR + max-side caps keep the fill-rate bounded on weak GPUs.
   Exposed as window.xolericGL = { enable, disable, isOn, canRun }
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const canvas = document.getElementById('webgl-bg');
  if (!canvas) return;

  let reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* noop */ }

  let coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* noop */ }

  const smallScreen = (window.innerWidth || 800) < 768;
  const hw = (navigator.hardwareConcurrency || 4);
  let devMem = 8;
  if (typeof navigator.deviceMemory === 'number') devMem = navigator.deviceMemory;
  const lowEnd = coarse || smallScreen || hw <= 4 || devMem <= 4;
  const isMobile = coarse || smallScreen;

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
  let running = false;
  let disabled = false;
  let wasRunning = false;

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
    '  // VISIBLY liquid with NO black valleys: even the darkest stop keeps',
    '  // the metal readable, so the page never shows a flat black field.',
    '  vec3 darkSteel  = vec3(0.055, 0.062, 0.078);',
    '  vec3 midChrome  = vec3(0.130, 0.140, 0.165);',
    '  vec3 pureSilver = vec3(0.320, 0.350, 0.420);',
    '  vec3 whiteGlow  = vec3(0.570, 0.600, 0.680);',

    '  vec3 color = mix(darkSteel, midChrome, smoothstep(0.0, 0.45, chromeVal));',
    '  color = mix(color, pureSilver, smoothstep(0.45, 0.85, chromeVal));',
    '  color = mix(color, whiteGlow, smoothstep(0.85, 1.0, chromeVal));',

    '  // the sea harmonizes with the ship — gray accents swell around it',
    '  vec3 seaA = vec3(0.038, 0.042, 0.052);',
    '  vec3 seaB = vec3(0.060, 0.066, 0.078);',
    '  color = mix(color, seaA, pull * 0.4);',
    '  color = mix(color, seaB, clamp(u_cursor.x * 0.5 + u_cursor.y * 0.2, 0.0, 0.6) * 0.28);',
    '  color += seaB * (spec * 0.45 + ripple * 0.12);',

    '  // soft moonlight glow on the water at the ship',
    '  float glow = exp(-dist * dist * 5.0);',
    '  color += vec3(0.14, 0.15, 0.18) * glow * 0.25;',
    '  color += seaB * glow * 0.12;',

    '  color += vec3(spec * 0.10);',
    '',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function initWebGL() {
    const attrs = { antialias: false, failIfMajorPerformanceCaveat: false, powerPreference: 'low-power' };
    gl = canvas.getContext('webgl', attrs)
      || canvas.getContext('experimental-webgl', { antialias: false });
    return !!gl;
  }

  function isSoftwareRenderer(ctx) {
    try {
      const ext = ctx.getExtension('WEBGL_debug_renderer_info');
      if (!ext) return false;
      const renderer = String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
      const vendor = String(ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '').toLowerCase();
      return /swiftshader|llvmpipe|softpipe|software|basic render|basic output|microsoft.*basic/i.test(renderer)
        || /swiftshader|microsoft|llvmpipe/i.test(vendor);
    } catch (e) { return false; }
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
    /* Mobile DPR is capped at 1.25 — modern phones at 3-4x DPR make the GPU
       raster up to 16x more pixels than needed; 1.25 keeps the liquid chrome
       crisp while cutting mobile fill-rate by ~60-70%. Desktop keeps 1.5. */
    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? (isMobile ? 1.25 : 1) : 1.5);
    let w = Math.round(window.innerWidth * dpr);
    let h = Math.round(window.innerHeight * dpr);
    const longSide = Math.max(w, h);
    const MAX_SIDE = 1800;
    if (longSide > MAX_SIDE) {
      const s = MAX_SIDE / longSide;
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(resolutionLocation, w, h);
    gl.uniform1f(qualityLocation, lowEnd ? 0.4 : 1.0);
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      try { if (running) resize(); } catch (e) { /* noop */ }
    }, 100);
  }, { passive: true });

  function draw(now) {
    if (!gl || gl.isContextLost()) return false;
    if (lastTime != null) elapsed += (now - lastTime) / 1000;
    lastTime = now;
    try {
      if (!reduceMotion) {
        updateShip();
        if (cursorLocation) gl.uniform2f(cursorLocation, shipX, shipY);
        if (cursorVelLocation) gl.uniform2f(cursorVelLocation, velX * 14, velY * 14);
      }
      if (timeLocation) gl.uniform1f(timeLocation, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Dynamic FPS limiter — graceful tiers instead of hard-kill.
     Mobile starts at 30fps; if frames keep exceeding 80ms the loop steps
     down to 15fps before ever giving up, and recovers back up once frames
     run fast again for a sustained stretch. A single 500ms+ frame (tab
     switch / GPU stall) still disables the loop as the hard watchdog. */
  let frameCount = 0;
  let slowFrames = 0;
  let fastFrames = 0;
  let lastFrameNow = null;
  const FPS_TIERS = isMobile ? [2, 4] : [1, 2, 4];
  let fpsTier = 0;

  function render(now) {
    if (!running || !gl || gl.isContextLost()) return;
    frameCount++;
    if (lastFrameNow != null) {
      const dt = now - lastFrameNow;
      if (dt > 500) { disableBackground(); return; }
      if (dt > 80) {
        slowFrames++;
        fastFrames = 0;
        if (slowFrames >= 12 && fpsTier < FPS_TIERS.length - 1) { stepDown(); }
        else if (slowFrames >= 12) { disableBackground(); return; }
      } else {
        slowFrames = 0;
        fastFrames++;
        if (fpsTier > 0 && fastFrames >= 60) { fpsTier--; fastFrames = 0; }
      }
    }
    lastFrameNow = now;
    if (frameCount % FPS_TIERS[fpsTier] !== 0) {
      animationId = requestAnimationFrame(render);
      return;
    }
    if (!draw(now)) {
      cancelAnimationFrame(animationId);
      animationId = 0;
      running = false;
      return;
    }
    animationId = requestAnimationFrame(render);
  }

  function stepDown() {
    slowFrames = 0;
    if (fpsTier < FPS_TIERS.length - 1) fpsTier++;
  }

  /* Canvas visibility: the chrome is a fixed background, but pausing the
     render cycle while it is out of view (e.g. hidden behind the loader,
     or any host layout that covers it) saves battery and CPU for free. */
  let canvasVisible = true;
  function initCanvasObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    try {
      const io = new IntersectionObserver((entries) => {
        canvasVisible = entries.some((e) => e.isIntersecting);
        if (!canvasVisible) {
          stopLoop();
        } else if (running && !disabled && animationId === 0) {
          /* animationId===0 guards a duplicate loop: the observer may fire at
             the same time enableBackground() starts its own rAF chain */
          lastFrameNow = null;
          slowFrames = 0;
          fastFrames = 0;
          lastTime = null;
          animationId = requestAnimationFrame(render);
        }
      }, { threshold: 0.05 });
      io.observe(canvas);
    } catch (e) { /* noop */ }
  }
  initCanvasObserver();

  function stopLoop() {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }

  function disableBackground() {
    running = false;
    disabled = true;
    stopLoop();
    try { sessionStorage.setItem('xoleric-gl-off', String(Date.now())); } catch (e) { /* noop */ }
    try { canvas.style.display = 'none'; } catch (e) { /* noop */ }
    try { if (window.xolericGL && typeof window.xolericGL.onDisable === 'function') window.xolericGL.onDisable(); } catch (e) { /* noop */ }
  }

  function killedThisSession() {
    /* The watchdog kill flag now EXPIRES: one bad patch (a long tab switch,
       a temporary GPU spike) must not silence the waves for the whole
       browsing session. After the cooldown a reload brings them back. */
    try {
      const v = parseInt(sessionStorage.getItem('xoleric-gl-off') || '0', 10);
      if (!v) return false;
      if (Date.now() - v > 8 * 60 * 1000) {
        sessionStorage.removeItem('xoleric-gl-off');
        disabled = false;
        return false;
      }
      return true;
    } catch (e) { return false; }
  }

  function enableBackground() {
    if (disabled || running || reduceMotion) return false;
    if (killedThisSession()) { disabled = true; return false; }
    try {
      if (!initWebGL()) return false;
      if (isSoftwareRenderer(gl)) {
        disableBackground();
        return false;
      }
      if (!setupProgram()) {
        disableBackground();
        return false;
      }
      resize();
      wasRunning = true;
      running = true;
      lastTime = null;
      animationId = requestAnimationFrame(render);
      try { canvas.style.display = ''; } catch (e) { /* noop */ }
      return true;
    } catch (e) {
      stopLoop();
      running = false;
      disabled = true;
      return false;
    }
  }

  function disableGl() {
    running = false;
    disabled = true;
    stopLoop();
    try { canvas.style.display = 'none'; } catch (e) { /* noop */ }
  }

  window.xolericGL = {
    enable: enableBackground,
    disable: disableGl,
    isOn: function () { return running; },
    canRun: function () {
      return typeof window.WebGLRenderingContext !== 'undefined'
        && !reduceMotion
        && !killedThisSession();
    },
    onDisable: null
  };

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    wasRunning = running;
    running = false;
    stopLoop();
    lastTime = null;
  }, false);

  canvas.addEventListener('webglcontextcreationerror', () => {
    disabled = true;
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    if (!wasRunning || disabled || reduceMotion) return;
    wasRunning = false;
    try {
      if (initWebGL() && !isSoftwareRenderer(gl) && setupProgram()) {
        resize();
        running = true;
        lastTime = null;
        lastFrameNow = null;
        slowFrames = 0;
        fastFrames = 0;
        fpsTier = 0;
        animationId = requestAnimationFrame(render);
      } else {
        disabled = true;
      }
    } catch (e) {
      running = false;
      disabled = true;
    }
  }, false);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
    } else if (running) {
      /* resume cleanly: without resetting lastFrameNow the first frame back
         carries the whole hidden gap as dt and the watchdog kills the waves */
      lastFrameNow = null;
      slowFrames = 0;
      fastFrames = 0;
      fpsTier = 0;
      lastTime = null;
      animationId = requestAnimationFrame(render);
    }
  });
})();
