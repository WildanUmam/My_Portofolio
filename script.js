import { Game } from './game.js';

/* =====================================================
   DATA YANG MUDAH DIEDIT
   ===================================================== */
const PROFILE = {
  name: 'Wildan Khotibul Umam Nasrulloh',
  role: 'Fullstack Web Developer',
  about:'Saya Wildan, lulusan S1 Teknik Informatika yang memiliki ketertarikan besar pada dunia teknologi, programming, dan pengembangan sistem digital. Bagi saya, coding bukan sekadar menulis baris kode, tetapi tentang bagaimana mengubah ide menjadi solusi nyata. I believe that every great innovation starts with a simple idea, and every line of code is a step toward making it happen. Saya senang mengeksplorasi teknologi baru, membangun aplikasi, dan merancang sistem yang efisien. Dengan kemampuan problem solving, logical thinking, dan semangat untuk terus belajar, saya percaya bahwa setiap tantangan adalah kesempatan untuk berkembang. I believe that great things take time, and every line of code is a step toward something bigger. Saya percaya bahwa kesuksesan bukan hanya tentang seberapa jauh kita melangkah, tetapi juga tentang kemauan untuk terus belajar, berkembang, dan tidak menyerah dalam menghadapi tantangan. "Never Stop Learning, Never Stop Growing." Saya terus berusaha menciptakan solusi digital yang inovatif, bermanfaat, dan mampu memberikan dampak positif bagi banyak orang.',
  email: 'wildanumam40@gmail.com',
  WhatsApp: 'https://wa.me/089531870046',
  linkedin: 'https://www.linkedin.com/in/wildan-umam-8723b1284?'
};

const SKILLS = [
  { title: 'Frontend Developer', items: ['HTML', 'CSS', 'JavaScript', 'React'] },
  { title: 'Backend Developer', items: ['Node.js', 'Express.js', 'REST API', 'Authentication', 'Git'] },
  { title: 'Database Management', items: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQL'] },
  { title: 'Fullstack Developer', items: ['Frontend', 'Backend', 'State Management', 'API Integration', 'Testing & Debugging'] },
  { title: 'Deployment & DevOps', items: ['Git & GitHub', 'Varcel', 'Docker', 'Cloud Hosting', 'CI/CD'] }
];
// Placeholder: ganti dengan proyek asli. Kosongkan "img" untuk memakai kotak gradien.
const PROJECTS = [
  { title: 'DIGILIB – Sistem Informasi Perpustakaan Digital', desc: 'DIGILIB merupakan sistem informasi berbasis web yang menyediakan layanan perpustakaan digital untuk memudahkan pengguna dalam mencari, mengakses, dan membaca koleksi buku secara online. Sistem ini dilengkapi dengan fitur pencarian buku, katalog digital, informasi detail buku, serta pengelolaan data koleksi oleh admin. Dengan adanya DIGILIB, proses pencarian referensi menjadi lebih praktis, efisien, dan dapat mendukung peningkatan minat baca serta kegiatan pembelajaran.', tech: ['Laravel', 'MySQL'], img: '', demo: '#', code: '#' },
  { title: 'RESTORA – Sistem Informasi Manajemen Restoran', desc: 'RESTORA merupakan sistem informasi berbasis web yang dirancang untuk membantu pengelolaan operasional restoran secara lebih efektif dan terorganisasi. Sistem ini menyediakan fitur pengelolaan menu makanan dan minuman, pencatatan pesanan pelanggan, pengelolaan data transaksi, serta pembuatan laporan penjualan. Dengan sistem ini, proses pelayanan pelanggan dan pengelolaan restoran dapat dilakukan dengan lebih cepat, akurat, dan efisien sehingga membantu meningkatkan kualitas pelayanan serta mempermudah pemilik restoran dalam memantau kegiatan usaha.', tech: ['JavaScript', 'REST API'], img: '', demo: '#', code: '#' },
  { title: 'SIPMAS – Sistem Informasi Pengaduan Masyarakat', desc: 'SIPMAS merupakan sistem informasi berbasis web yang dirancang untuk memudahkan masyarakat dalam menyampaikan pengaduan, keluhan, maupun laporan terkait permasalahan di lingkungan sekitar. Melalui sistem ini, masyarakat dapat mengirimkan laporan secara online, memantau status pengaduan, serta memperoleh informasi mengenai tindak lanjut laporan. Sistem ini diharapkan dapat meningkatkan transparansi, mempercepat penanganan pengaduan, dan mempermudah komunikasi antara masyarakat dengan pihak terkait.', tech: ['React.js', 'PostgreSQL'], img: '', demo: '#', code: '#' }
];

const EXPERIENCE = [
  { period: '2023', role: 'Fullstack Web Developer Intern — Program Kampus Merdeka', org: '', desc: 'Mengikuti program Kampus Merdeka dengan fokus pembelajaran dan praktik pengembangan aplikasi web secara fullstack, mulai dari perancangan antarmuka (frontend), pengembangan logika sistem (backend), hingga pengelolaan basis data (database). Selama program, saya mengembangkan berbagai proyek berbasis teknologi informasi, di antaranya Website PPDB Online, Aplikasi Kasir, Sistem Informasi Pengaduan Masyarakat, Perpustakaan Digital, dan Sistem Informasi Restoran. Pengalaman ini membantu saya mengasah kemampuan pemrograman, perancangan sistem, pengelolaan data, pemecahan masalah, serta membangun aplikasi yang fungsional, efektif, dan mudah digunakan.' }
];

/* =====================================================
   UTIL & STATE
   ===================================================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const show = (el, v = true) => { el.hidden = !v; };
const STORE = 'developer-road.passed';
const loadPassed = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const savePassed = a => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch { /* abaikan */ } };
let passed = loadPassed();
let soundOn = true, lowQ = false, game = null, panelTimer = 0, lastHud = '';
const setState = s => { document.body.dataset.state = s; };

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/* =====================================================
   PORTOFOLIO (dirender dari data)
   ===================================================== */
