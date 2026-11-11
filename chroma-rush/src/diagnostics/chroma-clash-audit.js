/* CHROMA CLASH · Run Audit 1.0
 * Local, deterministic, no telemetry upload and no touch coordinates.
 * Event/snapshot budgets protect memory on long mobile sessions.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ChromaClashAudit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const BUILD = 'chroma-clash-1.4-rendering-flow';
  const MAX_EVENTS = 600;
  const MAX_SAMPLES = 300;
  const num = x => Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0;
  const flat = (cube, { detailed = false } = {}) => ({
    id: cube.id, name: cube.name, alive: !!cube.alive,
    x: num(cube.x), y: num(cube.y),
    ...(detailed ? {
      vx: num(cube.vx), vy: num(cube.vy),
      knockVx: num(cube.knockVx || 0), knockVy: num(cube.knockVy || 0)
    } : {})
  });

  class ClashRunAudit {
    constructor(seed) {
      this.seed = seed;
      this.events = [];
      this.samples = [];
      this.eventOverflow = 0;
      this.sampleOverflow = 0;
      this.nextSampleAt = 2;
      this.ended = false;
      this.totalContacts = 0;
      this.strongContacts = 0;
      this.maxImpact = 0;
      this.impactsById = [0, 0, 0, 0];
      this.takenById = [0, 0, 0, 0];
      this.ringBreaks = 0;
      this.zoneChanges = 0;
      this.performance = {
        frames: 0, slowFrames50ms: 0, severeFrames100ms: 0,
        worstFrameMs: 0, renderSamples: 0, worstRenderMs: 0,
        rendererFallbacks: 0, adaptiveTideDisables: 0,
        qualityDrops: 0, sceneBuilds: 0, basePixelBudget: 750000
      };
      this.eliminations = [];
      this.record('start', 0, { arenaHalf: 198, playerId: 0, opponents: 3 });
    }
    record(type, time, fields = {}) {
      if (this.ended) return;
      const event = { time: num(time), type, ...fields };
      if (this.events.length < MAX_EVENTS) this.events.push(event);
      else this.eventOverflow++;
    }
    noteFrame(frameMs, renderMs) {
      const p = this.performance;
      p.frames++;
      if (frameMs > 50) p.slowFrames50ms++;
      if (frameMs > 100) p.severeFrames100ms++;
      p.worstFrameMs = Math.max(p.worstFrameMs, frameMs);
      p.renderSamples++;
      p.worstRenderMs = Math.max(p.worstRenderMs, renderMs);
    }
    noteGraphicsFallback(time, reason, adaptive) {
      if (adaptive) this.performance.adaptiveTideDisables++;
      else this.performance.rendererFallbacks++;
      this.record('graphics_fallback', time, { adaptive: !!adaptive, reason });
    }
    noteContact(time, a, b, impulse, attacker, target, edgeDistance) {
      this.totalContacts++;
      this.maxImpact = Math.max(this.maxImpact, impulse);
      if (impulse >= 170) this.strongContacts++;
      if (Number.isInteger(attacker) && Number.isInteger(target)) {
        this.impactsById[attacker]++;
        this.takenById[target]++;
      }
      this.record('collision', time, {
        cubes: [a.id, b.id],
        attacker, target,
        impulse: num(impulse),
        point: { x: num((a.x + b.x) / 2), y: num((a.y + b.y) / 2) },
        distanceToEdge: num(-edgeDistance),
        nearEdge: edgeDistance > -42
      });
    }
    noteElimination(time, cube, credit, cause, context = {}) {
      const entry = {
        cubeId: cube.id, creditedTo: credit, cause,
        position: { x: num(cube.x), y: num(cube.y) },
        totalVelocity: {
          x: num(cube.vx + (cube.knockVx || 0)),
          y: num(cube.vy + (cube.knockVy || 0))
        },
        zone: context.zone, stage: context.stage,
        edgeDistance: num(context.edgeDistance), speedCap: context.speedCap
      };
      this.eliminations.push({ time: num(time), ...entry });
      this.record('elimination', time, entry);
    }
    sample(match) {
      if (match.elapsed + 1e-8 < this.nextSampleAt) return;
      const snapshot = {
        time: num(match.elapsed),
        zone: match.zone + 1,
        stage: match.stage,
        arenaHalf: num(match.half),
        alive: match.cubes.filter(c => c.alive).length,
        cubes: match.cubes.map(c => flat(c, { detailed: true }))
      };
      if (this.samples.length < MAX_SAMPLES) this.samples.push(snapshot);
      else this.sampleOverflow++;
      this.nextSampleAt += 2;
    }
    finish(match) {
      if (this.ended) return;
      this.record('match_end', match.elapsed, {
        outcome: match.outcome, winnerId: match.winner
      });
      this.ended = true;
    }
    snapshot(match) {
      return {
        schema: 'chroma-clash-run-audit/1.0',
        build: BUILD,
        matchSeed: this.seed,
        status: this.ended ? 'completed' : 'in_progress',
        summary: {
          durationSeconds: num(match.elapsed),
          highestZone: match.zone + 1,
          arenaCollapses: this.ringBreaks,
          finalArenaHalf: num(match.half),
          aliveCount: match.cubes.filter(c => c.alive).length,
          result: this.ended ? match.outcome : 'in_progress',
          winnerId: this.ended ? match.winner : null,
          collisionCount: this.totalContacts,
          strongCollisions: this.strongContacts,
          strongestImpulse: num(this.maxImpact),
          impactsDealtByCube: this.impactsById.slice(),
          impactsTakenByCube: this.takenById.slice(),
          eliminations: this.eliminations.map(e => ({ ...e })),
          zoneTransitions: this.zoneChanges,
          performance: {
            ...this.performance,
            worstFrameMs: num(this.performance.worstFrameMs),
            worstRenderMs: num(this.performance.worstRenderMs)
          },
          playerKnockouts: match.cubes[0].knocks,
          players: match.cubes.map(c => ({ ...flat(c), color: c.color, knockouts: c.knocks }))
        },
        events: this.events.map(e => ({ ...e })),
        samples: this.samples.map(e => ({
          ...e, cubes: e.cubes.map(c => ({ ...c }))
        })),
        limits: {
          maxEvents: MAX_EVENTS, droppedEvents: this.eventOverflow,
          maxSamples: MAX_SAMPLES, droppedSamples: this.sampleOverflow
        },
        privacy: 'On-device only; no touch coordinates, names, identifiers, or network telemetry'
      };
    }
  }
  return { ClashRunAudit, BUILD, MAX_EVENTS, MAX_SAMPLES };
});
