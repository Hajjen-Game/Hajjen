/* CHROMA CLASH 1.0 — independent 2D arena prototype.
 * Fixed-step deterministic simulation; browser adapter below core can be tested in Node. */
(function (root) {
  'use strict';
  const WIDTH = 960, HEIGHT = 540, CX = WIDTH / 2, CY = HEIGHT / 2;
  const HALVES = Object.freeze([198, 166, 136, 108, 84, 62, 44]);
  const COLLAPSES = Object.freeze([14, 28, 41, 53, 64, 73]);
  const WARNING_SECONDS = 3.2;
  const CUBE_RADIUS = 15;
  const SPEED_LIMIT = 193;
  const ACCELERATION = 970;
  const DRAG_MOVING = 1.75;
  const DRAG_IDLE = 5.4;
  const COLORS = ['#60ecff', '#ff71ac', '#ffe26a', '#9f8aff'];
  const NAMES = ['YOU', 'NOVA', 'VOLT', 'HEX'];
  const ZONE_NAMES = ['FLOW', 'SURGE', 'PULSE', 'OVERDRIVE', 'FRENZY', 'CRITICAL', 'FINAL'];
  const PALETTES = [
    ['#54dfff', '#102947'], ['#e5c366', '#392b32'], ['#bb83ff', '#302449'],
    ['#ff74b5', '#3b213d'], ['#85efbc', '#1b3c40'], ['#ff9a69', '#442e34'],
    ['#ffffff', '#303854']
  ];
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  const length = (x, y) => Math.hypot(x, y);
  function normalized(x, y) {
    const l = length(x, y);
    return l > 0.00001 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  function rng(seed) {
    let state = (seed >>> 0) || 0x4f13ab9;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  // Signed distance to a true rounded square. Positive = outside (not an AABB shortcut).
  function roundedSquareSDF(x, y, half, radius) {
    const r = Math.min(radius, half * 0.45);
    const qx = Math.abs(x - CX) - (half - r);
    const qy = Math.abs(y - CY) - (half - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }
  function supported(x, y, half) {
    // Three pixels of edge grace prevents a visually surprising early fall.
    return roundedSquareSDF(x, y, half, Math.max(12, half * 0.16)) <= 3;
  }
  function createMatch(seed) {
    const random = rng(seed == null ? 20261111 : seed);
    const locations = [[-86, -79], [86, -79], [-86, 79], [86, 79]];
    const cubes = locations.map(function (p, id) {
      return {
        id: id, name: NAMES[id], color: COLORS[id], x: CX + p[0], y: CY + p[1],
        vx: 0, vy: 0, alive: true, fall: 0, knocks: 0, squash: 0, spark: 0,
        aiX: 0, aiY: 0, aiNext: 0, personality: 0.82 + random() * 0.28,
        aggression: 0.76 + random() * 0.3, offset: (random() - 0.5) * 0.24
      };
    });
    return {
      seed: seed, random: random, cubes: cubes, half: HALVES[0], stage: 0,
      elapsed: 0, warning: false, warningTime: 0, falling: [], impacts: [],
      flash: 0, state: 'running', endingTime: 0, outcome: '', winner: null,
      lastElimination: null, event: null, eventId: 0
    };
  }
  function chooseAI(match, cube) {
    if (!cube.alive) return { x: 0, y: 0 };
    if (match.elapsed < cube.aiNext) return { x: cube.aiX, y: cube.aiY };
    cube.aiNext = match.elapsed + 0.13 + match.random() * 0.16;
    const opponents = match.cubes.filter(c => c.alive && c.id !== cube.id);
    if (!opponents.length) return { x: 0, y: 0 };
    opponents.sort((a, b) =>
      length(a.x - cube.x, a.y - cube.y) - length(b.x - cube.x, b.y - cube.y));
    const target = opponents[0];
    const danger = roundedSquareSDF(cube.x, cube.y, match.half, Math.max(12, match.half * 0.16));
    const predictedDanger = roundedSquareSDF(
      cube.x + cube.vx * .35, cube.y + cube.vy * .35, match.half, Math.max(12, match.half * .16));
    let dx, dy;
    if (predictedDanger > -31 || danger > -35) {
      // A bot must genuinely evade its own momentum; no teleport, speed bonus, or edge immunity.
      dx = CX - cube.x - cube.vx * .30;
      dy = CY - cube.y - cube.vy * .30;
    } else {
      const lead = cube.aggression * .16;
      dx = target.x + target.vx * lead - cube.x;
      dy = target.y + target.vy * lead - cube.y;
      // Imperfect aiming gives each bot a recognizable variation and prevents lockstep motion.
      const turn = cube.offset;
      const tx = dx * Math.cos(turn) - dy * Math.sin(turn);
      dy = dx * Math.sin(turn) + dy * Math.cos(turn);
      dx = tx;
    }
    const move = normalized(dx, dy);
    cube.aiX = move.x * cube.personality;
    cube.aiY = move.y * cube.personality;
    return { x: cube.aiX, y: cube.aiY };
  }
  function collide(a, b, match) {
    if (!a.alive || !b.alive) return false;
    let dx = b.x - a.x, dy = b.y - a.y;
    let dist = length(dx, dy);
    const minDist = CUBE_RADIUS * 2;
    if (dist >= minDist) return false;
    if (dist < .001) { dx = (b.id - a.id) > 0 ? 1 : -1; dy = 0; dist = 1; }
    const nx = dx / dist, ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= nx * overlap * .5;
    a.y -= ny * overlap * .5;
    b.x += nx * overlap * .5;
    b.y += ny * overlap * .5;
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relative < 0) {
      const impulse = -relative * .75; // equal mass, restitution .50
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
      const energy = Math.min(1, impulse / 115);
      if (energy > .12) {
        a.squash = Math.max(a.squash, energy);
        b.squash = Math.max(b.squash, energy);
        const now = match && match.elapsed || 0;
        if (match && (match.lastImpactTime == null || now - match.lastImpactTime > .075)) {
          match.impacts.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, life: .26, power: energy });
          match.lastImpactTime = now;
        }
      }
    }
    return true;
  }
  function beginCollapse(match) {
    const oldHalf = match.half;
    match.stage += 1;
    match.half = HALVES[match.stage];
    match.warning = false;
    match.warningTime = 0;
    match.flash = .85;
    match.falling.push({ oldHalf: oldHalf, newHalf: match.half, age: 0 });
    match.event = 'EDGE BREAK';
    match.eventId++;
  }
  function knockOut(match, cube) {
    if (!cube.alive) return;
    cube.alive = false;
    cube.fall = 0;
    match.lastElimination = cube.id;
    // Credit nearest surviving opponent when it was an actual recent contact.
    let nearest = null, best = Infinity;
    for (const other of match.cubes) {
      if (!other.alive || other.id === cube.id) continue;
      const d = length(other.x - cube.x, other.y - cube.y);
      if (d < best) { best = d; nearest = other; }
    }
    if (nearest && best < 63) nearest.knocks++;
    match.event = cube.id === 0 ? 'YOU FELL' : cube.name + ' OUT';
    match.eventId++;
  }
  function updateMatch(match, rawInput, dt) {
    if (match.state !== 'running' && match.state !== 'ending') return match;
    const step = clamp(dt || 0, 0, 1 / 30);
    if (!step) return match;
    for (const cube of match.cubes) {
      cube.squash = Math.max(0, cube.squash - step * 3.2);
      cube.spark = Math.max(0, cube.spark - step * 4);
      if (!cube.alive) cube.fall = Math.min(1, cube.fall + step * 2.5);
    }
    for (const piece of match.falling) piece.age += step;
    match.falling = match.falling.filter(p => p.age < 1.35);
    for (const spark of match.impacts) spark.life -= step;
    match.impacts = match.impacts.filter(s => s.life > 0);
    match.flash = Math.max(0, match.flash - step * 1.5);
    if (match.state === 'ending') {
      match.endingTime -= step;
      if (match.endingTime <= 0) match.state = 'finished';
      return match;
    }
    match.elapsed += step;
    const nextCollapse = COLLAPSES[match.stage];
    match.warningTime = nextCollapse == null ? 0 : Math.max(0, nextCollapse - match.elapsed);
    match.warning = nextCollapse != null && match.warningTime <= WARNING_SECONDS;
    if (nextCollapse != null && match.elapsed >= nextCollapse) beginCollapse(match);
    if (match.stage === COLLAPSES.length && match.elapsed > 81) {
      // Sudden-death floor consumes the final core; no fabricated timeout winner.
      match.half = Math.max(10, match.half - 9 * step);
    }
    let user = rawInput || { x: 0, y: 0 };
    const l = length(user.x || 0, user.y || 0);
    if (l > 1) user = { x: user.x / l, y: user.y / l };
    for (const cube of match.cubes) {
      if (!cube.alive) continue;
      const intent = cube.id === 0 ? user : chooseAI(match, cube);
      let mx = Number.isFinite(intent.x) ? intent.x : 0;
      let my = Number.isFinite(intent.y) ? intent.y : 0;
      const mag = length(mx, my);
      if (mag > 1) { mx /= mag; my /= mag; }
      const drag = mag < .04 ? DRAG_IDLE : DRAG_MOVING;
      cube.vx += (mx * ACCELERATION - cube.vx * drag) * step;
      cube.vy += (my * ACCELERATION - cube.vy * drag) * step;
      const speed = length(cube.vx, cube.vy);
      if (speed > SPEED_LIMIT) { cube.vx *= SPEED_LIMIT / speed; cube.vy *= SPEED_LIMIT / speed; }
      cube.x += cube.vx * step;
      cube.y += cube.vy * step;
    }
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < match.cubes.length; i++) {
        for (let j = i + 1; j < match.cubes.length; j++) {
          collide(match.cubes[i], match.cubes[j], match);
        }
      }
    }
    for (const cube of match.cubes) {
      if (cube.alive && !supported(cube.x, cube.y, match.half)) knockOut(match, cube);
    }
    const survivors = match.cubes.filter(c => c.alive);
    if (!match.cubes[0].alive || survivors.length < 2) {
      match.winner = survivors.length === 1 ? survivors[0].id : null;
      match.outcome = match.cubes[0].alive && survivors.length === 1 ? 'victory' : 'eliminated';
      match.state = 'ending';
      match.endingTime = .75;
    }
    return match;
  }
  const core = { WIDTH, HEIGHT, CX, CY, HALVES, COLLAPSES, COLORS, NAMES,
    ZONE_NAMES, PALETTES, CUBE_RADIUS, SPEED_LIMIT, WARNING_SECONDS,
    roundedSquareSDF, supported, createMatch, chooseAI, collide, updateMatch, beginCollapse, knockOut };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.ChromaClashCore = core;
  if (typeof document === 'undefined' || !document.getElementById('clash-canvas')) return;

  const $ = id => document.getElementById(id);
  const canvas = $('clash-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { $('clash-menu').innerHTML = '<h2>Canvas 2D is required.</h2>'; return; }
  const joystick = $('clash-joystick'), stick = $('clash-stick');
  const keys = new Set();
  let match = null, preview = createMatch(1337), mode = 'menu';
  let pointer = null, joyX = 0, joyY = 0;
  let viewWidth = 1, viewHeight = 1, scale = 1, ox = 0, oy = 0, previous = 0, accumulator = 0;
  let lastEventId = 0, announceTimer = 0, best = { wins: 0, eliminations: 0 };
  const storageKey = 'chroma-rush-clash-1.0-best';
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    best.wins = Math.max(0, Math.floor(stored.wins || 0));
    best.eliminations = Math.max(0, Math.floor(stored.eliminations || 0));
  } catch (_) { /* storage is optional in private mode */ }
  function resize() {
    viewWidth = window.innerWidth; viewHeight = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(viewWidth * dpr));
    canvas.height = Math.max(1, Math.floor(viewHeight * dpr));
    scale = Math.min(viewWidth / WIDTH, viewHeight / HEIGHT);
    ox = (viewWidth - WIDTH * scale) / 2;
    oy = (viewHeight - HEIGHT * scale) / 2;
    if (viewHeight > viewWidth && mode === 'running') pauseGame();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();
  function setScreen(which) {
    $('clash-menu').classList.toggle('hidden', which !== 'menu');
    $('clash-pause-menu').classList.toggle('hidden', which !== 'paused');
    $('clash-finish').classList.toggle('hidden', which !== 'result');
    $('clash-hud').classList.toggle('hidden', which === 'menu');
    joystick.classList.toggle('hidden', which !== 'running');
    $('clash-input-help').classList.toggle('hidden', which !== 'running');
  }
  function readInput() {
    if (pointer != null) return { x: joyX, y: joyY };
    const x = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) -
      (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
    const y = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) -
      (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
    return normalized(x, y);
  }
  function moveStick(event) {
    const rect = joystick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * .38;
    const distance = length(dx, dy);
    const amount = Math.min(max, distance);
    joyX = distance > 0 ? dx / distance * amount / max : 0;
    joyY = distance > 0 ? dy / distance * amount / max : 0;
    if (length(joyX, joyY) < .12) { joyX = 0; joyY = 0; }
    stick.style.transform = 'translate(calc(-50% + ' + (joyX * max).toFixed(1) +
      'px),calc(-50% + ' + (joyY * max).toFixed(1) + 'px))';
  }
  function resetStick() {
    pointer = null; joyX = 0; joyY = 0;
    stick.style.transform = 'translate(-50%,-50%)';
  }
  joystick.addEventListener('pointerdown', e => {
    if (mode !== 'running' || pointer != null) return;
    e.preventDefault(); pointer = e.pointerId;
    joystick.setPointerCapture(e.pointerId); moveStick(e);
  });
  joystick.addEventListener('pointermove', e => {
    if (pointer === e.pointerId) { e.preventDefault(); moveStick(e); }
  });
  function releaseStick(e) { if (pointer === e.pointerId) resetStick(); }
  joystick.addEventListener('pointerup', releaseStick);
  joystick.addEventListener('pointercancel', releaseStick);
  joystick.addEventListener('lostpointercapture', releaseStick);
  window.addEventListener('keydown', e => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(key)) e.preventDefault();
    keys.add(key);
    if (key === 'Escape') {
      if (mode === 'running') pauseGame();
      else if (mode === 'paused') resumeGame();
    }
  });
  window.addEventListener('keyup', e => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => { keys.clear(); resetStick(); if (mode === 'running') pauseGame(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'running') pauseGame();
  });
  function startGame() {
    match = createMatch((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    mode = 'running'; keys.clear(); resetStick(); lastEventId = 0; accumulator = 0;
    setScreen(mode); showAnnounce('LAST CUBE STANDING', 1.2);
    updateHUD();
  }
  function pauseGame() {
    if (mode !== 'running') return;
    mode = 'paused'; resetStick(); keys.clear(); setScreen(mode); accumulator = 0;
  }
  function resumeGame() {
    if (mode !== 'paused') return;
    mode = 'running'; accumulator = 0; setScreen(mode);
  }
  function finishGame() {
    if (mode !== 'running') return;
    mode = 'result'; resetStick(); setScreen(mode);
    const player = match.cubes[0];
    $('clash-outcome').textContent = match.outcome === 'victory' ? 'VICTORY' : 'ELIMINATED';
    $('clash-summary').textContent = match.outcome === 'victory' ? 'LAST CUBE STANDING' : 'THE ARENA CLAIMED ANOTHER CUBE';
    $('clash-kos').textContent = String(player.knocks);
    $('clash-duration').textContent = clock(match.elapsed);
    if (match.outcome === 'victory') best.wins++;
    best.eliminations = Math.max(best.eliminations, player.knocks);
    $('clash-best').textContent = String(best.wins) + ' WINS';
    try { localStorage.setItem(storageKey, JSON.stringify(best)); } catch (_) { }
  }
  $('clash-start').addEventListener('click', startGame);
  $('clash-again').addEventListener('click', startGame);
  $('clash-restart-pause').addEventListener('click', startGame);
  $('clash-resume').addEventListener('click', resumeGame);
  $('clash-pause').addEventListener('click', pauseGame);
  function clock(seconds) {
    const s = Math.floor(Math.max(0, seconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function showAnnounce(text, seconds) {
    const el = $('clash-announce');
    el.textContent = text; el.classList.remove('hidden');
    announceTimer = seconds;
  }
  function updateHUD() {
    if (!match) return;
    $('clash-zone').textContent = 'ZONE ' + String(match.stage + 1).padStart(2, '0');
    $('clash-phase').textContent = match.warning ?
      'EDGE FALL · ' + Math.ceil(match.warningTime) + 'S' : ZONE_NAMES[match.stage];
    const alive = match.cubes.filter(c => c.alive).length;
    $('clash-count').textContent = alive + ' ALIVE';
    $('clash-clock').textContent = clock(match.elapsed);
    $('clash-phase').style.color = match.warning ? '#ffcc7f' : '#83dcff';
  }
  function roundedRect(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function squarePath(half) {
    roundedRect(CX - half, CY - half, 2 * half, 2 * half, Math.max(12, half * .16));
  }
  function drawBackground(time, palette) {
    ctx.fillStyle = '#070d1d'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    let glow = ctx.createRadialGradient(CX, CY, 20, CX, CY, 470);
    glow.addColorStop(0, palette[1]);
    glow.addColorStop(.6, '#09162a');
    glow.addColorStop(1, '#050914');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.globalAlpha = .17; ctx.strokeStyle = palette[0]; ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const off = i * 84;
      ctx.beginPath(); ctx.moveTo(CX + off - 400, 0); ctx.lineTo(CX + off + 370, HEIGHT); ctx.stroke();
    }
    ctx.globalAlpha = .15; ctx.fillStyle = '#d9f3ff';
    for (let n = 0; n < 47; n++) {
      const x = (n * 183.73 + 39) % WIDTH;
      const y = (n * 91.37 + 27) % HEIGHT;
      ctx.fillRect(x, y, 1.1 + n % 3 * .35, 1.1 + n % 2);
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = .07 + .025 * Math.sin(time * .6);
    ctx.strokeStyle = palette[0]; ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      const inset = 24 + i * 21;
      ctx.strokeRect(inset, inset, WIDTH - 2 * inset, HEIGHT - 2 * inset);
    }
    ctx.restore();
  }
  function drawFallenRims(active) {
    for (const rim of active.falling) {
      const a = clamp(1 - rim.age / 1.35, 0, 1);
      const n = rim.newHalf, o = rim.oldHalf;
      const side = o - n, drop = rim.age * rim.age * 82;
      const pieces = [
        [-n, -o, n * 2, side, 0, -1], [-n, n, n * 2, side, 0, 1],
        [-o, -n, side, n * 2, -1, 0], [n, -n, side, n * 2, 1, 0],
        [-o, -o, side, side, -1, -1], [n, -o, side, side, 1, -1],
        [-o, n, side, side, -1, 1], [n, n, side, side, 1, 1]
      ];
      pieces.forEach(function (p, i) {
        const factor = clamp((rim.age - i * .035) / .9, 0, 1);
        ctx.save(); ctx.globalAlpha = a * .8;
        const px = CX + p[0] + p[4] * (rim.age * 26);
        const py = CY + p[1] + p[5] * (rim.age * 24) + drop;
        const centerX = px + p[2] / 2, centerY = py + p[3] / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((i % 2 ? -1 : 1) * factor * .16);
        ctx.scale(1 - factor * .22, 1 - factor * .22);
        ctx.fillStyle = '#1e3550'; ctx.strokeStyle = '#6cb7e3'; ctx.lineWidth = 1.3;
        ctx.fillRect(-p[2] / 2, -p[3] / 2, p[2], p[3]);
        ctx.strokeRect(-p[2] / 2, -p[3] / 2, p[2], p[3]);
        ctx.restore();
      });
    }
  }
  function drawArena(active, time) {
    const h = active.half;
    const pal = PALETTES[active.stage];
    drawBackground(time, pal);
    ctx.save();
    ctx.translate(0, 12);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.filter = 'blur(22px)';
    ctx.beginPath(); squarePath(h); ctx.fill();
    ctx.restore();
    drawFallenRims(active);
    ctx.save();
    ctx.beginPath(); squarePath(h);
    const ground = ctx.createLinearGradient(CX - h, CY - h, CX + h, CY + h);
    ground.addColorStop(0, '#23344e');
    ground.addColorStop(.46, pal[1]);
    ground.addColorStop(1, '#19263f');
    ctx.fillStyle = ground; ctx.fill();
    ctx.save(); ctx.clip();
    const tile = Math.max(20, h / 4.3);
    ctx.strokeStyle = 'rgba(165,213,244,.1)'; ctx.lineWidth = 1;
    for (let x = CX - h; x < CX + h; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, CY - h); ctx.lineTo(x, CY + h); ctx.stroke();
    }
    for (let y = CY - h; y < CY + h; y += tile) {
      ctx.beginPath(); ctx.moveTo(CX - h, y); ctx.lineTo(CX + h, y); ctx.stroke();
    }
    const centerLight = ctx.createRadialGradient(CX, CY, 5, CX, CY, h);
    centerLight.addColorStop(0, 'rgba(122,221,255,.08)');
    centerLight.addColorStop(1, 'rgba(0,0,0,.26)');
    ctx.fillStyle = centerLight; ctx.fillRect(CX - h, CY - h, 2 * h, 2 * h);
    if (active.warning) {
      const inner = HALVES[active.stage + 1];
      ctx.beginPath(); squarePath(h); squarePath(inner);
      ctx.fillStyle = Math.sin(time * 9) > 0 ? 'rgba(255,130,79,.25)' : 'rgba(255,130,79,.13)';
      ctx.fill('evenodd');
      ctx.beginPath(); squarePath(inner); ctx.setLineDash([13, 8]);
      ctx.strokeStyle = '#ffcc83'; ctx.lineWidth = 2.3; ctx.stroke(); ctx.setLineDash([]);
      // Eight break panels: the seams explain exactly what is about to detach.
      ctx.strokeStyle = 'rgba(255,202,134,.4)'; ctx.lineWidth = 1.5;
      [-1, 1].forEach(function (side) {
        ctx.beginPath();
        ctx.moveTo(CX - inner, CY + side * inner); ctx.lineTo(CX - inner, CY + side * h);
        ctx.moveTo(CX + inner, CY + side * inner); ctx.lineTo(CX + inner, CY + side * h);
        ctx.moveTo(CX + side * inner, CY - inner); ctx.lineTo(CX + side * h, CY - inner);
        ctx.moveTo(CX + side * inner, CY + inner); ctx.lineTo(CX + side * h, CY + inner);
        ctx.stroke();
      });
    }
    if (active.flash > 0) {
      ctx.fillStyle = 'rgba(192,245,255,' + (active.flash * .17).toFixed(3) + ')';
      ctx.fillRect(CX - h, CY - h, h * 2, h * 2);
    }
    ctx.restore();
    ctx.strokeStyle = pal[0]; ctx.lineWidth = 2.6;
    ctx.shadowColor = pal[0]; ctx.shadowBlur = 19;
    ctx.beginPath(); squarePath(h); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(230,250,255,.16)'; ctx.lineWidth = 5;
    ctx.beginPath(); squarePath(Math.max(5, h - 7)); ctx.stroke();
    ctx.restore();
  }
  function drawCube(cube, time) {
    const p = cube.fall;
    const size = 24 * (1 - p * .62);
    const color = cube.color;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p * 1.05);
    ctx.translate(cube.x, cube.y + p * p * 100);
    ctx.rotate((cube.vx * .0005) + (cube.vy * .0003) + p * .7);
    ctx.scale(1 + cube.squash * .24, 1 - cube.squash * .18);
    ctx.fillStyle = 'rgba(0,0,0,.44)';
    ctx.beginPath(); ctx.ellipse(0, 11 + p * 15, size * .82, size * .32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = color; ctx.shadowBlur = 17 + cube.squash * 16;
    const face = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    face.addColorStop(0, '#efffff');
    face.addColorStop(.16, color);
    face.addColorStop(1, '#193656');
    ctx.fillStyle = face;
    ctx.beginPath(); roundedRect(-size / 2, -size / 2, size, size, 3.8); ctx.fill();
    ctx.lineWidth = cube.id === 0 ? 2.3 : 1.7;
    ctx.strokeStyle = color; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.fillRect(-size * .31, -size * .32, size * .36, size * .12);
    ctx.restore();
    if (p > 0.35) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = (cube.id === 0 ? 'bold 13px ' : 'bold 11px ') + 'system-ui,sans-serif';
    ctx.shadowColor = '#030713'; ctx.shadowBlur = 8;
    ctx.fillStyle = cube.id === 0 ? '#effeff' : color;
    ctx.fillText(cube.name, cube.x, cube.y - 27);
    ctx.restore();
  }
  function drawImpact(impact) {
    const a = impact.life / .26;
    ctx.save(); ctx.globalAlpha = a;
    const dist = (1 - a) * 24;
    ctx.lineWidth = 2; ctx.strokeStyle = '#d1f9ff';
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(impact.x + Math.cos(angle) * (6 + dist),
        impact.y + Math.sin(angle) * (6 + dist));
      ctx.lineTo(impact.x + Math.cos(angle) * (11 + dist),
        impact.y + Math.sin(angle) * (11 + dist));
      ctx.stroke();
    }
    ctx.restore();
  }
  function render(time) {
    const active = match || preview;
    ctx.setTransform(canvas.width / viewWidth, 0, 0, canvas.height / viewHeight, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.translate(ox, oy); ctx.scale(scale, scale);
    drawArena(active, time);
    active.cubes.forEach(c => drawCube(c, time));
    active.impacts.forEach(drawImpact);
  }
  function frame(timestamp) {
    const dt = previous ? Math.min(.05, Math.max(0, (timestamp - previous) / 1000)) : 0;
    previous = timestamp;
    if (mode === 'running' && match) {
      accumulator = Math.min(.08, accumulator + dt);
      let iterations = 0;
      while (accumulator >= 1 / 120 && iterations++ < 9) {
        updateMatch(match, readInput(), 1 / 120);
        accumulator -= 1 / 120;
      }
      if (match.eventId !== lastEventId) {
        lastEventId = match.eventId;
        showAnnounce(match.event, .72);
      }
      if (match.warning && !match.warnedStage) {
        match.warnedStage = match.stage + 1;
        showAnnounce('EDGE BREAK INCOMING', 1.25);
      }
      updateHUD();
      if (match.state === 'finished') finishGame();
    }
    if (announceTimer > 0) {
      announceTimer -= dt;
      if (announceTimer <= 0) $('clash-announce').classList.add('hidden');
    }
    render(timestamp / 1000);
    window.requestAnimationFrame(frame);
  }
  setScreen('menu');
  window.requestAnimationFrame(frame);
})(typeof globalThis !== 'undefined' ? globalThis : this);