function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function renderSkillCards(el, withState) {
  el.innerHTML = SKILLS.map((s, i) =>
    `<div class="item${withState && passed.includes(i) ? ' done' : ''}"><h4>${i + 1}. ${esc(s.title)}${withState && passed.includes(i) ? ' ✔' : ''}</h4><ul>${s.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('');
}

function renderPortfolio() {
  $('#pf-name').textContent = PROFILE.name.toUpperCase();
  $('#pf-role').textContent = PROFILE.role.toUpperCase();
  $('#pf-about').textContent = PROFILE.about;
  renderSkillCards($('#pf-skills'), false);
  $('#pf-projects').innerHTML = PROJECTS.map(p =>
    `<article class="item project">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy">` : '<div class="ph">Gambar proyek</div>'}
     <h4>${esc(p.title)}</h4><p>${esc(p.desc)}</p><div class="tags">${p.tech.map(t => `<span>${esc(t)}</span>`).join('')}</div>
     <a href="${esc(p.demo)}" target="_blank" rel="noopener">Demo</a><a href="${esc(p.code)}" target="_blank" rel="noopener">Source code</a></article>`).join('');
  $('#pf-exp').innerHTML = EXPERIENCE.map(e => `<div class="exp"><small>${esc(e.period)}</small><h4>${esc(e.role)}  ${esc(e.org)}</h4><p>${esc(e.desc)}</p></div>`).join('');
  $('#pf-contact').innerHTML = `<a href="mailto:${esc(PROFILE.email)}">${esc(PROFILE.email)}</a><a href="${esc(PROFILE.WhatsApp)}" target="_blank" rel="noopener">WhatsApp</a><a href="${esc(PROFILE.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`;
  $('#fin-skills').innerHTML = SKILLS.map(s => `<li>${esc(s.title)}</li>`).join('');
}

function openPortfolio(sec = 'home') {
  show($('#portfolio'));
  const t = $('#sec-' + sec); if (t) t.scrollIntoView({ behavior: 'auto', block: 'start' });
}
const closePortfolio = () => show($('#portfolio'), false);

/* =====================================================
   PANEL SKILL HOLOGRAM (item muncul satu per satu)
   ===================================================== */
function closePanel() {
  clearTimeout(panelTimer);
  const p = $('#skill-panel'); if (p.hidden) return;
  p.classList.add('out'); setTimeout(() => { show(p, false); p.classList.remove('out'); }, 330);
}
function showPanel(i) {
  clearTimeout(panelTimer);
  const p = $('#skill-panel'), s = SKILLS[i];
  p.classList.remove('out');
  $('#panel-num').textContent = `CHECKPOINT ${i + 1} / ${SKILLS.length}`;
  $('#panel-title').textContent = s.title;
  $('#panel-list').innerHTML = s.items.map((t, n) => `<li style="animation-delay:${.35 + n * .3}s">${esc(t)}</li>`).join('');
  show(p);
  panelTimer = setTimeout(closePanel, 3000 + s.items.length * 300 + 2500);
}

/* =====================================================
   GAME CALLBACKS
   ===================================================== */
function onCheckpoint(i) {
  if (!passed.includes(i)) { passed.push(i); savePassed(passed); }
  $('#hud-cp-num').textContent = `${game.passed.size}/${SKILLS.length}`;
  $('#hud-cp-name').textContent = SKILLS[i].title;
  showPanel(i);
}
function onHud(speed, nitro, prog) {
  const key = speed + '|' + nitro + '|' + Math.round(prog * 200);
  if (key === lastHud) return; lastHud = key;
  $('#hud-speed').textContent = speed;
  $('#hud-nitro').style.width = nitro + '%';
  $('#hud-progress').style.width = (prog * 100).toFixed(1) + '%';
}
function onFinish() {
  closePanel(); show($('#hud'), false);
  // render ulang agar animasi CSS finish diputar ulang
  const f = $('#finish'); f.hidden = true; void f.offsetWidth; f.hidden = false;
  setState('finish');
}

/* =====================================================
   MENU, PAUSE, MODAL
   ===================================================== */
function updateSoundLabels() {
  $('#btn-sound').textContent = 'SOUND: ' + (soundOn ? 'ON' : 'OFF');
  $('#set-sound').textContent = 'Suara: ' + (soundOn ? 'ON' : 'OFF');
  $('#set-quality').textContent = 'Kualitas: ' + (lowQ ? 'RENDAH' : 'TINGGI');
}
function toggleSound() { soundOn = !soundOn; game && game.setSound(soundOn); updateSoundLabels(); }

function resetHud() {
  lastHud = '';
  $('#hud-cp-num').textContent = `0/${SKILLS.length}`; $('#hud-cp-name').textContent = 'Start Line';
  $('#hud-progress').style.width = '0%';
  const h = $('#hud-hint'); h.classList.remove('off'); clearTimeout(resetHud.t); resetHud.t = setTimeout(() => h.classList.add('off'), 9000);
}
function beginPlay(fn) {
  passed = []; savePassed(passed);
  closePanel(); show($('#menu'), false); show($('#finish'), false); show($('#pause'), false); closePortfolio();
  show($('#hud')); resetHud(); fn(); setState('playing');
}
function pauseGame() { if (game.state !== 'playing') return; game.pause(); show($('#pause')); setState('paused'); }
function resumeGame() { show($('#pause'), false); game.resume(); setState('playing'); }
function openModal(id) { show($('#' + id)); }
function anyModalOpen() { return $$('.modal').some(m => !m.hidden); }

function bindUI() {
  $('#btn-start').addEventListener('click', () => beginPlay(() => game.start()));
  $('#btn-explore').addEventListener('click', () => openPortfolio('home'));
  $('#btn-how').addEventListener('click', () => openModal('how'));
  $('#btn-sound').addEventListener('click', toggleSound);
  $('#set-sound').addEventListener('click', toggleSound);
  $('#set-quality').addEventListener('click', () => { lowQ = !lowQ; game && game.setQuality(lowQ); updateSoundLabels(); });
  $$('.close-modal').forEach(b => b.addEventListener('click', () => show(b.closest('.modal'), false)));

  $('#btn-pause').addEventListener('click', pauseGame);
  $('#btn-settings').addEventListener('click', () => { pauseGame(); openModal('settings'); });
  $('#btn-cam').addEventListener('click', () => game.cycleCamera());
  $('#panel-close').addEventListener('click', closePanel);

  $('#p-resume').addEventListener('click', resumeGame);
  $('#p-restart').addEventListener('click', () => beginPlay(() => game.restart()));
  $('#p-skills').addEventListener('click', () => { renderSkillCards($('#overview-grid'), true); openModal('overview'); });
  $('#p-sound').addEventListener('click', () => openModal('settings'));
  $('#p-menu').addEventListener('click', () => {
    closePanel(); show($('#pause'), false); show($('#hud'), false); show($('#menu')); game.toMenu(); setState('menu');
  });

  $('#btn-again').addEventListener('click', () => beginPlay(() => game.restart()));
  $$('#finish [data-go]').forEach(b => b.addEventListener('click', () => openPortfolio(b.dataset.go)));

  $('#pf-close').addEventListener('click', closePortfolio);
  $$('.pf-nav nav button').forEach(b => b.addEventListener('click', () => { const t = $('#sec-' + b.dataset.sec); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));

  // tombol sentuh: pointer events (dipasang sekali)
  $$('#touch button').forEach(b => {
    const k = b.dataset.ctl;
    const on = e => { e.preventDefault(); b.classList.add('on'); game && game.setTouch(k, true); };
    const off = () => { b.classList.remove('on'); game && game.setTouch(k, false); };
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, off));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });

  // Esc: tutup modal/portofolio dulu, kalau tidak ada baru pause/resume
  addEventListener('keydown', e => {
    if (e.code !== 'Escape') return;
    const open = $$('.modal').find(m => !m.hidden);
    if (open) { show(open, false); return; }
    if (!$('#portfolio').hidden) { closePortfolio(); return; }
    if (!game) return;
    if (game.state === 'playing') pauseGame(); else if (game.state === 'paused') resumeGame();
  });
}

/* =====================================================
   BOOT
   ===================================================== */
async function boot() {
  renderPortfolio(); bindUI(); updateSoundLabels();
  const done = () => { show($('#loading'), false); show($('#menu')); setState('menu'); };
  if (!hasWebGL()) { show($('#nowebgl')); $('#btn-start').disabled = true; done(); return; }
  try {
    game = new Game($('#game-canvas'), { onCheckpoint, onHud, onFinish, onAutoPause: () => { show($('#pause')); setState('paused'); } });
    await game.init(p => {
      const pct = Math.round(p * 100);
      $('#load-bar').style.width = pct + '%'; $('#load-text').textContent = `Loading...... ${pct}%`;
    });
    done();
  } catch (err) {
    console.error(err); show($('#nowebgl')); $('#btn-start').disabled = true; done();
  }
}
boot();
