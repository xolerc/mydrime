/* ═══════════════════════════════════════════════════════════
   Xoleric Pro Cube — file:///home/xoleric/index.html dan to'liq ko'chirma.
   Yagona farq: matrix foni qo'shilmaydi (mydrime ning WebGL suv foni
   ishlatiladi). O'lchamlar konteyner bo'yicha, animatsiya faqat blok
   ko'rinadigan paytda ishlaydi — scroll sekinlashmaydi.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

class XolericProCore {
    constructor() {
        this.stage = document.getElementById('cubeStage');
        this.container = document.getElementById('canvas-container');
        if (!this.stage || !this.container) return;

        this.measure();

        this.mouse = new THREE.Vector2(0, 0);
        this.targetRotation = new THREE.Vector2(0, 0);

        this.baseHue = Math.random() * 360; // Har bir oyna o'zining unikal rangidan boshlaydi
        this.currentHue = this.baseHue;
        this.time = 0;
        this.frameCount = 0;

        // Birlashish o'zgaruvchilari
        this.mergeFactor = 0; // 0 dan 1 gacha
        this.smoothedMerge = 0;

        // Animatsiya faqat blok ekranda bo'lganda
        this.rafId = 0;
        this.visible = false;
        this.animateBound = this.animate.bind(this);

        // BroadcastChannel Sozlamalari
        this.windowId = Math.random().toString(36).substring(2, 9);
        this.foreignCores = {};
        this.channel = null;
        try {
            this.channel = new BroadcastChannel('xoleric-pro-sync');
            this.channel.onmessage = (e) => {
                if (e.data.type === 'sync' && e.data.id !== this.windowId) {
                    this.foreignCores[e.data.id] = {
                        x: e.data.x,
                        y: e.data.y,
                        hue: e.data.hue,
                        lastUpdate: performance.now()
                    };
                }
            };
        } catch (err) { /* BroadcastChannel yo'q bo'lsa ham kub ishlaydi */ }

        this.init();
        this.addCores(); // Endi ham Box ham PRO shakl qo'shiladi
        this.initPostProcessing();
        // addMatrixBackground() — qo'shilmadi: fon mydrime ning o'z WebGL suvi
        this.addEventListeners();
        this.initVisibility();
    }

    measure() {
        const r = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.round(r.width || this.stage.clientWidth || window.innerWidth));
        this.height = Math.max(1, Math.round(r.height || this.stage.clientHeight || window.innerHeight));
        this.isMobile = this.width < 768;
        this.windowHalfX = this.width / 2;
        this.windowHalfY = this.height / 2;
    }

    init() {
        this.scene = new THREE.Scene();
        // scene.background yo'q — global mydrime WebGL foni ko'rinadi

        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 100);
        this.camera.position.z = this.isMobile ? 7 : 5.5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        // Shaffof fon: mydrime ning global WebGL suvi kub orqasida ko'rinadi
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setSize(this.width, this.height);
        // 1.5 ga cheklash kubni yarim aniqlikda chizadi — mobil ekranda xiralik
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        this.ambientLight = new THREE.AmbientLight(0x222222, 2);
        this.scene.add(this.ambientLight);
        this.pointLight1 = new THREE.PointLight(0xffffff, 40, 20);
        this.scene.add(this.pointLight1);
        this.pointLight2 = new THREE.PointLight(0xffffff, 40, 20);
        this.scene.add(this.pointLight2);

        // Markaziy kuchli yorug'lik (faqat birlashganda yonadi)
        this.coreLight = new THREE.PointLight(0xffffff, 0, 10);
        this.scene.add(this.coreLight);
    }

    addCores() {
        // 1. Asosiy Holat: KUB
        const boxGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);

        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024; this.canvas.height = 1024;
        this.texCtx = this.canvas.getContext('2d', { alpha: false });
        this.canvasTexture = new THREE.CanvasTexture(this.canvas);
        this.canvasTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        this.boxMaterial = new THREE.MeshPhysicalMaterial({
            map: this.canvasTexture, color: 0xffffff, metalness: 0.35, roughness: 0.25,
            emissive: 0x000000
        });

        this.coreBox = new THREE.Mesh(boxGeo, this.boxMaterial);
        this.scene.add(this.coreBox);

        // 2. Birlashgan Holat (PRO): Kvant Halqa (Torus Knot)
        const knotGeo = new THREE.TorusKnotGeometry(0.8, 0.25, 128, 32);
        this.knotMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.9, roughness: 0.1,
            emissive: 0x000000, transparent: true, opacity: 0
        });
        this.coreKnot = new THREE.Mesh(knotGeo, this.knotMaterial);
        // Boshida kichkina va ko'rinmas bo'ladi
        this.coreKnot.scale.set(0, 0, 0);
        this.scene.add(this.coreKnot);

        // Himoya qafasi
        const cageGeo = new THREE.IcosahedronGeometry(1.5, 1);
        this.cageMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.15 });
        this.cage = new THREE.Mesh(cageGeo, this.cageMaterial);
        this.scene.add(this.cage);

        // Global konteyner harakatlanishi uchun
        this.masterGroup = new THREE.Group();
        this.masterGroup.add(this.coreBox);
        this.masterGroup.add(this.coreKnot);
        this.masterGroup.add(this.cage);
        this.masterGroup.add(this.pointLight1);
        this.masterGroup.add(this.pointLight2);
        this.masterGroup.add(this.coreLight);
        this.scene.add(this.masterGroup);
    }

    initPostProcessing() {
        const renderScene = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            0.5, 0.15, 0.75
        );
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);

        /* UnrealBloomPass barcha piksellarga alpha=1 yozadi — canvas qora
           bo'lib qoladi. Oxirgi pass alpha'ni yorqinlikdan qayta hisoblaydi:
           qora = shaffof, kub = ko'rinadi. Global fon ko'rinib turadi. */
        this.composer.addPass(new ShaderPass({
            uniforms: { tDiffuse: { value: null } },
            vertexShader: `
                varying vec2 vUv;
                void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                varying vec2 vUv;
                void main() {
                    vec4 c = texture2D(tDiffuse, vUv);
                    float m = max(max(c.r, c.g), c.b);
                    /* Kub piksellari to'liq shaffof bo'lmasin — aks holda fon
                       bilan aralashib xiralashadi. Faqat juda qora hududlar
                       shaffof qoladi. */
                    float a = smoothstep(0.01, 0.08, m);
                    gl_FragColor = vec4(c.rgb * a, a);
                }
            `
        }));
    }

    updateTexture() {
        if(this.frameCount % 3 !== 0) return;
        this.texCtx.fillStyle = '#050505';
        this.texCtx.fillRect(0, 0, 1024, 1024);
        this.texCtx.lineWidth = 30;
        this.texCtx.strokeStyle = `hsl(${this.currentHue}, 80%, 40%)`;
        this.texCtx.strokeRect(60, 60, 904, 904);

        this.texCtx.font = 'bold 120px Courier New';
        this.texCtx.textAlign = 'center';
        this.texCtx.textBaseline = 'middle';
        this.texCtx.fillStyle = `hsl(${this.currentHue}, 100%, 65%)`;
        this.texCtx.fillText("X O L E R I C", 512, 512);
        this.texCtx.font = '48px Courier New';
        this.texCtx.fillText(this.smoothedMerge > 0.5 ? "QUANTUM MERGE" : "NEURAL CORE", 512, 640);
        this.canvasTexture.needsUpdate = true;
    }

    addEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousemove', (e) => {
            const r = this.container.getBoundingClientRect();
            this.mouse.x = (e.clientX - r.left - this.windowHalfX) * 0.001;
            this.mouse.y = (e.clientY - r.top - this.windowHalfY) * 0.001;
        });
        document.addEventListener('touchmove', (e) => {
            if(e.touches.length > 0) {
                const r = this.container.getBoundingClientRect();
                this.mouse.x = (e.touches[0].clientX - r.left - this.windowHalfX) * 0.002;
                this.mouse.y = (e.touches[0].clientY - r.top - this.windowHalfY) * 0.002;
            }
        }, { passive: true }); // tabiiy scroll to'siqsiz ishlaydi
    }

    initVisibility() {
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                this.visible = !!entries[0].isIntersecting;
                if (this.visible) this.start(); else this.stop();
            }, { threshold: 0.01 });
            io.observe(this.stage);
        } else {
            this.visible = true;
            this.start();
        }
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.stop();
            else if (this.visible) this.start();
        });
    }

    start() {
        if (!this.rafId && !document.hidden && this.visible) {
            this.rafId = requestAnimationFrame(this.animateBound);
        }
    }

    stop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    }

    onWindowResize() {
        this.measure();
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);
    }

    animate() {
        this.rafId = 0;
        if (document.hidden || !this.visible) return;
        this.time += 0.01;

        // Agar yakkalangan bo'lsa o'zining rangini aylantiradi
        if (this.smoothedMerge < 0.05) {
            this.baseHue = (this.baseHue + 0.3) % 360;
            this.currentHue = this.baseHue;
        }

        this.frameCount++;

        // 1. Oynaning global markazini aniqlash
        let leftChrome = (window.outerWidth - window.innerWidth) / 2;
        let topChrome = window.outerHeight - window.innerHeight - leftChrome;
        let myGlobalX = window.screenX + Math.max(0, leftChrome) + this.width / 2;
        let myGlobalY = window.screenY + Math.max(0, topChrome) + this.height / 2;

        if (this.channel) {
            this.channel.postMessage({
                type: 'sync', id: this.windowId, x: myGlobalX, y: myGlobalY, hue: this.baseHue
            });
        }

        // 2. Magnit mexanikasi va Rang sinxronizatsiyasi
        let closestId = null;
        let minDist = Infinity;
        let targetGlobalX = myGlobalX;
        let targetGlobalY = myGlobalY;

        for (let id in this.foreignCores) {
            if (performance.now() - this.foreignCores[id].lastUpdate < 1000) {
                let dist = Math.hypot(this.foreignCores[id].x - myGlobalX, this.foreignCores[id].y - myGlobalY);
                if (dist < minDist) { minDist = dist; closestId = id; }
            } else { delete this.foreignCores[id]; }
        }

        let magnetDistance = 1000;
        let isMagnetized = false;
        let targetHue = this.baseHue;

        if (closestId && minDist < magnetDistance) {
            targetGlobalX = (myGlobalX + this.foreignCores[closestId].x) / 2;
            targetGlobalY = (myGlobalY + this.foreignCores[closestId].y) / 2;
            isMagnetized = true;

            // Masofaga qarab birlashish kuchini hisoblash (0 dan 1 gacha)
            this.mergeFactor = 1.0 - (minDist / magnetDistance);

            // Ranglarni birlashtirish: Bitta ID ustunlik qiladi (bir xil rang bo'lishi uchun)
            if (this.windowId > closestId) {
                targetHue = this.foreignCores[closestId].hue;
            } else {
                targetHue = this.baseHue;
            }

            // Maksimal birlashganda super energiya rangi (Pushti-Qizil / Kvant effekti)
            if(this.mergeFactor > 0.8) targetHue = 330; // Neon Pink
        } else {
            this.mergeFactor = 0;
        }

        // Birlashish o'tishini silliqlash
        this.smoothedMerge += (this.mergeFactor - this.smoothedMerge) * 0.05;

        // Rangni silliq o'tkazish
        let hueDiff = targetHue - this.currentHue;
        if(hueDiff > 180) hueDiff -= 360; else if(hueDiff < -180) hueDiff += 360;
        this.currentHue += hueDiff * 0.05;
        if(this.currentHue < 0) this.currentHue += 360;

        // 3. 3D joylashuvni hisoblash
        let vFOV = THREE.MathUtils.degToRad(this.camera.fov);
        let visibleHeight = 2 * Math.tan(vFOV / 2) * this.camera.position.z;
        let visibleWidth = visibleHeight * this.camera.aspect;

        let targetWorldX = (targetGlobalX - myGlobalX) * (visibleWidth / this.width);
        let targetWorldY = -(targetGlobalY - myGlobalY) * (visibleHeight / this.height);

        this.masterGroup.position.x += (targetWorldX - this.masterGroup.position.x) * (0.02 + this.smoothedMerge * 0.05);
        this.masterGroup.position.y += (targetWorldY - this.masterGroup.position.y) * (0.02 + this.smoothedMerge * 0.05);

        // 4. SHAKL MORPHING (KUB -> TORUS KNOT)
        // Kub kichrayib yo'qoladi, Halqa kattalashib paydo bo'ladi
        let boxScale = Math.max(0.01, 1.0 - (this.smoothedMerge * 1.5));
        let knotScale = this.smoothedMerge * 1.8;

        this.coreBox.scale.setScalar(boxScale);
        this.coreBox.material.opacity = 1.0 - this.smoothedMerge;

        this.coreKnot.scale.setScalar(knotScale);
        this.coreKnot.material.opacity = this.smoothedMerge;

        // Aylanish tezligi birlashganda ortadi
        let rotSpeed = 0.003 + (this.smoothedMerge * 0.02);
        this.targetRotation.x = this.mouse.y * 3;
        this.targetRotation.y = this.mouse.x * 3;

        this.coreBox.rotation.x += (this.targetRotation.x - this.coreBox.rotation.x) * 0.05;
        this.coreBox.rotation.y += (this.targetRotation.y - this.coreBox.rotation.y) * 0.05;
        this.coreBox.rotation.z += rotSpeed;

        this.coreKnot.rotation.x += rotSpeed * 2;
        this.coreKnot.rotation.y -= rotSpeed * 1.5;
        this.coreKnot.rotation.z += rotSpeed * 3;

        this.cage.rotation.copy(this.coreBox.rotation);
        this.cage.rotation.x *= -1.5;
        this.cage.scale.setScalar(1.0 + this.smoothedMerge * 0.5); // Qafas ham kattalashadi

        // 5. Ranglar va Effektlarni yangilash
        const colorHex = new THREE.Color(`hsl(${this.currentHue}, 100%, 50%)`);
        const dimColorHex = new THREE.Color(`hsl(${this.currentHue}, 100%, 20%)`);

        this.cageMaterial.color = colorHex;
        this.boxMaterial.emissive = dimColorHex;
        this.knotMaterial.emissive = new THREE.Color(`hsl(${this.currentHue}, 100%, ${30 + this.smoothedMerge * 20}%)`);

        // Yorug'lik va Post-processing intensivligi
        this.pointLight1.color = colorHex;
        this.pointLight1.position.set(2, 2, 2).multiplyScalar(1 + this.smoothedMerge);
        this.pointLight2.color = new THREE.Color(`hsl(${(this.currentHue + 180) % 360}, 100%, 50%)`);
        this.pointLight2.position.set(-2, -2, 2).multiplyScalar(1 + this.smoothedMerge);

        this.coreLight.color = colorHex;
        this.coreLight.intensity = this.smoothedMerge * 100; // Markazda yorqin chaqnash

        this.bloomPass.strength = 0.5 + (this.smoothedMerge * 0.8); // Kam glow — kub xira bo'lmasin

        this.updateTexture();
        // updateMatrix() — yo'q: fon mydrime ning WebGL suvi
        this.composer.render();
        this.start();
    }
}

new XolericProCore();
