// Project Energy — companion behavior preferences. Pure, save-safe data:
// styles modify AI decisions, NEVER hidden HP/damage multipliers.
export const STYLE_UNLOCK_STAGE=5;
export const COMPANION_STYLES=Object.freeze({
  balanced:Object.freeze({id:"balanced",name:"Balanced",short:"Adapts to the battle",
    description:"Balances pressure, rescue and positioning. This is the recommended default."}),
  aggressive:Object.freeze({id:"aggressive",name:"Aggressive",short:"Focus fire and chase openings",
    description:"Follows your selected enemy, seeks exposed targets and presses closer. Emergency healing is never ignored."}),
  protective:Object.freeze({id:"protective",name:"Protective",short:"Prioritizes team survival",
    description:"Peels attackers off vulnerable teammates, reacts earlier with shields and healing, and maintains safer positioning."}),
  disruptive:Object.freeze({id:"disruptive",name:"Disruptive",short:"Stops dangerous enemy actions",
    description:"Tracks hostile casts, prioritizes interrupts and control, and targets dangerous Channelers. Uses only equipped spells."})
});
export const STYLE_IDS=Object.freeze(Object.keys(COMPANION_STYLES));
export const STYLE_ROLES=Object.freeze(["healer","melee","caster"]);
export const DEFAULT_COMPANION_STYLES=Object.freeze({
  healer:"balanced",melee:"balanced",caster:"balanced"
});
export function normalizeCompanionStyles(value){
  const safe={...DEFAULT_COMPANION_STYLES};
  if(value&&typeof value==="object")
    for(const role of STYLE_ROLES)
      if(STYLE_IDS.includes(value[role]))safe[role]=value[role];
  return safe;
}
export function companionStyleFor(journey,role){
  if(!journey||!(role in DEFAULT_COMPANION_STYLES))return "balanced";
  if((journey.clears||0)<STYLE_UNLOCK_STAGE&&journey.devTest!==true)return "balanced";
  return normalizeCompanionStyles(journey.companionStyles)[role];
}
export function setCompanionStyle(profile,role,style){
  const journey=profile?.journey;
  if(!journey||journey.version!==2||journey.clears<STYLE_UNLOCK_STAGE)
    throw Error("AI Styles unlock after clearing Stage 5.");
  if(!(role in DEFAULT_COMPANION_STYLES)||!STYLE_IDS.includes(style))
    throw Error("Unknown AI style or companion.");
  return {...profile,journey:{...journey,companionStyles:{
    ...normalizeCompanionStyles(journey.companionStyles),[role]:style
  }}};
}
