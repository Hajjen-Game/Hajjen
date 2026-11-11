/* CHROMA CLASH 1.0 — independent 2D arena prototype.
 * Fixed-step deterministic simulation; browser adapter below core can be tested in Node. */
(function (root) {
  'use strict';
  const AUDIT = root.ChromaClashAudit || (typeof require === 'function' ? require('../diagnostics/chroma-clash-audit.js') : null);
  const TIDE = root.ChromaCenterPulse || (typeof require === 'function' ? require('../render/chroma-center-pulse.js') : null);
  // The runner is the source of truth for chromatic palettes AND the glass
  // cube material. No independently invented Clash color identities.
  const RUSH = root.ChromaConfig || (typeof require === 'function' ? require('../core/config.js') : null);
  const IDENTITY = root.ChromaIdentity || (typeof require === 'function' ? require('../render/chroma-identity.js') : null);
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
  // Center-origin pulse matches Rush's continuous, non-hazard Chroma Tide.
  const COLOR_FADE_SECONDS = 1.10;
  const ACCELERATION = 3100;
  const DRAG_MOVING = 1.85;
  const DRAG_IDLE = 18;
  const IMPACT_DECAY = 3.6;
  const IMPACT_COOLDOWN = 0.16;
  const IMPACT_MIN_CLOSING_SPEED = 5;
  const COLORS = ['#60ecff', '#ff71ac', '#ffe26a', '#9f8aff'];
  const NAMES = ['YOU', 'NOVA', 'VOLT', 'HEX'];
  const ZONE_NAMES = ['FLOW', 'SURGE', 'PULSE', 'OVERDRIVE', 'FRENZY', 'CRITICAL', 'FINAL'];
  // Share the exact pigments used by Rush. Keep the existing seven-zone
  // palette cycle and ten-second gameplay clock for backward compatibility.
  // [primary, shadow, secondary] is Clash's fast Canvas-facing format.
  const PALETTES = Object.freeze(RUSH.PALETTES.slice(0, 7).map(p =>
    Object.freeze([p.primary, p.shadow, p.secondary])));
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
    match.audit.noteElimination(match.elapsed, cube, credit, cause, {
      zone: match.zone + 1, stage: match.stage, speedCap: speedForZone(match.zone),
      edgeDistance: roundedSquareSDF(cube.x, cube.y, match.half,
        Math.max(12, match.half * .16))
    });
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
  // The visible context is never swapped inside the animation frame. An
  // isolated low-resolution cache is created only at zone boundaries.
  let ctx = canvas.getContext('2d');
  if (!ctx) { $('clash-menu').innerHTML = '<h2>Canvas 2D is required.</h2>'; return; }
  const screenCtx = ctx;
  // Render performance 1.4: stationary arena/background art is generated
  // only when the zone or platform changes. Normal frames draw two cached
  // images at most, plus the four actors and lightweight impact effects.
  const sceneSlots = [{ key: '', canvas: null }, { key: '', canvas: null }];
  let sceneReplacement = 0, tideDisabled = false;
  let tideSlowFrames = 0, slowFrameStreak = 0, renderQuality = 1;
  let pixelsPerCss = 1;
  const BASE_PIXEL_BUDGET = 750000;
  const spriteCache = Object.create(null);
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
    // This used to render 2x device pixel ratio on phones: a 1.4k × 700
    // CSS viewport could consume over 3.9 million GPU pixels per frame.
    // The game sprites are vector/Canvas art, and the DOM HUD stays crisp.
    pixelsPerCss = Math.min(1, Math.sqrt(BASE_PIXEL_BUDGET /
      Math.max(1, viewWidth * viewHeight))) * renderQuality;
    const targetWidth = Math.max(1, Math.round(viewWidth * pixelsPerCss));
    const targetHeight = Math.max(1, Math.round(viewHeight * pixelsPerCss));
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;
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
    tideDisabled = false; tideSlowFrames = 0; slowFrameStreak = 0;
    renderQuality = 1; resize();
    mode = 'running'; keys.clear(); resetStick(); lastEventId = 0; accumulator = 0;
    setScreen(mode); showAnnounce('LAST CUBE STANDING', .82);
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
  function setText(id, value) {
    const el = $(id);
    if (el.textContent !== value) el.textContent = value;
  }
  function updateHUD() {
    if (!match) return;
    setText('clash-zone', 'ZONE ' + String(match.zone + 1).padStart(2, '0'));
    setText('clash-phase', match.warning ?
      'EDGE FALL · ' + Math.ceil(match.warningTime) + 'S' :
      ZONE_NAMES[match.zone % ZONE_NAMES.length] + ' · SPEED ' +
        (speedForZone(match.zone) / BASE_ZONE_SPEED).toFixed(2) + '×');
    const alive = match.cubes.filter(c => c.alive).length;
    setText('clash-count', alive + ' ALIVE');
    setText('clash-clock', clock(match.elapsed));
    const color = match.warning ? 'rgb(255, 204, 127)' : 'rgb(131, 220, 255)';
    if ($('clash-phase').style.color !== color) $('clash-phase').style.color = color;
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
    // Visual Cohesion 1.0: same dark atmospheric sky / broad color bounce /
    // restrained distant architecture as Rush, viewed from above. This
    // complete scene is rasterized ONCE per color zone and platform stage.
    const primary = palette[0], shadow = palette[1], secondary = palette[2];
    ctx.fillStyle = '#070b17';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#060b19');
    sky.addColorStop(.44, mixColor('#071324', shadow, .77));
    sky.addColorStop(1, mixColor('#061021', shadow, .51));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Same diffuse two-color illumination budget as the runner's world.
    const centerGlow = ctx.createRadialGradient(CX, CY + 4, 0, CX, CY, 425);
    centerGlow.addColorStop(0, hexAlpha(primary, .25));
    centerGlow.addColorStop(.44, hexAlpha(secondary, .115));
    centerGlow.addColorStop(1, hexAlpha(primary, 0));
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const distanceGlow = ctx.createRadialGradient(WIDTH*.73, HEIGHT*.76, 0,
      WIDTH*.73, HEIGHT*.76, 440);
    distanceGlow.addColorStop(0, hexAlpha(secondary, .11));
    distanceGlow.addColorStop(1, hexAlpha(secondary, 0));
    ctx.fillStyle = distanceGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // The old diagonal wallpaper/grid was unrelated to Rush. Subtle depth
    // silhouettes and a thin atmospheric horizon reuse its visual language.
    const skyline = ctx.createLinearGradient(0, 150, 0, HEIGHT);
    skyline.addColorStop(0, hexAlpha(primary, .013));
    skyline.addColorStop(.65, hexAlpha(primary, .068));
    skyline.addColorStop(1, hexAlpha(primary, .012));
    for (let i = 0; i < 11; i++) {
      const x = 19 + i * 92 + (i % 3) * 13;
      const top = 154 + ((i * 37) % 128);
      const width = 15 + (i % 4) * 8;
      ctx.fillStyle = skyline;
      ctx.fillRect(x, top, width, HEIGHT - top);
      ctx.fillStyle = hexAlpha(secondary, .043);
      ctx.fillRect(x + width * .68, top + 12, 1.3, Math.min(90, HEIGHT - top - 22));
    }
    // Horizontal light streaks, not full-screen wireframe diagonals.
    for (let i = 0; i < 17; i++) {
      const y = 36 + (i * 107 % 460);
      const x = (i * 163 + 27) % WIDTH;
      ctx.fillStyle = hexAlpha(i % 2 ? secondary : primary, .055 + i % 4 * .012);
      ctx.fillRect(x, y, 21 + i % 5 * 17, i % 5 === 0 ? 1.5 : 1);
    }
    for (let i = 0; i < 39; i++) {
      const x = (i * 237.3 + 31) % WIDTH;
      const y = (i * 111.7 + 41) % HEIGHT;
      ctx.fillStyle = hexAlpha(i % 4 ? '#c8e3f4' : secondary, .09 + (i % 3) * .022);
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, 1);
    }
    const horizon = HEIGHT * .575;
    ctx.globalAlpha = .22;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon); ctx.lineTo(WIDTH, horizon);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function hexAlpha(hex, alpha) {
    const v = parseInt(hex.slice(1), 16);
    return 'rgba(' + (v >> 16) + ',' + ((v >> 8) & 255) + ',' +
      (v & 255) + ',' + alpha + ')';
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
  function drawArena(active, time, pal = activePalette(active)) {
    const h = active.half;
    const primary = pal[0], shadow = pal[1], secondary = pal[2];
    drawBackground(time, pal);
    ctx.save();
    // A solid floating glass platform, not a bright panel border over a grid.
    // Ambient bounce and the thin rim reuse Rush's premium lighting materials.
    ctx.translate(0, 10);
    ctx.fillStyle = 'rgba(0, 0, 0, .45)';
    ctx.filter = 'blur(14px)';
    ctx.beginPath(); squarePath(h); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); squarePath(h);
    const ground = ctx.createLinearGradient(CX - h, CY - h, CX + h, CY + h);
    ground.addColorStop(0, mixColor('#152942', primary, .17));
    ground.addColorStop(.32, mixColor('#09172b', shadow, .47));
    ground.addColorStop(.76, mixColor('#0b1a30', secondary, .16));
    ground.addColorStop(1, mixColor('#081525', shadow, .52));
    ctx.fillStyle = ground; ctx.fill();
    ctx.save(); ctx.clip();
    const light = ctx.createRadialGradient(CX - h*.23, CY - h*.23, 1,
      CX, CY, h * 1.45);
    light.addColorStop(0, hexAlpha(primary, .15));
    light.addColorStop(.55, hexAlpha(secondary, .056));
    light.addColorStop(1, hexAlpha(primary, 0));
    ctx.fillStyle = light;
    ctx.fillRect(CX - h, CY - h, h * 2, h * 2);
    // Rush's track uses a very sparse illuminated perspective. Use that
    // visual rhythm rather than Clash's dense blue graph-paper grid.
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexAlpha(primary, .11);
    const spacing = Math.max(44, h * .32);
    for (let n = -2; n <= 2; n++) {
      const x = CX + spacing*n;
      ctx.beginPath(); ctx.moveTo(x, CY-h); ctx.lineTo(x, CY+h); ctx.stroke();
      const y = CY + spacing*n;
      ctx.beginPath(); ctx.moveTo(CX-h, y); ctx.lineTo(CX+h, y); ctx.stroke();
    }
    // Brightness remains on the playable material, never as a separate
    // obstacle-shaped tile, arrow or pulse square.
    const skin = ctx.createLinearGradient(0, CY-h, 0, CY+h);
    skin.addColorStop(0, 'rgba(240,252,255,.10)');
    skin.addColorStop(.21, 'rgba(240,252,255,.025)');
    skin.addColorStop(1, 'rgba(0,0,0,.14)');
    ctx.fillStyle = skin;
    ctx.fillRect(CX-h, CY-h, h*2, h*2);
    ctx.restore();
    ctx.shadowColor = primary; ctx.shadowBlur = 18;
    ctx.strokeStyle = hexAlpha(primary, .66); ctx.lineWidth = 3.2;
    ctx.beginPath(); squarePath(h); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(230,250,255,.64)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); squarePath(Math.max(5, h-3)); ctx.stroke();
    ctx.strokeStyle = hexAlpha(secondary, .22); ctx.lineWidth = 1.2;
    ctx.beginPath(); squarePath(Math.max(5, h-11)); ctx.stroke();
    ctx.restore();
  }
  function cubeSprite(color) {
    if (spriteCache[color]) return spriteCache[color];
    const image = document.createElement('canvas');
    image.width = 72; image.height = 72;
    const c = image.getContext('2d');
    c.translate(36, 36);
    const bodyPath = (x,y,w,h,r) => {
      c.beginPath();
      c.moveTo(x+r,y); c.lineTo(x+w-r,y);
      c.quadraticCurveTo(x+w,y,x+w,y+r);
      c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
      c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
      c.closePath();
    };
    // A Rush cube is white-centered glass with a tinted, luminous edge.
    // The AI retains its colored identifying rim, not a separate material.
    c.save();
    c.shadowColor = color; c.shadowBlur = 15;
    c.fillStyle = hexAlpha(color,.42);
    bodyPath(-12,-12,24,24,5);
    c.fill();
    c.restore();
    if (IDENTITY && typeof IDENTITY.paintPlayer === 'function') {
      IDENTITY.paintPlayer(c, {
        x:-12,y:-12,w:24,h:24,primary:color,
        secondary:mixColor(color,'#f6fdff',.25),
        quality:{density:1,glow:.72},
        ambientLight:.65,
        bodyPath
      });
    } else {
      const face=c.createLinearGradient(-12,-12,12,12);
      face.addColorStop(0,'#ffffff');
      face.addColorStop(.65,mixColor('#f5fbff',color,.22));
      face.addColorStop(1,mixColor('#c4e3f5',color,.35));
      c.fillStyle=face; bodyPath(-12,-12,24,24,5);c.fill();
      c.strokeStyle=color;c.lineWidth=2;c.stroke();
    }
    spriteCache[color] = image;
    return image;
  }
  function drawCube(cube, time) {
    const p = cube.fall;
    if (p >= 1) return;
    const sizeScale = 1 - p * .62;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p * 1.05);
    ctx.translate(cube.x, cube.y + p * p * 100);
    ctx.rotate(((cube.vx + (cube.knockVx || 0)) * .0006) +
      ((cube.vy + (cube.knockVy || 0)) * .00035) + p * .7);
    ctx.scale(sizeScale * (1 + cube.squash * .27),
      sizeScale * (1 - cube.squash * .23));
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath(); ctx.ellipse(0, 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(cubeSprite(cube.color), -36, -36);
    ctx.restore();
    if (p > .35) return;
    // Text has no per-frame blur kernel. Fixed color names still identify
    // each AI cube against any of the seven environment palettes.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (cube.id === 0 ? 'bold 13px ' : 'bold 11px ') +
      'system-ui,sans-serif';
    ctx.fillStyle = cube.id === 0 ? '#effeff' : cube.color;
    ctx.fillText(cube.name, cube.x, cube.y - 27);
    ctx.restore();
  }
  function drawImpact(impact) {
    const a = clamp(impact.life / .38, 0, 1);
    const spread = (1 - a) * (22 + impact.power * 10);
    ctx.save();
    ctx.globalAlpha = a * .8;
    ctx.strokeStyle = impact.color || '#c9f9ff';
    ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.arc(impact.x, impact.y, 8 + spread, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#effcff';
    ctx.lineWidth = 1.7;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + Math.PI / 8;
      ctx.beginPath();
      ctx.moveTo(impact.x + Math.cos(angle) * (8 + spread * .65),
        impact.y + Math.sin(angle) * (8 + spread * .65));
      ctx.lineTo(impact.x + Math.cos(angle) * (16 + spread),
        impact.y + Math.sin(angle) * (16 + spread));
      ctx.stroke();
    }
    ctx.restore();
  }
  function getStaticScene(active, zone) {
    if (active.stage === COLLAPSES.length && active.elapsed > 81) return null;
    const key = zone + ':' + active.stage + ':' + active.half;
    const found = sceneSlots.find(slot => slot.key === key);
    if (found && found.canvas) return found.canvas;
    const slot = sceneSlots[sceneReplacement];
    sceneReplacement = (sceneReplacement + 1) % sceneSlots.length;
    if (!slot.canvas) {
      slot.canvas = document.createElement('canvas');
      slot.canvas.width = WIDTH;
      slot.canvas.height = HEIGHT;
    }
    const backing = slot.canvas.getContext('2d', { alpha: false });
    if (!backing) return null;
    const previousCtx = ctx;
    try {
      ctx = backing;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Cache immutable world artwork only. Every frame replays the dynamic
      // collapse/warning/impact over the cached scene, preserving gameplay.
      drawArena({
        half: active.half, stage: active.stage, elapsed: 0,
        warning: false, falling: [], flash: 0
      }, 0, paletteForZone(zone));
      slot.key = key;
      if (match && match.audit) match.audit.performance.sceneBuilds++;
      return slot.canvas;
    } finally {
      ctx = previousCtx;
    }
  }
  function drawDynamicArena(active, time) {
    // Separating this from the costly background paint means collapsing edge
    // pieces, danger warnings and ring break flash remain animated at 60fps.
    if (active.falling.length) drawFallenRims(active);
    if (active.warning && active.stage < COLLAPSES.length) {
      const h = active.half, inner = HALVES[active.stage + 1];
      ctx.save();
      ctx.beginPath(); squarePath(h); ctx.clip();
      // Thin translucent band shows exactly which outer tiles will detach.
      ctx.beginPath(); squarePath(h); squarePath(inner);
      ctx.fillStyle = Math.sin(time * 9) > 0 ? 'rgba(255,148,91,.27)' : 'rgba(255,148,91,.12)';
      ctx.fill('evenodd');
      ctx.beginPath(); squarePath(inner);
      ctx.setLineDash([13, 8]);
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#ffd89b';
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    if (active.flash > 0) {
      ctx.save();
      ctx.beginPath(); squarePath(active.half); ctx.clip();
      ctx.fillStyle = 'rgba(192,245,255,' + (active.flash * .16).toFixed(3) + ')';
      ctx.fillRect(CX - active.half, CY - active.half, active.half * 2, active.half * 2);
      ctx.restore();
    }
  }
  function drawCornerTransition(active, time) {
    const progress = 1 - active.paletteFade / COLOR_FADE_SECONDS;
    const from = getStaticScene(active, Math.max(0, active.zone - 1));
    const to = getStaticScene(active, active.zone);
    if (!from || !to) {
      drawArena(active, time, paletteForZone(active.zone));
      return;
    }
    // Two pre-rendered worlds, one center-out color seam. No per-frame
    // world gradients, extra geometry, gameplay collision or GPU blur.
    ctx.drawImage(from, 0, 0, WIDTH, HEIGHT);
    ctx.save();
    TIDE.clipNewColor(ctx, { x: 0, y: 0, w: WIDTH, h: HEIGHT }, progress);
    ctx.drawImage(to, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
    if (progress > .015 && progress < .98) {
      TIDE.drawFront(ctx, { x: 0, y: 0, w: WIDTH, h: HEIGHT },
        progress, paletteForZone(active.zone)[0], .85);
    }
    drawDynamicArena(active, time);
  }
  function render(time) {
    const active = match || preview;
    screenCtx.setTransform(canvas.width / viewWidth, 0, 0,
      canvas.height / viewHeight, 0, 0);
    screenCtx.clearRect(0, 0, viewWidth, viewHeight);
    screenCtx.translate(ox, oy); screenCtx.scale(scale, scale);
    try {
      if (active.paletteFade > 0 && TIDE && !tideDisabled && active.elapsed <= 81) {
        drawCornerTransition(active, time);
      } else {
        const background = getStaticScene(active, active.zone);
        if (background) {
          ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
          drawDynamicArena(active, time);
        } else drawArena(active, time, paletteForZone(active.zone));
      }
    } catch (error) {
      tideDisabled = true;
      // Graphics error fallback is intentionally primitive and resilient:
      // avoid retrying an already failing heavy render pipeline.
      ctx = screenCtx;
      canvas.width = canvas.width;
      screenCtx.setTransform(canvas.width / viewWidth, 0, 0,
        canvas.height / viewHeight, 0, 0);
      screenCtx.translate(ox, oy); screenCtx.scale(scale, scale);
      screenCtx.fillStyle = '#10243a';
      screenCtx.fillRect(0, 0, WIDTH, HEIGHT);
      screenCtx.strokeStyle = '#6fd9ff';
      screenCtx.lineWidth = 3;
      screenCtx.strokeRect(CX - active.half, CY - active.half,
        active.half * 2, active.half * 2);
      if (match && match.audit) match.audit.noteGraphicsFallback(match.elapsed,
        String(error && error.message || error).slice(0, 90), false);
    }
    // Always ABOVE every environmental overlay and color mask.
    active.cubes.forEach(c => drawCube(c, time));
    active.impacts.forEach(drawImpact);
  }
  function frame(timestamp) {
    const frameMs = previous ? Math.max(0, timestamp - previous) : 0;
    const dt = Math.min(.05, frameMs / 1000);
    previous = timestamp;
    // If a low-end device cannot keep a responsive joystick while the wave
    // sweeps, disable only the transient chroma FX. Color/speed progression,
    // visible cube sprites and gameplay all continue unchanged.
    if (mode === 'running' && match) {
      // Unlike the previous version, quality adapts BEFORE the first color
      // transition, too. Persistently long frames indicate renderer/GPU
      // pressure whether or not the Chroma Tide is currently visible.
      if (frameMs > 65) slowFrameStreak++;
      else slowFrameStreak = Math.max(0, slowFrameStreak - 2);
      if (slowFrameStreak >= 8 && renderQuality > .56) {
        renderQuality = renderQuality > .85 ? .8 : .55;
        slowFrameStreak = 0;
        resize();
        match.audit.performance.qualityDrops++;
        match.audit.record('render_quality_drop', match.elapsed, {
          quality: renderQuality, backingWidth: canvas.width,
          backingHeight: canvas.height
        });
      }
      if (match.paletteFade > 0 && !tideDisabled) {
        if (frameMs > 75) tideSlowFrames++;
        else tideSlowFrames = Math.max(0, tideSlowFrames - 1);
        if (tideSlowFrames >= 4) {
          tideDisabled = true;
          match.audit.noteGraphicsFallback(match.elapsed,
            'wave reduced after repeated >75ms frames', true);
        }
      } else tideSlowFrames = 0;
    } else { slowFrameStreak = 0; tideSlowFrames = 0; }
    if (mode === 'running' && match) {
      accumulator = Math.min(.08, accumulator + dt);
      let iterations = 0;
      while (accumulator >= 1 / 120 && iterations++ < 9) {
        updateMatch(match, readInput(), 1 / 120);
        accumulator -= 1 / 120;
      }
      if (match.eventId !== lastEventId) {
        lastEventId = match.eventId;
        showAnnounce(match.event && match.event.includes('SPEED UP') ?
          'SPEED UP' : match.event, match.event && match.event.includes('SPEED UP') ? .85 : .72);
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
    const renderStart = performance.now();
    render(timestamp / 1000);
    if (mode === 'running' && match && match.audit) {
      match.audit.noteFrame(frameMs, performance.now() - renderStart);
    }
    window.requestAnimationFrame(frame);
  }
  setScreen('menu');
  window.requestAnimationFrame(frame);
})(typeof globalThis !== 'undefined' ? globalThis : this);
