// Build-only specialization: the player-facing catalog is Vault-only.
// Preserve the actual shared material source and all historical source files.
// Fail closed when any audited source anchor changes, rather than rewriting
// arbitrary code or substituting a second renderer.
import assert from 'node:assert/strict';
export const retiredSceneryModules=Object.freeze([
  "signature-environment-v0180.mjs",
  "world-rebuild-v0190.mjs",
  "orbital-hero-v0192.mjs",
  "tunnel/neon-interior-v0212-classic.mjs"
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
    "statement": "import {installNeonDrivenInterior as installClassicNeonInterior}\n from \"./tunnel/neon-interior-v0212-classic.mjs\";",
    "spec": "./tunnel/neon-interior-v0212-classic.mjs",
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

 // Classic Vault 0.27.x was a separate renderer, not reusable flight geometry.
 // Its source and comparison entry stay byte-identical; production only
 // uses the verified configured renderer and reports an explicit boot error
 // rather than silently reverting to an old visual implementation.
export const retiredTunnelModules=Object.freeze([
  "tracks/vault/full-tunnel-circuit-v0270.mjs",
  "tracks/vault/vault-material-parity-v0271.mjs",
  "tracks/vault/vault-architectural-parity-v0272.mjs",
  "tracks/vault/vault-full-lighting-v0273.mjs",
  "tracks/vault/vault-premium-finish-v0274.mjs"
]);
export const comparisonOnlyWorldAssets=Object.freeze([
  "assets/worlds/continuum-architecture-v7.gltf",
  "assets/worlds/continuum-bays-v1.gltf",
  "assets/worlds/continuum-enclosure-bays-v2.gltf",
  "assets/worlds/continuum-graphite-bays-v5.gltf",
  "assets/worlds/continuum-neon-bays-v5.gltf",
  "assets/worlds/continuum-neon-sculpted-v6.gltf",
  "assets/worlds/continuum-observation-bays-v3.gltf",
  "assets/worlds/continuum-ribbon-bays-v4.gltf"
]);
const classicGameImports=[
  {
    "statement": "import {FULL_TUNNEL_0270,installFullTunnelCircuit0270}\n from \"./tracks/vault/full-tunnel-circuit-v0270.mjs\";",
    "spec": "./tracks/vault/full-tunnel-circuit-v0270.mjs",
    "bindings": [
      "FULL_TUNNEL_0270",
      "installFullTunnelCircuit0270"
    ]
  },
  {
    "statement": "import {VAULT_MATERIAL_PARITY_0271,installVaultMaterialParity0271}\n from \"./tracks/vault/vault-material-parity-v0271.mjs\";",
    "spec": "./tracks/vault/vault-material-parity-v0271.mjs",
    "bindings": [
      "VAULT_MATERIAL_PARITY_0271",
      "installVaultMaterialParity0271"
    ]
  },
  {
    "statement": "import {VAULT_ARCHITECTURE_0272,installVaultArchitectureParity0272}\n from \"./tracks/vault/vault-architectural-parity-v0272.mjs\";",
    "spec": "./tracks/vault/vault-architectural-parity-v0272.mjs",
    "bindings": [
      "VAULT_ARCHITECTURE_0272",
      "installVaultArchitectureParity0272"
    ]
  },
  {
    "statement": "import {VAULT_LIGHTING_0273,installVaultFullLighting0273}\n from \"./tracks/vault/vault-full-lighting-v0273.mjs\";",
    "spec": "./tracks/vault/vault-full-lighting-v0273.mjs",
    "bindings": [
      "VAULT_LIGHTING_0273",
      "installVaultFullLighting0273"
    ]
  },
  {
    "statement": "import {VAULT_PREMIUM_FINISH_0274} from \"./tracks/vault/vault-premium-finish-v0274.mjs\";",
    "spec": "./tracks/vault/vault-premium-finish-v0274.mjs",
    "bindings": [
      "VAULT_PREMIUM_FINISH_0274"
    ]
  }
];
const classicRuntimeImports=[
  {
    "statement": "import {installFullTunnelCircuit0270}\n from \"../tracks/vault/full-tunnel-circuit-v0270.mjs\";",
    "spec": "../tracks/vault/full-tunnel-circuit-v0270.mjs",
    "bindings": [
      "installFullTunnelCircuit0270"
    ]
  },
  {
    "statement": "import {installVaultMaterialParity0271}\n from \"../tracks/vault/vault-material-parity-v0271.mjs\";",
    "spec": "../tracks/vault/vault-material-parity-v0271.mjs",
    "bindings": [
      "installVaultMaterialParity0271"
    ]
  },
  {
    "statement": "import {installVaultArchitectureParity0272}\n from \"../tracks/vault/vault-architectural-parity-v0272.mjs\";",
    "spec": "../tracks/vault/vault-architectural-parity-v0272.mjs",
    "bindings": [
      "installVaultArchitectureParity0272"
    ]
  },
  {
    "statement": "import {installVaultFullLighting0273}\n from \"../tracks/vault/vault-full-lighting-v0273.mjs\";",
    "spec": "../tracks/vault/vault-full-lighting-v0273.mjs",
    "bindings": [
      "installVaultFullLighting0273"
    ]
  }
];
export function specializeVaultGame(source){
 let s=specializeVaultScenery(source);
 for(const item of classicGameImports){
  s=replaceExact(s,item.statement+'\n','','classic tunnel metadata import '+item.spec);
  // Preserve the diagnostics schema, but a retired comparison renderer
  // has no active production profile. Actual active shared audits remain.
  s=replaceExact(s,'isVault()?'+item.bindings[0]+':null','null','retired profile '+item.bindings[0]);
  for(const name of item.bindings)assert.ok(!new RegExp('\\b'+name+'\\b').test(s),'Remaining classic binding '+name);
 }
 return s;
}
export function specializeVaultTunnelRuntime(source){
 let s=source;
 for(const item of classicRuntimeImports)s=replaceExact(s,item.statement+'\n','','classic tunnel runtime import '+item.spec);
 s=replaceExact(s,"import {installTrueSharedTunnelRenderer0281,installConfiguredSharedTunnel}\n from \"./true-shared-tunnel-renderer-v0281.mjs\";","import {installConfiguredSharedTunnel}\n from \"./true-shared-tunnel-renderer-v0281.mjs\";",'configured shared renderer only');
 s=replaceExact(s,"  trueShared=enabled&&policy?installConfiguredSharedTunnel(THREE,world,{\n   track,positionAt,trackLength,lowMemory,policy,omitLegacyRoadResponse,sections:plan.intervals\n  }):installTrueSharedTunnelRenderer0281(THREE,world,{\n   track,positionAt,trackLength,lowMemory,enabled,omitLegacyRoadResponse\n  });\n","  if(!enabled||!policy)throw Error(\"EF05 production requires the configured shared tunnel\");\n  trueShared=installConfiguredSharedTunnel(THREE,world,{\n   track,positionAt,trackLength,lowMemory,policy,omitLegacyRoadResponse,sections:plan.intervals\n  });\n  if(!trueShared.active)throw Error(\"EF05 production shared tunnel unavailable: \"+(trueShared.stats?.().reason??\"unknown\"));\n",'configured install only');
 s=replaceExact(s,"  if(track!==\"vault\"||trueShared?.active)return vault={\n\n   foundation:stopped,material:stopped,architecture:stopped,\n   lighting:stopped\n  };\n  // 0.27.0–0.27.4 originally approved production renderers, not second\n  // copied implementations. The same geometry, fixtures, road and ship.\n  const foundation=installFullTunnelCircuit0270(THREE,world,{\n   track,positionAt,lowMemory,enabled:foundationEnabled,\n   reliefLighting:architectureEnabled\n  });\n  const material=installVaultMaterialParity0271(THREE,world,{\n   track,lowMemory,enabled:materialEnabled,foundation\n  });\n  const architecture=installVaultArchitectureParity0272(THREE,world,{\n   track,lowMemory,positionAt,enabled:architectureEnabled,\n   foundation,materialParity:material\n  });\n  const lighting=installVaultFullLighting0273(THREE,world,{\n   track,lowMemory,positionAt,enabled:lightingEnabled,\n   foundation,architecture,materialParity:material,\n   finishEnabled\n  });\n  return vault={foundation,material,architecture,lighting};\n }\n","  if(!trueShared?.active)throw Error(\"EF05 production cannot use a retired classic tunnel\");\n  return vault={foundation:stopped,material:stopped,architecture:stopped,lighting:stopped};\n }\n",'retired classic fallback');
 for(const item of classicRuntimeImports)for(const name of item.bindings)assert.ok(!new RegExp('\\b'+name+'\\b').test(s),'Remaining classic installer '+name);
 assert.ok(!s.includes('installTrueSharedTunnelRenderer0281'),'alternate historical entrypoint');
 return s;
}
