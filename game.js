import * as THREE from 'three';

/* ====== KONFIGURASI (aman diubah) ====== */
export const CAR_MODEL = '';          // isi mis. 'assets/car.glb' untuk memakai model GLB sendiri
export const NAME = 'WILDAN KHOTIBUL UMAM NASRULLOH';
export const CFG = { ROAD_W: 14, FINISH_Z: -1800, CP_COUNT: 5, CP_START: -300, CP_GAP: 300 };
const { ROAD_W, FINISH_Z, CP_COUNT, CP_START, CP_GAP } = CFG;
const BOARD = ['PHP', 'JAVASCRIPT', 'REACT.JS', 'LARAVEL', 'FULLSTACK'];

/* ====== JALAN: fungsi kurva ====== */
const ramp = z => Math.min(1, Math.max(0, -z / 260));
const cx = z => ramp(z) * (45 * Math.sin(z / 230) + 25 * Math.sin(z / 97));
const hd = z => Math.atan((cx(z + 1) - cx(z - 1)) / 2);       // heading mobil di titik z
const rightV = h => [Math.cos(h), -Math.sin(h)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class Game {
  constructor(canvas, cb = {}) {
    this.canvas = canvas; this.cb = cb;
    this.state = 'menu';            // menu | playing | paused | finish
    this.keys = {}; this.touch = {};
    this.cam = 0; this.camRate = 6; this.introT = 0;
    this.speed = 0; this.h = 0; this.steer = 0; this.nitro = 100;
    this.time = 0; this.slow = 1; this.slowT = 0;
    this.sound = true; this.low = false;
    this.cps = []; this.passed = new Set(); this.wheels = []; this.fronts = [];
    this._tpos = new THREE.Vector3(); this._look = new THREE.Vector3(); this._lk = new THREE.Vector3();
    this._bind();
  }

  /* ---------- INIT (bertahap + progress loading) ---------- */
  async init(onProgress = () => {}) {
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.shadowMap.enabled = true;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a1030, 0.005);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1800);
    this.car = new THREE.Group(); this.scene.add(this.car);

    const steps = [
      () => this._sky(), () => this._lights(), () => this._ground(), () => this._road(),
      () => this._gapura(), () => this._gates(), () => this._scenery(), () => this._carModel(),
      () => this._fx()
    ];
    for (let i = 0; i < steps.length; i++) {
      steps[i](); onProgress((i + 1) / steps.length);
      await new Promise(r => setTimeout(r, 40));
    }
    this.restartCar();
    this.resize(); this.setQuality(this.low);
    this._tryModel();
    this._camSnap();
    requestAnimationFrame(this._loop);
  }

  _sky() {
    this.scene.background = canvasTex(2, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#03040f'); g.addColorStop(.5, '#141046'); g.addColorStop(.82, '#5a2bb5'); g.addColorStop(1, '#2a8fff');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const p = [];
    for (let i = 0; i < 400; i++) { const a = rnd(0, 6.28), e = rnd(.15, 1.4), r = 900; p.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
    this.scene.add(this.stars);
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0x7f9bff, 0x1a1040, 1.1));
    const s = this.sun = new THREE.DirectionalLight(0xb8c4ff, 2.2);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024);
    Object.assign(s.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 140 });
    this.scene.add(s, s.target);
  }

  _ground() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2600, 4800), new THREE.MeshStandardMaterial({ color: 0x0a1226, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -0.02, -1650); m.receiveShadow = true; this.scene.add(m);
  }

  _ribbon(off, w, y, mat) {
    const p = [], ix = []; let n = 0;
    for (let z = 60; z >= FINISH_Z - 120; z -= 4) {
      const x = cx(z), [rx, rz] = rightV(hd(z)), a = off - w / 2, b = off + w / 2;
      p.push(x + rx * a, y, z + rz * a, x + rx * b, y, z + rz * b);
      if (n > 0) { const i = n * 2; ix.push(i - 2, i - 1, i, i - 1, i + 1, i); }
      n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; this.scene.add(m); return m;
  }

  _road() {
    const D = THREE.DoubleSide;
    this._ribbon(0, ROAD_W, .02, new THREE.MeshStandardMaterial({ color: 0x15171f, roughness: .85, side: D }));
    this._ribbon(-(ROAD_W / 2 - .5), .35, .03, new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: D }));
    this._ribbon(ROAD_W / 2 - .5, .35, .03, new THREE.MeshBasicMaterial({ color: 0x8a5cff, side: D }));
    const N = Math.floor((60 - FINISH_Z) / 10), d = new THREE.Object3D();
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.35, .02, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    for (let i = 0; i < N; i++) { const z = 55 - i * 10; d.position.set(cx(z), .05, z); d.rotation.y = hd(z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    this.scene.add(im);
    this._line(0); this._line(FINISH_Z);
  }

  _line(z) {
    const t = canvasTex(256, 64, c => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#111'; c.fillRect(i * 16, j * 16, 16, 16); } });
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 3), new THREE.MeshBasicMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2; g.add(m); g.position.set(cx(z), .06, z); g.rotation.y = hd(z); this.scene.add(g);
  }

  _gate(z, color, text) {
    const g = new THREE.Group(); g.position.set(cx(z), 0, z); g.rotation.y = hd(z);
    const mat = new THREE.MeshBasicMaterial({ color }), hw = ROAD_W / 2 + 1.2;
    [-hw, hw].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(.8, 8, .8), mat); p.position.set(x, 4, 0); g.add(p); });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + .8, .8, .8), mat); beam.position.y = 8; g.add(beam);
    const t = canvasTex(512, 96, (c, w, h) => {
      c.fillStyle = 'rgba(5,8,30,.88)'; c.fillRect(0, 0, w, h); c.strokeStyle = '#00e5ff'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#fff'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2);
    });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), new THREE.MeshBasicMaterial({ map: t })); s.position.set(0, 9.7, .45); g.add(s);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    veil.position.y = 4; g.add(veil);
    this.scene.add(g); return { g, mat, z, x: cx(z), pulse: 0 };
  }

  _gates() {
    for (let i = 0; i < CP_COUNT; i++) this.cps.push(this._gate(CP_START - i * CP_GAP, 0x00e5ff, 'CHECKPOINT ' + (i + 1)));
    this.fin = this._gate(FINISH_Z, 0xffffff, 'FINISH');
  }

  /* ---------- GAPURA ala Hollywood Sign (panel teks canvas = ringan) ---------- */
  _gapura() {
    const z = -70, g = new THREE.Group(); g.position.set(cx(z), 0, z); g.rotation.y = hd(z);
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9d3e6, metalness: .9, roughness: .25 });
    [-36, 36].forEach(x => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(4, 26, 4), steel); p.position.set(x, 13, 0); p.castShadow = true; g.add(p);
      const n = new THREE.Mesh(new THREE.BoxGeometry(.5, 26, .5), new THREE.MeshBasicMaterial({ color: 0x00e5ff })); n.position.set(x, 13, 2.3); g.add(n);
    });
    const tex = canvasTex(2048, 360, (c, w, h) => {
      const bg = c.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#080c2c'); bg.addColorStop(1, '#1a0f4a');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#00e5ff'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
      let fs = 150; c.font = `900 ${fs}px "Arial Black",Arial,sans-serif`;
      while (c.measureText(NAME).width > w - 180 && fs > 40) { fs -= 4; c.font = `900 ${fs}px "Arial Black",Arial,sans-serif`; }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const sg = c.createLinearGradient(0, 60, 0, 220); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#aab6d0');
      c.shadowColor = '#00e5ff'; c.shadowBlur = 30; c.fillStyle = sg; c.fillText(NAME, w / 2, 135);
      c.shadowBlur = 0; c.fillStyle = '#00e5ff'; c.font = 'bold 60px Arial'; c.fillText('WELCOME TO MY DEVELOPER WORLD', w / 2, 270);
    });
    const face = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .9 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(76, 12, 2), [steel, steel, steel, steel, face, steel]);
    panel.position.y = 30; panel.castShadow = true; g.add(panel);
    const neon = new THREE.Mesh(new THREE.BoxGeometry(76, .6, .6), new THREE.MeshBasicMaterial({ color: 0x8a5cff })); neon.position.set(0, 23.6, 1.2); g.add(neon);
    this.scene.add(g);
  }

  /* ---------- LINGKUNGAN ---------- */
  _scenery() {
    const rim = (z, side, off) => { const [rx, rz] = rightV(hd(z)); return [cx(z) + rx * side * off, z + rz * side * off]; };
    const d = new THREE.Object3D(), side = () => Math.random() < .5 ? -1 : 1;
    // perbukitan
    const hm = new THREE.MeshStandardMaterial({ color: 0x151b4a, flatShading: true, roughness: 1 }), hg = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 64; i++) {
      const z = rnd(150, FINISH_Z - 150), [x, zz] = rim(z, side(), rnd(90, 330)), m = new THREE.Mesh(hg, hm);
      const sy = rnd(25, 80); m.scale.set(rnd(40, 90), sy, rnd(40, 90)); m.position.set(x, -sy * .35, zz); this.scene.add(m);
    }
    // pohon (instancing)
    const T = 160, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.3, .4, 2, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }), T);
    const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 5, 7), new THREE.MeshStandardMaterial({ color: 0x0e5a4a, emissive: 0x03241d }), T);
    for (let i = 0; i < T; i++) {
      const z = rnd(40, FINISH_Z), [x, zz] = rim(z, side(), rnd(ROAD_W / 2 + 6, 50)), s = rnd(.8, 1.6);
      d.rotation.set(0, 0, 0); d.scale.setScalar(s); d.position.set(x, s, zz); d.updateMatrix(); trunk.setMatrixAt(i, d.matrix);
      d.position.set(x, 2 + 2.5 * s, zz); d.updateMatrix(); leaf.setMatrixAt(i, d.matrix);
    }
    this.scene.add(trunk, leaf);
    // gedung futuristik
    const win = canvasTex(64, 128, (c, w, h) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) if (Math.random() < .35) { c.fillStyle = Math.random() < .5 ? '#00e5ff' : '#8a5cff'; c.fillRect(x, y, 4, 5); }
    });
    win.wrapS = win.wrapT = THREE.RepeatWrapping; win.repeat.set(2, 5);
    const bm = new THREE.MeshStandardMaterial({ color: 0x0c1230, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: .8, metalness: .6, roughness: .4 });
    for (let i = 0; i < 40; i++) {
      const z = rnd(-100, FINISH_Z), [x, zz] = rim(z, side(), rnd(45, 100)), h = rnd(20, 75);
      const b = new THREE.Mesh(new THREE.BoxGeometry(rnd(9, 18), h, rnd(9, 18)), bm); b.position.set(x, h / 2, zz); b.rotation.y = hd(z); this.scene.add(b);
    }
    // lampu jalan (instancing)
    const L = Math.floor((40 - FINISH_Z) / 40) * 2, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.1, .14, 6, 6), new THREE.MeshStandardMaterial({ color: 0x8892b0 }), L);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.38, 8, 8), new THREE.MeshBasicMaterial({ color: 0xaef0ff }), L);
    let k = 0;
    for (let z = 40; z > FINISH_Z && k < L; z -= 40) for (const sd of [-1, 1]) {
      const [x, zz] = rim(z, sd, ROAD_W / 2 + 2.2); d.scale.setScalar(1); d.rotation.set(0, 0, 0);
      d.position.set(x, 3, zz); d.updateMatrix(); poles.setMatrixAt(k, d.matrix);
      d.position.set(x, 6.2, zz); d.updateMatrix(); bulbs.setMatrixAt(k, d.matrix); k++;
    }
    poles.count = bulbs.count = k; this.scene.add(poles, bulbs);
    // billboard teknologi
    for (let i = 0; i < CP_COUNT; i++) {
      const z = CP_START - i * CP_GAP + 110, sd = i % 2 ? -1 : 1, [x, zz] = rim(z, sd, ROAD_W / 2 + 10);
      const t = canvasTex(512, 256, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#101a66'); g.addColorStop(1, '#5a2bb5');
        c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = '#00e5ff'; c.lineWidth = 6; c.strokeRect(4, 4, w - 8, h - 8);
        c.fillStyle = '#fff'; c.font = 'bold 64px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(BOARD[i], w / 2, h / 2);
      });
      const grp = new THREE.Group(); grp.position.set(x, 0, zz); grp.rotation.y = hd(z) - sd * .4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, 6, 6), new THREE.MeshStandardMaterial({ color: 0x8892b0 })); post.position.y = 3;
      const bd = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); bd.position.y = 8;
      grp.add(post, bd); this.scene.add(grp);
    }
  }

  /* ---------- MOBIL (geometri Three.js) ---------- */
  _carModel() {
    const shell = this.shell = new THREE.Group(); this.car.add(shell);
    const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; shell.add(m); return m; };
    const paint = new THREE.MeshStandardMaterial({ color: 0x1b6bff, metalness: .8, roughness: .25 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0a0c16, metalness: .5, roughness: .5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0a1a33, metalness: 1, roughness: .05, transparent: true, opacity: .85 });
    box(2, .6, 4.4, paint, 0, .6, 0); box(1.55, .5, 1.9, glass, 0, 1.12, .25);
    box(1.9, .14, 1, paint, 0, .93, -1.4);                        // kap mesin
    box(2.1, .22, .3, dark, 0, .38, -2.25); box(2.1, .22, .3, dark, 0, .38, 2.25);   // bumper
    box(2.1, .08, .55, paint, 0, 1.25, 2.1); box(.08, .35, .08, dark, -.7, 1.08, 2.1); box(.08, .35, .08, dark, .7, 1.08, 2.1); // spoiler
    const head = new THREE.MeshBasicMaterial({ color: 0xffffff }), tail = new THREE.MeshBasicMaterial({ color: 0xff2040 });
    [-.7, .7].forEach(x => { box(.4, .15, .08, head, x, .68, -2.22); box(.4, .15, .08, tail, x, .7, 2.22); });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 4.7), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = .12; shell.add(glow);
    const wg = new THREE.CylinderGeometry(.46, .46, .36, 20); wg.rotateZ(Math.PI / 2);
    const wm = new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: .7 }), rim = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    [[-1.05, -1.4, 1], [1.05, -1.4, 1], [-1.05, 1.4, 0], [1.05, 1.4, 0]].forEach(([x, z, front]) => {
      const pv = new THREE.Group(); pv.position.set(x, .46, z);
      const w = new THREE.Mesh(wg, wm); w.castShadow = true; pv.add(w);
      const r = new THREE.Mesh(new THREE.BoxGeometry(.38, .5, .08), rim); w.add(r);   // jari2 neon agar putaran terlihat
      shell.add(pv); this.wheels.push(w); if (front) this.fronts.push(pv);
    });
    this.flames = [-.6, .6].map(x => { const f = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xff8a3d })); f.rotation.x = Math.PI / 2; f.position.set(x, .55, 3); f.visible = false; this.car.add(f); return f; });
  }

  async _tryModel() {
    if (!CAR_MODEL) return;
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(CAR_MODEL);
      gltf.scene.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.shell.visible = false; this.car.add(gltf.scene);   // sesuaikan scale/rotation jika model terlalu besar atau menghadap arah lain
    } catch (e) { console.warn('Model GLB gagal dimuat, memakai mobil bawaan.', e); }
  }

  _fx() {
    const n = 500, p = [];
    for (let i = 0; i < n; i++) p.push(rnd(-70, 70), rnd(1, 30), rnd(-70, 70));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x66f0ff, size: .35, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.scene.add(this.dust);
    const N = 320, cp = new Float32Array(N * 3), cc = new Float32Array(N * 3), col = new THREE.Color();
    for (let i = 0; i < N; i++) { col.setHSL(Math.random(), 1, .6); cc.set([col.r, col.g, col.b], i * 3); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    this.conf = new THREE.Points(cg, new THREE.PointsMaterial({ size: .5, vertexColors: true, fog: false }));
    this.conf.visible = false; this.confV = new Float32Array(N * 3); this.scene.add(this.conf);
  }

  /* ---------- INPUT (listener dipasang sekali) ---------- */
  _bind() {
    const map = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'nitro', ShiftRight: 'nitro', Space: 'brake' };
    addEventListener('keydown', e => {
      if (this.state !== 'playing') return;
      if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); }
      else if (e.code === 'KeyC' && !e.repeat) this.cycleCamera();
      else if (e.code === 'KeyR' && !e.repeat) this.resetToRoad();
    });
    addEventListener('keyup', e => { if (map[e.code]) this.keys[map[e.code]] = false; });
    addEventListener('blur', () => { this.keys = {}; this.touch = {}; });
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') { this.pause(); this.cb.onAutoPause && this.cb.onAutoPause(); } });
  }
  setTouch(k, v) { this.touch[k] = v; }

  resize() {
    if (!this.r) return;
    const w = innerWidth, h = innerHeight;
    this.r.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  setQuality(low) {
    this.low = low;
    if (!this.r) return;
    this.r.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.75));
    this.r.shadowMap.enabled = !low; this.sun.castShadow = !low;
    this.dust.visible = !low; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  /* ---------- AUDIO (Web Audio) ---------- */
  _audio() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.osc = this.ac.createOscillator(); this.gain = this.ac.createGain();
      this.osc.type = 'sawtooth'; this.gain.gain.value = 0; this.osc.connect(this.gain).connect(this.ac.destination); this.osc.start();
    } catch (e) { this.ac = null; }
  }
  _beep(f, d = .3) {
    if (!this.ac || !this.sound) return;
    const o = this.ac.createOscillator(), g = this.ac.createGain(), t = this.ac.currentTime;
    o.frequency.value = f; g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(this.ac.destination); o.start(); o.stop(t + d);
  }
  _engine() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    this.gain.gain.setTargetAtTime(this.sound && this.state === 'playing' ? .02 : 0, t, .1);
    this.osc.frequency.setTargetAtTime(55 + Math.abs(this.speed) * 4, t, .1);
  }
  setSound(on) { this.sound = on; }

  /* ---------- KONTROL STATE ---------- */
  restartCar() {
    this.car.position.set(cx(30), 0, 30); this.h = hd(30); this.car.rotation.y = this.h;
    this.speed = 0; this.steer = 0; this.nitro = 100; this.slow = 1; this.slowT = 0;
    this.passed.clear(); this.conf.visible = false;
    this.cps.forEach(c => { c.mat.color.set(0x00e5ff); c.g.scale.set(1, 1, 1); c.pulse = 0; });
    this.flames.forEach(f => f.visible = false);
  }
  start() { this._audio(); this.restartCar(); this.state = 'playing'; this.camRate = 2.2; this.introT = 2.6; this.keys = {}; this.touch = {}; }
  restart() { this.restartCar(); this.state = 'playing'; this.camRate = 2.2; this.introT = 2.6; this.keys = {}; this.touch = {}; }
  toMenu() { this.restartCar(); this.state = 'menu'; }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.keys = {}; this.touch = {}; } }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  cycleCamera() { this.cam = (this.cam + 1) % 3; }
  resetToRoad() { const z = this.car.position.z; this.car.position.set(cx(z), 0, z); this.h = hd(z); this.speed = 0; }

  /* ---------- LOOP ---------- */
  _loop = t => {
    requestAnimationFrame(this._loop);
    const now = t / 1000; const dt = Math.min(.05, now - (this._last || now)); this._last = now;
    if (this.state === 'paused') return;
    this.time += dt;
    if (this.introT > 0 && (this.introT -= dt) <= 0) this.camRate = 6;
    if (this.slowT > 0 && (this.slowT -= dt) <= 0) this.slow = 1;
    const d = dt * this.slow;
    if (this.state !== 'menu') this._drive(d);
    this._anim(d); this._cam(dt); this._engine();
    this.r.render(this.scene, this.camera);
  };

  _drive(d) {
    const k = this.keys, T = this.touch, car = this.car, play = this.state === 'playing';
    const gas = play && (k.up || T.gas), brk = play && (k.down || T.brake), hand = play && k.brake;
    const st = play ? ((k.left || T.left ? 1 : 0) - (k.right || T.right ? 1 : 0)) : 0;
    const off = Math.abs(car.position.x - cx(car.position.z)) > ROAD_W / 2 + .5;
    const nit = play && (k.nitro || T.nitro) && gas && this.nitro > 0;
    let max = off ? 14 : 40; if (nit) max = 62;
    if (gas) this.speed += (nit ? 42 : 20) * d * (1 - Math.max(0, this.speed) / (max + 4));
    else if (!brk) this.speed *= Math.exp(-.45 * d);
    if (brk) this.speed -= (this.speed > 0 ? 42 : 12) * d;
    if (hand) this.speed *= Math.exp(-2.2 * d);
    if (this.state === 'finish') this.speed *= Math.exp(-1.1 * d);
    if (this.speed > max) this.speed -= (this.speed - max) * Math.min(1, 3 * d);
    this.speed = clamp(this.speed, -12, 66);
    if (off) this.speed *= Math.exp(-.5 * d);
    this.nitro = clamp(this.nitro + (nit ? -28 : 7) * d, 0, 100);
    this.nitroOn = !!nit;
    this.steer += (st * .5 - this.steer) * Math.min(1, 7 * d);
    this.h += this.steer * this.speed * (hand ? .17 : .1) * d * (1 / (1 + Math.abs(this.speed) / 80));
    car.position.x += -Math.sin(this.h) * this.speed * d;
    car.position.z += -Math.cos(this.h) * this.speed * d;
    if (car.position.z > 80) { car.position.z = 80; this.speed *= .5; }
    car.rotation.y = this.h;
    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, -this.steer * Math.min(1, this.speed / 40) * .06, .1);
    if (play) {
      this.cps.forEach((c, i) => {
        if (!this.passed.has(i) && Math.hypot(car.position.x - c.x, car.position.z - c.z) < 10) {
          this.passed.add(i); c.mat.color.set(0x00ff9d); c.pulse = 1; this._beep(880 + i * 60); this.cb.onCheckpoint && this.cb.onCheckpoint(i);
        }
      });
      if (car.position.z < FINISH_Z) this._finish();
    }
    this.cb.onHud && this.cb.onHud(Math.round(Math.abs(this.speed) * 3.6), Math.round(this.nitro), clamp(-car.position.z / -FINISH_Z, 0, 1));
  }

  _finish() {
    this.state = 'finish'; this.slow = .35; this.slowT = 1.6; this.keys = {}; this.touch = {};
    this.conf.visible = true; const p = this.conf.geometry.attributes.position, c = this.car.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i, c.x + rnd(-6, 6), rnd(1, 4), c.z + rnd(-6, 6));
      this.confV.set([rnd(-5, 5), rnd(8, 18), rnd(-5, 5)], i * 3);
    }
    this._beep(523, .5); setTimeout(() => this._beep(784, .6), 250);
    setTimeout(() => { this.cb.onFinish && this.cb.onFinish(); }, 1200);
  }

  _anim(d) {
    const sp = this.speed;
    this.wheels.forEach(w => w.rotation.x -= sp * d / .46);
    this.fronts.forEach(f => f.rotation.y = this.steer);
    this.flames.forEach(f => { f.visible = !!this.nitroOn; f.scale.z = 1 + Math.random() * .5; });
    this.cps.forEach(c => { if (c.pulse > 0) { c.pulse = Math.max(0, c.pulse - d * 1.5); c.g.scale.y = 1 + c.pulse * .2; } });
    const p = this.car.position;
    this.sun.position.set(p.x + 30, 55, p.z + 20); this.sun.target.position.copy(p);
    this.stars.position.set(p.x, 0, p.z);
    if (this.dust.visible) { this.dust.position.set(p.x, 0, p.z); this.dust.rotation.y += d * .05; }
    if (this.state === 'menu') this.car.position.y = Math.sin(this.time * 2) * .03;   // idle
    if (this.conf.visible) {
      const a = this.conf.geometry.attributes.position, v = this.confV;
      for (let i = 0; i < a.count; i++) {
        v[i * 3 + 1] -= 9 * dtSafe(d);
        a.setXYZ(i, a.getX(i) + v[i * 3] * d, Math.max(0, a.getY(i) + v[i * 3 + 1] * d), a.getZ(i) + v[i * 3 + 2] * d);
      }
      a.needsUpdate = true;
    }
  }

  /* ---------- KAMERA ---------- */
  _camSnap() { this._cam(1, true); }
  _cam(dt, snap) {
    const c = this.car.position, h = this.h;
    if (this.state === 'menu' || this.state === 'finish') {
      const a = this.time * (this.state === 'menu' ? .35 : .5) + (this.state === 'finish' ? 1.2 : 0), R = this.state === 'menu' ? 9 : 11;
      this._tpos.set(c.x + Math.sin(a) * R, this.state === 'menu' ? 3.2 : 3.8, c.z + Math.cos(a) * R); this._look.set(c.x, 1, c.z);
    } else {
      const m = [[0, 4.2, 9.5], [0, 9, 20], [0, 1.35, -.4]][this.cam];
      this._tpos.set(c.x + m[0] * Math.cos(h) + m[2] * Math.sin(h), c.y + m[1], c.z - m[0] * Math.sin(h) + m[2] * Math.cos(h));
      const f = this.cam === 2 ? 20 : 7; this._look.set(c.x - Math.sin(h) * f, 1.2, c.z - Math.cos(h) * f);
    }
    const k = snap ? 1 : 1 - Math.exp(-this.camRate * dt);
    this.camera.position.lerp(this._tpos, this.state === 'playing' && this.cam === 2 ? 1 : k);
    this._lk.lerp(this._look, snap ? 1 : Math.min(1, k * 1.6)); this.camera.lookAt(this._lk);
    const fov = 62 + Math.abs(this.speed) * .3 + (this.nitroOn ? 10 : 0);
    if (Math.abs(fov - this.camera.fov) > .05) { this.camera.fov += (fov - this.camera.fov) * .1; this.camera.updateProjectionMatrix(); }
  }
}
const dtSafe = d => d;
