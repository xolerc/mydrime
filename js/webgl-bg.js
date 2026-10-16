/* ═══════════════════════════════════════════════════════════
   xoleric — global WebGL background · SUV (NULL//SHIFT 13-Suv port)
   NULL__SHIFT.html dagi 13-Suv (mode 12) to'liq ko'chirma:
   WVS/WFS point-water shader + 8 ripple + yomg'ir + tomchi + iz.
   Portfolio foni sifatida moslashtirilgan:
   - canvas#webgl-bg (fixed, z-index -1, pointer-events none)
   - interaksiya window dan (bosish=to'lqin, sudrash=iz, scroll=yomg'ir)
   - window.xolericGL API saqlangan (app.js o'zgarmaydi)
   SAFETY: watchdog + DPR cap + reduced-motion + THREE yuklanmasa fallback.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('webgl-bg');
  if (!canvas) return;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

  var smallScreen = (window.innerWidth || 800) < 768;
  var hw = (navigator.hardwareConcurrency || 4);
  var devMem = 8;
  if (typeof navigator.deviceMemory === 'number') devMem = navigator.deviceMemory;
  var lowEnd = coarse || smallScreen || hw <= 4 || devMem <= 4;
  var isMobile = coarse || smallScreen;

  /* ── NULL//SHIFT 13-Suv shaderlari (to'liq, o'zgarmagan) ── */
  var WVS = [
    'uniform float t,asp,pr,size,tsc,ent,res,dirA,en;',
    'uniform vec4 R[8];',
    'attribute vec3 a;',
    'varying float vH,vD;',
    'void main(){',
    'vec2 p=a.xy*2.1-1.05;',
    'vec2 w=vec2(cos(dirA),sin(dirA)),q2=vec2(-w.y,w.x);',
    'float ph=dot(p,w)*(2.2+ent*2.)-t*tsc*.8,qq=dot(p,q2);',
    'float h0=(.5*sin(ph+1.4*sin(qq*3.+t*tsc*.5))+.3*sin(qq*5.-t*tsc*.7+ph*.5)+.15*sin((p.x+p.y)*7.+t*tsc))*(.6+en*.4);',
    'float hr=0.;vec2 dp=vec2(0.);',
    'for(int i=0;i<8;i++){vec4 r=R[i];float dt=t-r.z;if(dt>0.&&dt<7.){vec2 dv=(p-r.xy)*vec2(asp,1.);float d=length(dv);float x=d-dt*.95;float env=exp(-x*x*9.)*exp(-dt*.55)/(1.+d*1.6);float hh=r.w*env*cos(x*22.)*(.7+res*.6);hr+=hh;dp+=normalize(dv+1e-5)/vec2(asp,1.)*hh*.025;}}',
    'p+=dp+.01*vec2(cos(t*.7+a.z*6.2832),sin(t*.6+a.z*6.2832))*(1.+h0);',
    'p.y+=h0*.015+hr*.04;',
    'vH=clamp(hr*1.4+h0*.35,-1.,1.);vD=a.z;',
    'gl_Position=vec4(p,0.,1.);',
    'gl_PointSize=size*pr*(1.+max(vH,0.)*1.6)*(.7+.6*a.z);}'
  ].join('\n');

  var WFS = [
    'uniform float cp;',
    'varying float vH,vD;',
    'void main(){',
    'float d=length(gl_PointCoord-.5);if(d>.5)discard;',
    'float al=smoothstep(.5,.1,d);',
    'vec3 deep=mix(.5+.5*cos(6.2832*(cp+vec3(0.,.1,.2)+vD*.05)),vec3(.1,.45,.85),.55);',
    'float hi=smoothstep(.15,1.,vH);',
    'vec3 c=deep*(.3+.55*smoothstep(-.6,.6,vH))+vec3(.6,.85,1.)*hi*.7;',
    'gl_FragColor=vec4(c*al*.8,al*.8);}'
  ].join('\n');

  /* ── Suv sozlamalari (NULL//SHIFT dagi jonli qiymatlar) ── */
  var ENT = 0.75, RES = 0.55, CP = 0.55, TSC = 1.0, DIRA = 0.0;

  var gl = null, renderer = null, scene = null, cam = null;
  var wpts = null, WU = null, RP = [], ri = 0;
  var WN = [22000, 40000, 65000], PRS = [1, 1.25, 1.5];
  var q = lowEnd ? 0 : 1;

  var running = false, disabled = false, animationId = 0;
  var lastTime = null, elapsed = 0;
  var lx = 0, ly = 0, lastWake = 0, nextRain = 0, nextDrop = 0;
  var vel = 0, lastPX = 0.5, lastPY = 0.5;

  function ndc(cx, cy) {
    return [cx / Math.max(window.innerWidth, 1) * 2 - 1, 1 - cy / Math.max(window.innerHeight, 1) * 2];
  }

  function ripple(x, y, a) {
    if (!WU) return;
    RP[ri].set(x, y, elapsed, a);
    ri = (ri + 1) % 8;
  }

  function buildWater() {
    if (!wpts || !WU) return;
    var asp = window.innerWidth / Math.max(window.innerHeight, 1);
    var N = WN[q];
    var cols = Math.max(2, Math.round(Math.sqrt(N * asp)));
    var rows = Math.max(2, Math.round(N / cols));
    var A = new Float32Array(cols * rows * 3), k = 0;
    for (var j = 0; j < rows; j++) {
      for (var i2 = 0; i2 < cols; i2++) {
        A[k++] = (i2 + Math.random()) / cols;
        A[k++] = (j + Math.random()) / rows;
        A[k++] = Math.random();
      }
    }
    var ng = new THREE.BufferGeometry();
    ng.setAttribute('a', new THREE.BufferAttribute(A, 3));
    ng.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cols * rows * 3), 3));
    wpts.geometry.dispose();
    wpts.geometry = ng;
    WU.asp.value = asp;
  }

  function resize() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PRS[q]));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (WU) {
      WU.pr.value = renderer.getPixelRatio();
      WU.size.value = 2.3;
    }
    buildWater();
  }

  function setQ(n) {
    q = n;
    resize();
  }

  /* ── watchdog (eski chrome fon bilan bir xil) ── */
  var frameCount = 0, slowFrames = 0, fastFrames = 0, hugeFrames = 0, warmingUp = 0;
  var lastFrameNow = null;
  var FPS_TIERS = isMobile ? [2, 4] : [1, 2, 4];
  var fpsTier = 0;

  function draw(now) {
    if (!renderer) return false;
    if (lastTime != null) elapsed += (now - lastTime) / 1000;
    lastTime = now;
    try {
      WU.t.value = elapsed;
      /* kursor tezligi → to'lqin kuchi (scroll/sudrashda yomg'ir) */
      var av = Math.abs(vel);
      vel *= 0.94;
      WU.en.value = Math.min(av * 40, 2);
      WU.dirA.value = DIRA;
      /* avtomatik yomg'ir + tomchi (NULL//SHIFT dagi kabi) */
      if (av > 0.02 && elapsed > nextRain) {
        ripple(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.45);
        nextRain = elapsed + 0.25;
      }
      if (elapsed > nextDrop) {
        ripple(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.3);
        nextDrop = elapsed + 1.8 + Math.random() * 2.5;
      }
      renderer.setClearColor(0x03101c, 1);
      renderer.render(scene, cam);
      return true;
    } catch (e) {
      return false;
    }
  }

  function render(now) {
    if (!running) return;
    frameCount++;
    if (lastFrameNow != null) {
      var dt = now - lastFrameNow;
      if (warmingUp > 0) { warmingUp--; hugeFrames = 0; }
      else if (dt > 500) {
        hugeFrames++;
        if (hugeFrames >= 3) { disableBackground(); return; }
      } else { hugeFrames = 0; }
      if (dt > 80) {
        slowFrames++; fastFrames = 0;
        if (slowFrames >= 12 && fpsTier < FPS_TIERS.length - 1) { slowFrames = 0; fpsTier++; }
        else if (slowFrames >= 12) { disableBackground(); return; }
      } else {
        slowFrames = 0; fastFrames++;
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
      animationId = 0; running = false;
      return;
    }
    animationId = requestAnimationFrame(render);
  }

  function stopLoop() {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }

  function disableBackground() {
    running = false; disabled = true;
    stopLoop();
    try { sessionStorage.setItem('xoleric-gl-off', String(Date.now())); } catch (e) {}
    try { canvas.style.display = 'none'; } catch (e) {}
    try { if (window.xolericGL && typeof window.xolericGL.onDisable === 'function') window.xolericGL.onDisable(); } catch (e) {}
  }

  function killedThisSession() {
    try {
      var v = parseInt(sessionStorage.getItem('xoleric-gl-off') || '0', 10);
      if (!v) return false;
      if (Date.now() - v > 3 * 60 * 1000) {
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
    if (typeof THREE === 'undefined') return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    try {
      scene = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      RP = [];
      for (var i = 0; i < 8; i++) RP.push(new THREE.Vector4(0, 0, -99, 0));
      var uniforms = {
        t: { value: 0 }, tsc: { value: TSC }, ent: { value: ENT }, res: { value: RES },
        cp: { value: CP }, pr: { value: 1 }, asp: { value: 1 }, size: { value: 2.3 },
        dirA: { value: DIRA }, en: { value: 0 }, R: { value: RP }
      };
      WU = uniforms;
      wpts = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.ShaderMaterial({
          uniforms: uniforms, vertexShader: WVS, fragmentShader: WFS,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        })
      );
      wpts.frustumCulled = false;
      scene.add(wpts);
      resize();
      /* ilk to'lqin — sahifa ochilganda markazda */
      elapsed = 0;
      ripple(0, 0, 0.9);
      running = true;
      lastTime = null;
      warmingUp = 8; hugeFrames = 0; slowFrames = 0; fastFrames = 0; fpsTier = 0;
      animationId = requestAnimationFrame(render);
      try { canvas.style.display = ''; } catch (e) {}
      return true;
    } catch (e) {
      stopLoop(); running = false; disabled = true;
      return false;
    }
  }

  function disableGl() {
    running = false; disabled = true;
    stopLoop();
    try { canvas.style.display = 'none'; } catch (e) {}
  }

  window.xolericGL = {
    enable: enableBackground,
    disable: disableGl,
    isOn: function () { return running; },
    canRun: function () {
      return typeof window.WebGLRenderingContext !== 'undefined' && !reduceMotion && !killedThisSession();
    },
    onDisable: null
  };

  /* ── interaksiya: canvas pointer-events:none → window dan ── */
  window.addEventListener('pointerdown', function (e) {
    if (!running) return;
    if (e.target && (e.target.closest('a') || e.target.closest('button'))) return;
    var n = ndc(e.clientX, e.clientY);
    lx = n[0]; ly = n[1];
    ripple(lx, ly, 1);
    lastPX = e.clientX / Math.max(window.innerWidth, 1);
    lastPY = e.clientY / Math.max(window.innerHeight, 1);
  }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    if (!running) return;
    var nx = e.clientX / Math.max(window.innerWidth, 1);
    var ny = e.clientY / Math.max(window.innerHeight, 1);
    vel += Math.abs(nx - lastPX) * 2 + Math.abs(ny - lastPY) * 2;
    lastPX = nx; lastPY = ny;
    /* bosib sudrash → iz */
    if (e.buttons > 0) {
      var n = ndc(e.clientX, e.clientY);
      lx = n[0]; ly = n[1];
      var now = performance.now();
      if (now - lastWake > 70) { lastWake = now; ripple(lx, ly, 0.3); }
    }
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!running) return;
    var t = e.touches[0];
    if (!t) return;
    var n = ndc(t.clientX, t.clientY);
    var now = performance.now();
    if (now - lastWake > 70) { lastWake = now; ripple(n[0], n[1], 0.3); }
    vel += 0.01;
  }, { passive: true });

  window.addEventListener('wheel', function () {
    if (!running) return;
    vel += 0.02;
  }, { passive: true });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { try { if (running) resize(); } catch (e) {} }, 100);
  }, { passive: true });

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    running = false;
    stopLoop();
    lastTime = null;
  }, false);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stopLoop(); }
    else if (running) {
      lastFrameNow = null; slowFrames = 0; fastFrames = 0; hugeFrames = 0;
      warmingUp = 8; fpsTier = 0; lastTime = null;
      animationId = requestAnimationFrame(render);
    }
  });
})();
