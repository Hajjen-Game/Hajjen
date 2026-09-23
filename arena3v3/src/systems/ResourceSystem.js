import { clamp } from "../core/utils.js";

export class ResourceSystem {
  update(actor, deltaMs) {
    if (!actor.alive || actor.resource.max <= 0 || actor.resource.regenPerSecond <= 0) return;

    actor.resource.value = clamp(
      actor.resource.value + actor.resource.regenPerSecond * (deltaMs / 1000),
      0,
      actor.resource.max,
    );
  }

  costFor(spell) {
    return Math.max(0, spell.resourceCost || 0);
  }

  canPay(actor, spell) {
    return actor.resource.value + 0.0001 >= this.costFor(spell);
  }

  spend(actor, spell) {
    const cost = this.costFor(spell);
    if (cost <= 0) return true;
    if (!this.canPay(actor, spell)) return false;
    actor.resource.value = clamp(actor.resource.value - cost, 0, actor.resource.max);
    return true;
  }

  gain(actor, amount) {
    if (!amount || actor.resource.max <= 0) return;
    actor.resource.value = clamp(actor.resource.value + amount, 0, actor.resource.max);
  }
}
