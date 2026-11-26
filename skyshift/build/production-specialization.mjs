// Build-only specialization: the player-facing catalog is Vault-only.
// Preserve the actual shared material source and all historical source files.
// Fail closed when any audited source anchor changes, rather than rewriting
// arbitrary code or substituting a second renderer.
import assert from 'node:assert/strict';
export const retiredSceneryModules=Object.freeze([
  "signature-environment-v0180.mjs",
  "world-rebuild-v0190.mjs",
  "orbital-hero-v0192.mjs",
  "neon-interior-v0212-classic.mjs"
]);
const legacyInstallation=" if(envEnabled&&!rebirthEnabled)signatureEnvironment=installSignatureEnvironment(THREE,world,{\n  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt\n });\n // 0.20.5: full 3-chapter environment, without any new physical colliders.\n // world=classic retains the old 0.18 world for a fair A/B comparison.\n if(worldEnabled)cinematicWorld=installCinematicWorld(THREE,world,{\n  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt\n });\n // Pass 2: replace just the old simple 278m station with one sculpted,\n // selectively lit observatory; no scene-wide material/light adjustment.\n if(architectureEnabled)orbitalHero=installOrbitalHero(THREE,world,{\n  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt\n });\n // 0.20.5 World Art Pipeline: coherent, authored glTF station interior.\n // This replaces the old random arches/rings in rebirth mode; asset loading\n // is async and safe, but the old 120 Hz race motor stays authoritative.\n if(rebirthEnabled)stationWorld=sharedTunnelRuntime.installSkyline((THREE,world,sharedOptions)=>(premiumMetalEnabled?installPremiumMetalSurfaceLibrary:\n     localReflectionsEnabled?installTrueLocalReflectionsPass1:\n     trueMetalEnabled?installTrueMetalMaterialsPass2:\n     dualToneEnabled?installDualToneLightingPass1:\n     microMetalEnabled?installMicroSurfaceMetalDefinition:\n     darkMetalEnabled?installDarkMetallicFoundation:\n     surfaceCraftEnabled?installPremiumSurfaceCraftsmanship:\n     architecturalNeonEnabled?installArchitecturalNeonLighting:\n     unifiedTunnelEnabled?installUnifiedTunnelMaterials:\n     lightArchitectureEnabled?installCinematicLightArchitecture:\n    trueMaterialDepthEnabled?installTrueMaterialDepthRebuild:\n    physicalMaterialEnabled?installPhysicalMaterialRebuild:\n    cinematicNeonEnabled?installCinematicNeonLighting:\n    premiumMaterialRebirthEnabled?installPremiumMaterialRebirth:\n    cinematicMotionEnabled?installCinematicEnergyMotion:\n    integratedNeonFlowEnabled?installIntegratedNeonFlow:\n    structuralTunnelEnabled?installStructuralTunnelRebuild:\n   enclosedStationEnabled?\n  (tunnelMegaEnabled?(neonInteriorEnabled?\n    (tunnelSpectrumEnabled?(exteriorSealEnabled?installExteriorLightSeal:installNeonDrivenInterior):installClassicNeonInterior):\n    installTunnelMegastructure):\n   cinematicHeroEnabled?(cinematicGradeEnabled?installCinematicGradeHero:installCinematicHero):\n   architecturalRebirthEnabled?installArchitecturalWorldArt:\n   sculptedNeonEnabled?installSculptedNeonWorldArt:\n   premiumNeonEnabled?installPremiumNeonWorldArt:\n   graphiteGradeEnabled?installGraphiteWorldArt:\n   ribbonWindowsEnabled?installRibbonWindowArt:\n   observationWindowsEnabled?installObservationWorldArt:installEnclosedWorldArt):\n  installWorldArt)(THREE,world,sharedOptions),{\n  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt,\n  roadMaterial:exteriorSealEnabled?premiumSurface?.material:null,\n  vaultHeightClassic:new URLSearchParams(location.search).get(\"vaultHeight\")===\"classic\"\n });\n";
const exclusiveImports=[
  {
    "statement": "import {SIGNATURE_ENV_0180,installSignatureEnvironment}\n from \"./signature-environment-v0180.mjs\";",
    "spec": "./signature-environment-v0180.mjs",
    "bindings": [
      "SIGNATURE_ENV_0180",
      "installSignatureEnvironment"
    ]
  },
  {
    "statement": "import {WORLD_0190,installCinematicWorld}\n from \"./world-rebuild-v0190.mjs\";",
    "spec": "./world-rebuild-v0190.mjs",
    "bindings": [
      "WORLD_0190",
      "installCinematicWorld"
    ]
  },
  {
    "statement": "import {ORBITAL_HERO_0192,installOrbitalHero}\n from \"./orbital-hero-v0192.mjs\";",
    "spec": "./orbital-hero-v0192.mjs",
    "bindings": [
      "ORBITAL_HERO_0192",
      "installOrbitalHero"
    ]
  },
  {
    "statement": "import {installNeonDrivenInterior as installClassicNeonInterior}\n from \"./neon-interior-v0212-classic.mjs\";",
    "spec": "./neon-interior-v0212-classic.mjs",
    "bindings": [
      "installClassicNeonInterior"
    ]
  }
];
function replaceExact(s,before,after,label){
 assert.equal(s.split(before).length-1,1,label+' exact source anchor');
 return s.replace(before,after);
}
export function specializeVaultScenery(source){
 let s=replaceExact(source,legacyInstallation,' // Legacy Skyline scenery is available only in the source comparison entry.\n','legacy Skyline installation');
 s=replaceExact(s,'const envEnabled=!isVault()&&new URLSearchParams(location.search).get("env")!=="classic";','const envEnabled=false;','Vault-only scenery gate');
 for(const item of exclusiveImports){
  s=replaceExact(s,item.statement+'\n','','exclusive legacy import '+item.spec);
  for(const name of item.bindings)assert.ok(!new RegExp('\\b'+name+'\\b').test(s),'Remaining legacy binding '+name);
 }
 return s;
}
