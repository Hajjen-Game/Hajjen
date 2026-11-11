/* CHROMA CLASH 1.0 — independent 2D arena prototype.
 * Fixed-step deterministic simulation; browser adapter below core can be tested in Node. */
(function (root) {
  'use strict';
  const AUDIT = root.ChromaClashAudit || (typeof require === 'function' ? require('../diagnostics/chroma-clash-audit.js') : null);
  const TIDE = root.ChromaCornerTide || (typeof require === 'function' ? require('../render/chroma-corner-tide.js') : null);
  const WIDTH = 960, HEIGHT = 540, CX = WIDTH / 2, CY = HEIGHT / 2;
  const HALVES = Object.freeze([198, 166, 136, 108, 84, 62, 44]);
  const COLLAPSES = Object.freeze([14, 28, 41, 53, 64, 73]);
  const WARNING_SECONDS = 3.2;
  const CUBE_RADIUS = 15;
  // Responsive arcade steering: a committed thumb movement must be visible within 1–2 frames.
  // Collision impulses are still handled separately, preserving a sense of mass on impact.
  const SPEED_LIMIT = 220; // Retained as a backwards-compatible standalone steering default.
  const ZONE_SECONDS = 10;
  const BASE_ZONE_SPEED = 145;
  const ZONE_SPEED_STEP = 12;
  const MAX_ZONE_SPEED = 277;
  // A full four-corner convergence is visible over the entire environment.
  const COLOR_FADE_SECONDS = 1.55;
  const ACCELERATION = 3100;
  const DRAG_MOVING = 1.85;
  const DRAG_IDLE = 18;
  const IMPACT_DECAY = 3.6;
  const IMPACT_COOLDOWN = 0.16;
  const IMPACT_MIN_CLOSING_SPEED = 5;
  const COLORS = ['#60ecff', '#ff71ac', '#ffe26a', '#9f8aff'];
  const NAMES = ['YOU', 'NOVA', 'VOLT', 'HEX'];
  const ZONE_NAMES = ['FLOW', 'SURGE', 'PULSE', 'OVERDRIVE', 'FRENZY', 'CRITICAL', 'FINAL'];
  const PALETTES = [
    ['#54dfff', '#102947'], ['#e5c366', '#392b32'], ['#bb83ff', '#302449'],
    ['#ff74b5', '#3b213d'], ['#85efbc', '#1b3c40'], ['#ff9a69', '#442e34'],
    ['#ffffff', '#303854']
  ];
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  // A color zone is a fixed ten-second clock phase, independent of collapsing
  // platform rings. Color and speed change on the same simulation step.
  const zoneForElapsed = elapsed => Math.floor(Math.max(0, elapsed + 1e-7) / ZONE_SECONDS);
  const speedForZone = zone => Math.min(MAX_ZONE_SPEED, BASE_ZONE_SPEED + ZONE_SPEED_STEP * Math.max(0, zone | 0));
  const paletteForZone = zone => PALETTES[Math.max(0, zone | 0) % PALETTES.length];
  function mixColor(from, to, progress) {
    const t = clamp(progress, 0, 1);
    const a = parseInt(from.slice(1), 16), b = parseInt(to.slice(1), 16);
    const rgb = [16, 8, 0].map(shift => Math.round(
      ((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t));
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
  }
  function activePalette(match) {
    const current = paletteForZone(match.zone);
    if (!match.paletteFade) return current;
    const old = paletteForZone(match.zone - 1);
    const t = 1 - clamp(match.paletteFade / COLOR_FADE_SECONDS, 0, 1);
    return [mixColor(old[0], current[0], t), mixColor(old[1], current[1], t)];
  }
  const length = (x, y) => Math.hypot(x, y);
  function normalized(x, y) {
    const l = length(x, y);
    return l > 0.00001 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  // Thumb travel and movement power are deliberately decoupled. A short thumb
  // sweep should produce a useful command even on a small mobile joystick.
  function joystickResponse(strength) {
    const v = clamp(Number.isFinite(strength) ? strength : 0, 0, 1);
    return v <= 0.08 ? 0 : Math.min(1, Math.pow((v - 0.08) / 0.92, 0.62) * 1.08);
  }
  function steerCube(cube, intent, dt, speedLimit = SPEED_LIMIT) {
    let mx = Number.isFinite(intent.x) ? intent.x : 0;
    let my = Number.isFinite(intent.y) ? intent.y : 0;
    const magnitude = length(mx, my);
    if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
    const drag = magnitude < .04 ? DRAG_IDLE : DRAG_MOVING;
    // High steering acceleration shortens turn/reverse latency; no teleportation.
    cube.vx += (mx * ACCELERATION - cube.vx * drag) * dt;
    cube.vy += (my * ACCELERATION - cube.vy * drag) * dt;
    const speed = length(cube.vx, cube.vy);
    if (speed > speedLimit) { cube.vx *= speedLimit / speed; cube.vy *= speedLimit / speed; }
    // Knockback is an external decaying impulse. Keep it OUTSIDE the
    // joystick speed cap: otherwise every hit is erased on the next frame.
    const kx = cube.knockVx || 0, ky = cube.knockVy || 0;
    cube.x += (cube.vx + kx) * dt;
    cube.y += (cube.vy + ky) * dt;
    const decay = Math.exp(-IMPACT_DECAY * dt);
    cube.knockVx = kx * decay;
    cube.knockVy = ky * decay;
    return cube;
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
        vx: 0, vy: 0, knockVx: 0, knockVy: 0, alive: true, fall: 0, knocks: 0,
        hitsTaken: 0, hitsLanded: 0, lastHitBy: null, lastHitAt: -Infinity,
        squash: 0, spark: 0,
        aiX: 0, aiY: 0, aiNext: 0, personality: 0.82 + random() * 0.28,
        aggression: 0.76 + random() * 0.3, offset: (random() - 0.5) * 0.24
      };
    });
    return {
      seed: seed, random: random, cubes: cubes, audit: new AUDIT.ClashRunAudit(seed),
      hitCooldowns: Object.create(null),
      half: HALVES[0], stage: 0,
      elapsed: 0, zone: 0, paletteFade: 0,
      warning: false, warningTime: 0, falling: [], impacts: [],
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
      cube.x + (cube.vx + (cube.knockVx || 0)) * .35,
      cube.y + (cube.vy + (cube.knockVy || 0)) * .35,
      match.half, Math.max(12, match.half * .16));
    let dx, dy;
    if (predictedDanger > -31 || danger > -35) {
      // A bot must genuinely evade its own momentum; no teleport, speed bonus, or edge immunity.
      dx = CX - cube.x - (cube.vx + (cube.knockVx || 0)) * .30;
      dy = CY - cube.y - (cube.vy + (cube.knockVy || 0)) * .30;
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
    if (dist < .001) { dx = b.id > a.id ? 1 : -1; dy = 0; dist = 1; }
    const nx = dx / dist, ny = dy / dist;
    const overlap = minDist - dist;
    // Always resolve overlap. Heavy knockback is awarded only on a genuine
    // closing contact, not by sitting still inside another cube.
    a.x -= nx * overlap * .5;
    a.y -= ny * overlap * .5;
    b.x += nx * overlap * .5;
    b.y += ny * overlap * .5;
    const aTotalX = a.vx + (a.knockVx || 0), aTotalY = a.vy + (a.knockVy || 0);
    const bTotalX = b.vx + (b.knockVx || 0), bTotalY = b.vy + (b.knockVy || 0);
    const closing = (bTotalX - aTotalX) * nx + (bTotalY - aTotalY) * ny;
    const now = match ? match.elapsed : 0;
    const key = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
    const previous = match && match.hitCooldowns ? match.hitCooldowns[key] : undefined;
    if (closing < -IMPACT_MIN_CLOSING_SPEED &&
        (previous == null || now - previous >= IMPACT_COOLDOWN)) {
      if (match && match.hitCooldowns) match.hitCooldowns[key] = now;
      // An arcade shove has two parts: a smaller reaction in normal movement
      // velocity plus a strong, short-lived independent knock velocity.
      // Both use the SAME mass/force for human and AI opponents.
      const impulse = clamp(52 + -closing * .86, 58, 320);
      const kick = impulse * 1.27;
      a.vx -= nx * impulse * .32;
      a.vy -= ny * impulse * .32;
      b.vx += nx * impulse * .32;
      b.vy += ny * impulse * .32;
      a.knockVx = (a.knockVx || 0) - nx * kick;
      a.knockVy = (a.knockVy || 0) - ny * kick;
      b.knockVx = (b.knockVx || 0) + nx * kick;
      b.knockVy = (b.knockVy || 0) + ny * kick;
      const power = clamp(impulse / 240, .22, 1.45);
      a.squash = Math.max(a.squash, power);
      b.squash = Math.max(b.squash, power);
      a.spark = Math.max(a.spark || 0, power);
      b.spark = Math.max(b.spark || 0, power);
      // A real push is credited to the cube that approached with the greater
      // positive velocity component along the contact normal.
      const approachA = Math.max(0, aTotalX * nx + aTotalY * ny);
      const approachB = Math.max(0, -(bTotalX * nx + bTotalY * ny));
      const attacker = Math.abs(approachA - approachB) < 8 ? null :
        approachA > approachB ? a.id : b.id;
      const target = attacker == null ? null : attacker === a.id ? b.id : a.id;
      if (attacker != null) {
        const recipient = attacker === a.id ? b : a;
        const hitter = attacker === a.id ? a : b;
        recipient.lastHitBy = attacker;
        recipient.lastHitAt = now;
        recipient.hitsTaken = (recipient.hitsTaken || 0) + 1;
        hitter.hitsLanded = (hitter.hitsLanded || 0) + 1;
      }
      if (match) {
        // VFX are throttled per visual frame, while the log records all
        // accepted impulses and preserves the per-cube hit identity.
        if (match.lastImpactTime == null || now - match.lastImpactTime > .07) {
          match.impacts.push({
            x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
            life: .38, power, color: a.color
          });
          match.lastImpactTime = now;
        }
        if (match.audit) {
          const nearEdge = Math.max(
            roundedSquareSDF(a.x, a.y, match.half, Math.max(12, match.half * .16)),
            roundedSquareSDF(b.x, b.y, match.half, Math.max(12, match.half * .16)));
          match.audit.noteContact(now, a, b, impulse, attacker, target, nearEdge);
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
    match.audit.ringBreaks++;
    match.audit.record('edge_break', match.elapsed,
      { stage: match.stage, fromHalf: oldHalf, toHalf: match.half });
    match.event = 'EDGE BREAK';
    match.eventId++;
  }
  function knockOut(match, cube) {
    if (!cube.alive) return;
    cube.alive = false;
    cube.fall = 0;
    match.lastElimination = cube.id;
    // Do not fabricate KO credits from whichever opponent happens to be
    // closest: only an actual recent directed contact can score.
    const credit = Number.isInteger(cube.lastHitBy) &&
      match.elapsed - cube.lastHitAt < 1.25 ? cube.lastHitBy : null;
    if (credit != null && credit !== cube.id && match.cubes[credit]) {
      match.cubes[credit].knocks++;
    }
    const edgeJustBroke = match.stage > 0 &&
      match.elapsed - COLLAPSES[match.stage - 1] < .13;
    const cause = edgeJustBroke ? 'edge_break' :
      credit != null ? 'push' : 'edge_fall';
    match.audit.noteElimination(match.elapsed, cube, credit, cause);
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
    match.paletteFade = Math.max(0, match.paletteFade - step);
    if (match.state === 'ending') {
      match.endingTime -= step;
      if (match.endingTime <= 0) match.state = 'finished';
      return match;
    }
    match.elapsed += step;
    const nextZone = zoneForElapsed(match.elapsed);
    if (nextZone !== match.zone) {
      match.zone = nextZone;
      match.paletteFade = COLOR_FADE_SECONDS;
      match.audit.zoneChanges++;
      match.audit.record('zone_change', match.elapsed, {
        zone: match.zone + 1, speedCap: speedForZone(match.zone),
        palette: paletteForZone(match.zone)[0]
      });
      match.event = 'ZONE ' + String(match.zone + 1).padStart(2, '0') + ' · SPEED UP';
      match.eventId++;
    }
    const nextCollapse = COLLAPSES[match.stage];
    match.warningTime = nextCollapse == null ? 0 : Math.max(0, nextCollapse - match.elapsed);
    match.warning = nextCollapse != null && match.warningTime <= WARNING_SECONDS;
    if (match.warning && match.loggedWarningStage !== match.stage) {
      match.loggedWarningStage = match.stage;
      match.audit.record('edge_warning', match.elapsed, {
        stage: match.stage + 1, secondsToBreak: match.warningTime
      });
    }
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
      steerCube(cube, intent, step, speedForZone(match.zone));
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
    match.audit.sample(match);
    const survivors = match.cubes.filter(c => c.alive);
    if (!match.cubes[0].alive || survivors.length < 2) {
      match.winner = survivors.length === 1 ? survivors[0].id : null;
      match.outcome = match.cubes[0].alive && survivors.length === 1 ? 'victory' : 'eliminated';
      match.state = 'ending';
      match.endingTime = .75;
      match.audit.finish(match);
    }
    return match;
  }
  const core = { WIDTH, HEIGHT, CX, CY, HALVES, COLLAPSES, COLORS, NAMES,
    ZONE_NAMES, PALETTES, CUBE_RADIUS, SPEED_LIMIT, WARNING_SECONDS,
    ZONE_SECONDS, BASE_ZONE_SPEED, ZONE_SPEED_STEP, MAX_ZONE_SPEED, COLOR_FADE_SECONDS,
    zoneForElapsed, speedForZone, paletteForZone, activePalette,
    roundedSquareSDF, supported, joystickResponse, steerCube,
    createMatch, chooseAI, collide, updateMatch, beginCollapse, knockOut };
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
    const travel = Math.min(max, distance);
    const power = joystickResponse(travel / max);
    joyX = distance > 0 ? dx / distance * power : 0;
    joyY = distance > 0 ? dy / distance * power : 0;
    // The thumb follows the finger, while the analog command uses a curved
    // response. Otherwise small movements appear visually delayed.
    const thumbX = distance > 0 ? dx / distance * travel : 0;
    const thumbY = distance > 0 ? dy / distance * travel : 0;
    stick.style.transform = 'translate(calc(-50% + ' + thumbX.toFixed(1) +
      'px),calc(-50% + ' + thumbY.toFixed(1) + 'px))';
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
  function exportRunLog() {
    if (!match || !match.audit) return;
    const payload = match.audit.snapshot(match);
    const filename = 'chroma-clash-zone-' + String(match.zone + 1).padStart(2, '0') +
      '-run-audit.json';
    // Explicit user action only. No upload, network request, tracking or
    // automatic saving of movement history between sessions.
    const data = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const download = document.createElement('a');
    download.href = url;
    download.download = filename;
    download.style.display = 'none';
    document.body.appendChild(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  $('clash-export').addEventListener('click', exportRunLog);
  $('clash-export-pause').addEventListener('click', exportRunLog);
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
    $('clash-zone').textContent = 'ZONE ' + String(match.zone + 1).padStart(2, '0');
    $('clash-phase').textContent = match.warning ?
      'EDGE FALL · ' + Math.ceil(match.warningTime) + 'S' :
      ZONE_NAMES[match.zone % ZONE_NAMES.length] + ' · SPEED ' +
        (speedForZone(match.zone) / BASE_ZONE_SPEED).toFixed(2) + '×';
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
    let glow = ctx.createRadialGradient(CX, CY, 12, CX, CY, 590);
    // The earlier world had a nearly static deep-blue backdrop. A clear
    // environmental hue change now reaches the full camera, not just the rim.
    glow.addColorStop(0, mixColor(palette[1], palette[0], .42));
    glow.addColorStop(.5, mixColor('#09162a', palette[0], .24));
    glow.addColorStop(1, mixColor('#050914', palette[0], .09));
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
  function drawArena(active, time, pal = activePalette(active), floorOnly = false) {
    const h = active.half;
    if (!floorOnly) {
      drawBackground(time, pal);
      ctx.save();
      ctx.translate(0, 12);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.filter = 'blur(22px)';
      ctx.beginPath(); squarePath(h); ctx.fill();
      ctx.restore();
      drawFallenRims(active);
    }
    ctx.save();
    ctx.beginPath(); squarePath(h);
    const ground = ctx.createLinearGradient(CX - h, CY - h, CX + h, CY + h);
    ground.addColorStop(0, mixColor('#23344e', pal[0], .29));
    ground.addColorStop(.46, mixColor(pal[1], pal[0], .24));
    ground.addColorStop(1, mixColor('#19263f', pal[0], .21));
    ctx.fillStyle = ground; ctx.fill();
    ctx.save(); ctx.clip();
    const tile = Math.max(20, h / 4.3);
    ctx.strokeStyle = mixColor('#29445c', pal[0], .52); ctx.globalAlpha = .35; ctx.lineWidth = 1;
    for (let x = CX - h; x < CX + h; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, CY - h); ctx.lineTo(x, CY + h); ctx.stroke();
    }
    for (let y = CY - h; y < CY + h; y += tile) {
      ctx.beginPath(); ctx.moveTo(CX - h, y); ctx.lineTo(CX + h, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
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
    ctx.rotate(((cube.vx + (cube.knockVx || 0)) * .0006) +
      ((cube.vy + (cube.knockVy || 0)) * .00035) + p * .7);
    // Impact visibly compresses the cube, but keeps its recognizable square
    // silhouette (the player specifically disliked arrow-shaped motion).
    ctx.scale(1 + cube.squash * .27, 1 - cube.squash * .23);
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
    const a = clamp(impact.life / .38, 0, 1);
    const spread = (1 - a) * (22 + impact.power * 10);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = a * .83;
    ctx.shadowColor = impact.color || '#c9f9ff';
    ctx.shadowBlur = 15 + 11 * a;
    ctx.strokeStyle = '#dcfbff';
    ctx.lineWidth = 2.2 + a * 1.2;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, 8 + spread, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + Math.PI / 8;
      const begin = 8 + spread * .65;
      const end = 16 + spread;
      ctx.beginPath();
      ctx.moveTo(impact.x + Math.cos(angle) * begin,
        impact.y + Math.sin(angle) * begin);
      ctx.lineTo(impact.x + Math.cos(angle) * end,
        impact.y + Math.sin(angle) * end);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawCornerTransition(active, time) {
    const to = paletteForZone(active.zone);
    const from = paletteForZone(active.zone - 1);
    const progress = 1 - active.paletteFade / COLOR_FADE_SECONDS;
    const screen = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
    const floor = { x: CX - active.half, y: CY - active.half,
      w: active.half * 2, h: active.half * 2 };
    // Preserve true old and new world colors on each side of the moving
    // fronts. This is NOT a transparent full-screen tint cross-fade.
    drawArena(active, time, from);
    ctx.save();
    // Paint only the backdrop outside the physical rounded-square floor.
    ctx.beginPath();
    ctx.rect(0, 0, WIDTH, HEIGHT);
    squarePath(active.half);
    ctx.clip('evenodd');
    TIDE.clipNewColor(ctx, screen, progress);
    drawBackground(time, to);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); squarePath(active.half); ctx.clip();
    TIDE.clipNewColor(ctx, floor, progress);
    drawArena(active, time, to, true);
    ctx.restore();

    // Independent four-corner fronts in the environment and platform.
    // Edges look like moving chroma lighting, not extra obstacles.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, WIDTH, HEIGHT); squarePath(active.half);
    ctx.clip('evenodd');
    TIDE.drawFront(ctx, screen, progress, to[0], .88);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); squarePath(active.half); ctx.clip();
    TIDE.drawFront(ctx, floor, progress, to[0], 1.32);
    ctx.restore();
    if (progress > .82) {
      const pulse = Math.sin(Math.PI * (progress - .82) / .18);
      const glow = ctx.createRadialGradient(CX, CY, 8, CX, CY, active.half * 1.05);
      glow.addColorStop(0, 'rgba(218,249,255,' + (Math.max(0, pulse) * .19).toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(218,249,255,0)');
      ctx.save();
      ctx.beginPath(); squarePath(active.half); ctx.clip();
      ctx.fillStyle = glow;
      ctx.fillRect(floor.x, floor.y, floor.w, floor.h);
      ctx.restore();
    }
  }
  function render(time) {
    const active = match || preview;
    ctx.setTransform(canvas.width / viewWidth, 0, 0, canvas.height / viewHeight, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.translate(ox, oy); ctx.scale(scale, scale);
    if (active.paletteFade > 0 && TIDE) drawCornerTransition(active, time);
    else drawArena(active, time, paletteForZone(active.zone));
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
        showAnnounce(match.event, match.event && match.event.includes('SPEED UP') ? 1.25 : .72);
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
