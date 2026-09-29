function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function createHealthPresentation(actualPct, nowMs = performance.now()) {
  const pct = clamp01(actualPct);

  return {
    actualPct: pct,
    displayPct: pct,
    trailPct: pct,
    damageHoldUntilMs: 0,
    healFlashStartedAtMs: 0,
    healFlashUntilMs: 0,
    healFromPct: pct,
    healToPct: pct,
    healFlashAlpha: 0,
    lastUpdateMs: nowMs,
  };
}

export function updateHealthPresentation(
  state,
  actualPct,
  nowMs = performance.now(),
  options = {},
) {
  const pct = clamp01(actualPct);
  const previousActual = clamp01(state.actualPct);
  const dtMs = Math.max(0, Math.min(80, nowMs - (state.lastUpdateMs ?? nowMs)));

  const smoothMs = Math.max(1, options.smoothMs ?? 70);
  const damageHoldMs = Math.max(0, options.damageHoldMs ?? 220);
  const trailCatchupMs = Math.max(1, options.trailCatchupMs ?? 145);
  const healFlashMs = Math.max(1, options.healFlashMs ?? 190);
  const epsilon = options.epsilon ?? 0.0005;

  if (pct < previousActual - epsilon) {
    state.trailPct = Math.max(
      clamp01(state.trailPct),
      clamp01(state.displayPct),
      previousActual,
    );
    state.damageHoldUntilMs = nowMs + damageHoldMs;
  } else if (pct > previousActual + epsilon) {
    state.healFromPct = Math.min(previousActual, pct);
    state.healToPct = pct;
    state.healFlashStartedAtMs = nowMs;
    state.healFlashUntilMs = nowMs + healFlashMs;

    // Healing gets its own light flash. Do not create a red damage trail in
    // the newly gained segment; any genuine older damage trail can remain.
  }

  state.actualPct = pct;

  const smoothAlpha = dtMs > 0
    ? 1 - Math.exp(-dtMs / smoothMs)
    : 0;
  state.displayPct += (pct - state.displayPct) * smoothAlpha;

  if (Math.abs(state.displayPct - pct) < 0.0008) {
    state.displayPct = pct;
  }

  state.displayPct = clamp01(state.displayPct);

  if (nowMs > state.damageHoldUntilMs) {
    const trailTarget = Math.max(pct, state.displayPct);
    const trailAlpha = dtMs > 0
      ? 1 - Math.exp(-dtMs / trailCatchupMs)
      : 0;

    state.trailPct += (trailTarget - state.trailPct) * trailAlpha;

    if (Math.abs(state.trailPct - trailTarget) < 0.0008) {
      state.trailPct = trailTarget;
    }
  }

  state.trailPct = clamp01(Math.max(state.trailPct, state.displayPct));

  if (nowMs < state.healFlashUntilMs) {
    const progress = clamp01(
      (nowMs - state.healFlashStartedAtMs) / healFlashMs,
    );
    const fade = 1 - progress;
    state.healFlashAlpha = fade * fade;
  } else {
    state.healFlashAlpha = 0;
  }

  state.lastUpdateMs = nowMs;
  return state;
}
