// SKYSHIFT 0.15.1 — safe-versus-risk lane rewards, using the original 120Hz boost solver.
// No steer assists, new colliders, or new physics integration. Pad groups prevent
// players from picking both SAFE and RISK boosts on one gate on the same lap.
export const BOOST_CONFIG=Object.freeze({
 multiplier:1.40,
 durationSeconds:.92,
 attackSeconds:.15,
 releaseSeconds:.23,
 padHalfWidthMeters:4.6,
 colorHex:0xffbe62
});
import {BOOST_CHOICES_0160,RACE_BOOST_CHOICES_0160,
 riskChoiceAt,RISK_REWARD_0160} from "./risk-reward-v0160.mjs";
export const BOOST_PADS=BOOST_CHOICES_0160;
export const RACE_BOOST_PADS=RACE_BOOST_CHOICES_0160;
import {createGroupedBoostAPI} from "./grouped-boost.mjs";
export const {clamp,boostPadAt,initBoostState,boostedSpeedAt,stepBoostState}=createGroupedBoostAPI(BOOST_CONFIG,riskChoiceAt);
