import {COLOR_WAVE_ACTIVE,COLOR_WAVE_PALETTES} from "./core/zone-wave.mjs";
import {buildMantaVisualRebirth,MANTA_REBIRTH} from "./ships/manta-visual-rebirth.mjs";
import {installTrueVelocityMotionBlur} from "./rendering/true-velocity-motion-blur.mjs";
import {readVelocityExperience,saveVelocityExperience,adaptiveVelocityFov,horizontalFov} from "./core/velocity-experience-settings.mjs";
import {readAdvancedGpu,saveAdvancedGpu,resolveBloomScale} from "./core/advanced-gpu-settings.mjs";
import {createTunnelOcclusion} from "./rendering/conservative-tunnel-occlusion.mjs";
import {createDistantDetailLod} from "./rendering/distant-detail-lod.mjs";
import {readPerformance,savePerformance,createPresentationGate} from "./core/smart-performance.mjs";
import {createTrackSectionVisibility} from "./rendering/track-section-visibility.mjs";
import * as THREE from "three";
import {VAULT_MEGA_JUMP,VAULT_MEGA_JUMP_ACTIVE,VAULT_JUMP_POLISH_ACTIVE,VAULT_COMPACT_ACTIVE,VAULT_SMART_ACTIVE,VAULT_ADVANCED_GPU_ACTIVE,VAULT_VELOCITY_ACTIVE,VAULT_EXTREME_BLUR_ACTIVE,VAULT_TRUE_BLUR_ACTIVE,VAULT_MANTA_REBIRTH_ACTIVE,VAULT_JUMP_VERSION,chamberProfileAt} from "./tracks/vault/vault-mega-jump.mjs";
import {createTunnelProfileSampler} from "./tunnel/profile-sampler.mjs";
import {createRaceLifecycle} from "./core/race-lifecycle.mjs";
import {createRaceCountdown} from "./core/race-countdown.mjs";
import {createRuntimeLifetime} from "./core/runtime-lifetime.mjs";
import {collectObjectResources,releaseResourceDifference} from "./core/resource-ownership.mjs";
import {installFlightTuningPanel,installRaceQa} from "./qa/race-probes.mjs";
import {clearRaceInput,installRaceInput} from "./ui/race-input.mjs";
import {createRaceHud} from "./ui/race-hud.mjs";
import {createRunAudit,createRaceTelemetry,downloadRaceAudit} from "./core/race-diagnostics.mjs";
import {createChaseCameraController} from "./flight/chase-camera-controller.mjs";
import {createShipPresentation} from "./ships/ship-presentation.mjs";
import {TRACKS_0160,ACTIVE_TRACK_0160,TRACK_ID_0160,isAurora,isVault}
 from "./tracks/shared/track-selection-v0160.mjs";
import {perfConfig as readPerfConfig,newPerfMonitor,resetPerfMonitor,recordPerfFrame,perfSummary,gpuTimer as createGpuTimer,createEnduranceAudit} from "./core/performance-audit-v0114.mjs";
import {
 TRIAL,COURSE_SEGMENTS,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,ARCHES,CHECKPOINTS,SECTORS,ROAD_CUES,poseAt,positionAt,createStaticPositionSampler,headingAt,curvatureAt,bankAt,bankDegreesAt,surfaceHeightAt,surfaceNormalAt,
 heightAt,widthAt,gapAt,roadIntervals,onRoad,sectorAt,speedAt,nextGap,gradeAt,pitchAt,TRACK_3D,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,AIR_TRICKS,GRIP_APEX,PROJECTION_083,STEERING_AUTHORITY,steeringBalanceAt,normalYawFactorAt,elevationAudit,
 newFlightState,stepFlight,setZoneSpeedStage,CIRCUIT,circuitPlanSummary,clamp,lerp,SPEED_PROFILE,velocityPresentationRatio
} from "./tracks/trials/trial-v0165.mjs";
import { BOOST_PADS,BOOST_CONFIG } from "./flight/boost/boost-v0160.mjs";
import {RISK_REWARD_0160,RHYTHM_GATES_0160,riskCueAt,
 VAULT_BOOST_0283_ACTIVE} from "./flight/boost/risk-reward-v0160.mjs";
import { createPremiumDeckGeometry,PREMIUM_TRACK } from "./rendering/road/premium-track-v0160.mjs";
import {FIDELITY_0114,createFidelityDirector,
 resetFidelityDirector,advanceFidelityDirector,fidelityAudit,
 createSmartPremiumTrackMaterial} from "./core/visual-fidelity-v0160.mjs";
import {SHADOW_TUNNEL,inShadowTunnel,tunnelIntensityAt,installShadowTunnel,
 installTunnelRoadShading} from "./tunnel/shadow-tunnel-v0160.mjs";
import {TUNNEL_BLACKOUT,installBlackoutRoadShading,
 separateBladeTipMaterial,createTunnelBlackoutController}
 from "./tunnel/tunnel-blackout-v0160.mjs";
import {UNIFIED_TUNNEL_LIGHTING_1,createUnifiedTunnelLightingController}
 from "./tunnel/unified-tunnel-lighting-v1.mjs";
import {ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave,frontPaletteBlend,waveResonanceStrength,spectralChargeStrength,horizonWaveCue} from "./core/zone-wave-v060.mjs";
import {vaultSpatialWaveEnabled0285,waveSignedGlobal0285,createSinglePassWaveView02899,
 VAULT_WAVE_PARITY_0285} from "./tunnel/vault-spatial-wave-parity-v0285.mjs";
import {STABILITY_0286,reflectionStabilityEnabled0286}
 from "./tunnel/reflection-stability-strips-v0286.mjs";
import {ARCH_FOOT_0287,archFootRelease0287}
 from "./tunnel/arch-foot-light-assembly-v0287.mjs";
import {PRECISION_NEON_0288,precisionNeonEnabled0288}
 from "./tunnel/precision-neon-response-v0288.mjs";
import {CINEMATIC_METAL_0289,cinematicMetalEnabled0289,
 cinematicComponentEnabled0289}
 from "./rendering/cinematic-metal-neon-v0289.mjs";
import {CURVE_CONTINUITY_02896,surfaceContinuityEnabled02896,
 installCurveSurfaceContinuity02896}
 from "./tunnel/curve-surface-continuity-v02896.mjs";
import {ROAD_SPILL_COVE_02895,roadSpillEnabled02895,
 coveWaveEnabled02895}
 from "./tunnel/road-spill-wave-coves-v02895.mjs";
import {UNIFIED_SOURCES_02894,unifiedSourcesEnabled02894,
 cleanLegacyRoadEnabled02894,ceilingRoadEnabled02894,
 installLegacyRoadCleanup02894}
 from "./tunnel/unified-tunnel-light-sources-v02894.mjs";
import {ARCH_OPTICS_02893,archOpticsEnabled02893,archRoadEnabled02893,
 diagnosticLegacyRoadOverlay02893}
 from "./tunnel/premium-arch-optics-v02893.mjs";
import {CEILING_FIXTURE_02892,ceilingFixtureEnabled02892}
 from "./tunnel/ceiling-fixture-cohesion-v02892.mjs";
import {STRAIGHT_EDGE_PARITY_02891,straightParityEnabled02891,
 vaultStraightRanges02891}
 from "./tunnel/shared-straight-edge-parity-v02891.mjs";
import {MANTA_IDENTITY,ENGINE_SOCKETS,buildMantaWings} from "./ships/manta-blade-v0484.mjs";
import {buildPremiumMantaBlade,MANTA_POLISH} from "./ships/manta-blade-v0103.mjs";
import {buildStingrayEvo,STINGRAY_EVO} from "./ships/stingray-evo-v01342.mjs";
import {FLEET,FLEET_VERSION,readFleet,saveFleet,equipFleet,
 isFleetUnlocked,recordFleetClear,fleetStatus} from "./ships/fleet-v010.mjs";
import { makeFullscreenController } from "./ui/fullscreen-v02.mjs";
import { createTwinEngineFX,ENGINE_TRAIL_SPEC } from "./ships/engine-trails-v01346.mjs";
import { createNeonPipeline,createNeonKit,NEON_TUNING } from "./rendering/neon-v0111.mjs";
import { MESH_SPEC } from "./tracks/shared/smooth-track-v0160.mjs";
import {OPT_0111,newHudBudget,createDomWriteCache} from "./core/render-optimizer-v0111.mjs";
import {createUnifiedFlightRig,resetUnifiedFlightRig,advanceUnifiedFlightRig,
 unifiedFlightAudit} from "./flight/unified-flight-v0165.mjs";
import {
  PACING,createFrameMonitor,observeFrame,monitorSummary,
  createAdaptiveQuality,nextAdaptiveRatio
} from "./core/frame-pacing-v0112.mjs";
import {createRaceSimulation,resetRaceSimulation,advanceRaceSimulation,snapRacePose,
 raceRenderPose,readRaceInput,raceOutcome} from "./core/race-simulation.mjs";
import { MOTION_DEFAULTS,createFlightMotionState } from "./flight/flight-motion-v0112.mjs";
import {SIGNATURE_FLIGHT,createSignatureFlightState,
 triggerSignatureJump,triggerSignatureLanding,triggerSignatureBoost,
 signatureFlightAudit} from "./flight/signature-flight-v091.mjs";
import { CINEMATIC_DEFAULTS,createCinematicState,chasePose,cameraBankAt,cinematicFov,engineLightFactor } from "./flight/cinematic-v0165.mjs";
import {BOOST_SPRING,createBoostSpringState,triggerBoostSpring,stepBoostSpring,boostFovTarget,boostFovResponse} from "./flight/boost-spring-v090.mjs";
import {BOOST_SPRING as CLASSIC_BOOST_FOV} from "./flight/boost/boost-spring-v0495.mjs";
import {VELOCITY_SPEC,createVelocityState,igniteVelocity,stepVelocityState} from "./rendering/velocity-language-v0496.mjs";
import {KINETIC_CAMERA,kineticFovAt,createKineticCameraState,
 triggerKineticLanding,kineticCameraAudit}
 from "./flight/kinetic-camera-v090.mjs";
import { installAeroBarriers,AERO_BARRIER } from "./tracks/barriers/aero-barrier-v0165.mjs";
import { installSpaceBackdrop } from "./world/space-v0496.mjs";
import {SIGNATURE_ENV_0180,installSignatureEnvironment}
 from "./world/signature-environment-v0180.mjs";
import {WORLD_0190,installCinematicWorld}
 from "./world/world-rebuild-v0190.mjs";
import {ORBITAL_HERO_0192,installOrbitalHero}
 from "./world/orbital-hero-v0192.mjs";
import {WORLD_ART_0200,installWorldArt}
 from "./world/environment-art-pipeline-v0200.mjs";
import {WORLD_ART_0201,installWorldArt as installEnclosedWorldArt}
 from "./world/environment-art-pipeline-v0201.mjs";
import {WORLD_ART_0202,installWorldArt as installObservationWorldArt}
 from "./world/environment-art-pipeline-v0202.mjs";
import {WORLD_ART_02021,installWorldArt as installRibbonWindowArt}
 from "./world/environment-art-pipeline-v02021.mjs";
import {WORLD_ART_0203,installWorldArt as installGraphiteWorldArt}
 from "./world/environment-art-pipeline-v0203.mjs";
import {WORLD_ART_0204,installWorldArt as installPremiumNeonWorldArt}
 from "./world/environment-art-pipeline-v0204.mjs";
import {WORLD_ART_02041,installWorldArt as installSculptedNeonWorldArt}
 from "./world/environment-art-pipeline-v02041.mjs";
import {WORLD_ART_0205,installWorldArt as installArchitecturalWorldArt}
 from "./world/environment-art-pipeline-v0205.mjs";
import {HERO_0210,installCinematicHero}
 from "./rendering/cinematic-hero-v0210.mjs";
import {CINEMATIC_GRADE_0210B,installCinematicGradeHero}
 from "./rendering/cinematic-grade-v0210b.mjs";
import {TUNNEL_MEGA_0211,installTunnelMegastructure}
 from "./tunnel/tunnel-megastructure-v0211.mjs";
import {FULL_TUNNEL_0270,installFullTunnelCircuit0270}
 from "./tracks/vault/full-tunnel-circuit-v0270.mjs";
import {VAULT_MATERIAL_PARITY_0271,installVaultMaterialParity0271}
 from "./tracks/vault/vault-material-parity-v0271.mjs";
import {VAULT_ARCHITECTURE_0272,installVaultArchitectureParity0272}
 from "./tracks/vault/vault-architectural-parity-v0272.mjs";
import {VAULT_LIGHTING_0273,installVaultFullLighting0273}
 from "./tracks/vault/vault-full-lighting-v0273.mjs";
import {VAULT_PREMIUM_FINISH_0274} from "./tracks/vault/vault-premium-finish-v0274.mjs";
import {TUNNEL_SHARED_ARCHITECTURE_0280,tunnelReleaseAtLeast0280,sharedTunnelVersionActive0280}
 from "./tunnel/shared-tunnel-architecture-v0280.mjs";
import {createSharedTunnelRuntime0280}
 from "./tunnel/shared-tunnel-runtime-v0280.mjs";
import {omitLegacyRoadResponseEF05,startupSamplerEnabled02897} from "./tunnel/true-shared-tunnel-renderer-v0281.mjs";
import {SHARED_LIGHT_0282} from "./tunnel/shared-road-ship-light-v0282.mjs";
import {createSharedOpticalContext,installSharedOpticalShip,installSharedRoadOptics,finalizeSharedOptics} from "./tunnel/shared-optical-assembly.mjs";
import {surfaceFinishEnabled02898,vaultPolishEnabled02899,curveDeckCleanupEnabled028910,authoritativeDeckEnabled028911,PRODUCTION_TRACK} from "./tracks/shared/production-catalog.mjs";
import {PMREM_0284,readPmremRelease0284}
 from "./tunnel/pmrem-reflection-pipeline-v0284.mjs";
import {VAULT_LIGHT_SEAL_0270,vaultLightLevels0270}
 from "./tunnel/full-tunnel-light-seal-v0270.mjs";
import {NEON_INTERIOR_0212,installNeonDrivenInterior}
 from "./tunnel/neon-interior-v0212.mjs";
import {installNeonDrivenInterior as installClassicNeonInterior}
 from "./tunnel/neon-interior-v0212-classic.mjs";
import {TUNNEL_SPECTRUM_02121}
 from "./tunnel/tunnel-spectrum-v02121.mjs";
import {EXTERIOR_SEAL_02122,installExteriorLightSeal}
 from "./tunnel/tunnel-exterior-seal-v02122.mjs";
import {STRUCTURAL_TUNNEL_0213,installStructuralTunnelRebuild}
 from "./tunnel/structural-tunnel-v0213.mjs";
import {INTEGRATED_NEON_FLOW_0214,installIntegratedNeonFlow}
 from "./rendering/integrated-neon-flow-v0214.mjs";
import {WHITE_CORE_02123,createWhiteCoreContainment}
 from "./rendering/white-core-containment-v02123.mjs";
import {SHIP_WHITE_SPILL_02125,createShipWhiteSpillController}
 from "./ships/ship-white-spill-v02125.mjs";
import {ROAD_SOLAR_SPILL_02126,createRoadSolarSpillController}
 from "./rendering/road-solar-spill-v02126.mjs";
import {PREMIUM_ROAD_SURFACE_0215,createPremiumRoadSurfaceController}
 from "./rendering/premium-road-surface-v0215.mjs";
import {CINEMATIC_ROAD_0242,createCinematicRoadReflectionController}
 from "./rendering/cinematic-road-reflections-v0242.mjs";
import {ROAD_REBUILD_0263,createCinematicRoadReflectionRebuild0263}
 from "./rendering/cinematic-road-rebuild-v0263.mjs";
import {EDGE_FLOOR_02631,installEdgeLightingFloorPools02631}
 from "./tunnel/edge-lighting-floor-pools-v02631.mjs";
import {EDGE_SOURCE_02632,installRepositionedEdgeAndConnectedFoot02632}
 from "./tunnel/edge-source-floor-bands-v02632.mjs";
import {STRAIGHT_EDGE_02633,installStraightOnlyEdgeLighting02633}
 from "./tunnel/straight-only-edge-lighting-v02633.mjs";
import {FINAL_COHESION_0264,installFinalCohesion0264}
 from "./rendering/final-cohesion-v0264.mjs";
import {UNIFIED_METAL_LIGHT_02641,installUnifiedMetalLighting02641}
 from "./rendering/unified-metal-light-response-v02641.mjs";
import {REFLECTION_FINISH_02642,installPremiumReflectionFinish02642}
 from "./rendering/reflection-cohesion-v02642.mjs";
import {FIXTURE_TRANSPORT_02643,installUnifiedFixtureTransport02643}
 from "./rendering/unified-fixture-transport-v02643.mjs";
import {TRUE_RAIL_WALL_0265,installTrueRailWallResponse0265}
 from "./tunnel/true-rail-wall-response-v0265.mjs";
import {CINEMATIC_ENERGY_0216,installCinematicEnergyMotion}
 from "./rendering/cinematic-energy-v0216.mjs";
import {MATERIAL_REBIRTH_0220,installPremiumMaterialRebirth}
 from "./rendering/premium-material-rebirth-v0220.mjs";
import {CINEMATIC_NEON_0220_P2,installCinematicNeonLighting}
 from "./rendering/cinematic-neon-lighting-v0220p2.mjs";
import {PHYSICAL_MATERIAL_0230,installPhysicalMaterialRebuild}
 from "./rendering/physical-material-rebuild-v0230.mjs";
import {TRUE_MATERIAL_0231,installTrueMaterialDepthRebuild}
 from "./rendering/true-material-depth-v0231.mjs";
import {LIGHT_ARCHITECTURE_0232,installCinematicLightArchitecture}
 from "./rendering/cinematic-light-architecture-v0232.mjs";
import {UNIFIED_TUNNEL_0233,installUnifiedTunnelMaterials}
 from "./rendering/unified-tunnel-materials-v0233.mjs";
import {ARCHITECTURAL_NEON_0240,installArchitecturalNeonLighting}
 from "./rendering/architectural-neon-lighting-v0240.mjs";
import {PREMIUM_SURFACE_0241,installPremiumSurfaceCraftsmanship}
 from "./rendering/premium-surface-craftsmanship-v0241.mjs";
import {DARK_METALLIC_FOUNDATION_0250,installDarkMetallicFoundation}
 from "./rendering/dark-metallic-foundation-v0250.mjs";
import {MICRO_SURFACE_METAL_0251,installMicroSurfaceMetalDefinition}
 from "./rendering/micro-surface-metal-definition-v0251.mjs";
import {DUAL_TONE_LIGHTING_0260,installDualToneLightingPass1}
 from "./rendering/dual-tone-lighting-v0260.mjs";
import {TRUE_METAL_0260_P2,installTrueMetalMaterialsPass2}
 from "./rendering/true-metal-materials-v0260p2.mjs";
import {LOCAL_REFLECTIONS_0261,installTrueLocalReflectionsPass1}
 from "./rendering/local-reflections-v0261p1.mjs";
import {PREMIUM_METAL_0262,installPremiumMetalSurfaceLibrary,premiumMetalTexturePoolStats0262}
 from "./rendering/premium-metal-surface-v0262.mjs";
import {VELOCITY_CINEMA_0220_P3,installVelocityCinematography}
 from "./rendering/velocity-cinematography-v0220p3.mjs";
import {UNIFIED_GRADE_0220_P4,installUnifiedCinematicGrade}
 from "./rendering/unified-cinematic-grade-v0220p4.mjs";
import {CINEMATIC_SPACE_0170,createCinematicSpaceLighting,installCinematicRoadLighting}
 from "./world/cinematic-space-lighting-v0170.mjs";
import { createContactShadow } from "./ships/ship-v034.mjs";
import {CLARITY,clarityProfile as selectClarityProfile,dprForAdaptiveLevel,clarityAudit} from "./rendering/image-clarity-v083.mjs";
import {HUD_SPEC,createReactiveHud} from "./ui/reactive-hud-v04991.mjs";
import {GRIP_SPEC} from "./flight/precision-grip-v084.mjs";
import {RACING_FEEL,gripApexCue,createRailFeedbackState,
 startRailFeedback,stepRailFeedback} from "./flight/racing-feel-v083.mjs";
import {SIDE_THRUSTER_SPEC,createSideThrusters} from "./flight/side-thrusters-v061.mjs";
import {VELOCITY_PRESENCE,createVelocityPresenceState,
 stepVelocityPresence,velocityPresenceAudit} from "./ships/velocity-presence-v0104.mjs";
import {installReactiveWingFlaps,REACTIVE_FLAPS} from "./ships/reactive-wing-flaps-v0108.mjs";
import {createLivingWakeFX,LIVING_WAKE} from "./ships/living-wake-v01071.mjs";
import {createRailScrapeSparks,RAIL_SPARKS,railContactPoint}
 from "./rendering/rail-scrape-sparks-v0165.mjs";
import { LUMINANCE,validateLuminance } from "./rendering/luminance-v0331.mjs";
import {RACING_0121,createRacingExperience,resetRacingExperience,
 observeRacingStep,stepRacingExperience,raceRhythmAt,racingExperienceAudit}
 from "./core/racing-experience-v0160.mjs";
import {FIDELITY_0121,readFidelityChoice,saveFidelityChoice,chooseFidelity0121}
 from "./core/fidelity-settings-v0121.mjs";
import * as timeTrialAPI from "./core/time-trial-v0160.mjs";
import {createTimeTrialAPI} from "./core/time-trial.mjs";
const raceTimeTrialAPI=SPEED_PROFILE.id==="hyper-0297"?createTimeTrialAPI({...timeTrialAPI.TIME_TRIAL_0160,storageKey:"skyshift-time-trial-ghost-vault-hyper-0297",trackRevision:timeTrialAPI.TIME_TRIAL_0160.trackRevision+"|hyper-0297"}):timeTrialAPI;
const {formatTrialTime,formatTrialDelta,updateGhostDelta,ghostAudit}=raceTimeTrialAPI;
const raceBestKey=SPEED_PROFILE.id==="hyper-0297"?"skyshift-zone-wave-best-vault-hyper-0297":undefined;
import {createRaceSession,readLegacyRaceBest,updateLegacyRaceBest} from "./core/race-session.mjs";
import {GHOST_VISUAL_0130,createPersonalGhostVisual}
 from "./ui/ghost-visual-v0130.mjs";
import {CHALLENGES_0140,CHALLENGE_RULES_0140,getChallenge,challengeDistance,
 readChallengeProgress,saveChallengeProgress,challengeSummary,challengeUnlocked,
 evaluateChallenge,recordChallenge,captureChallengeMetrics}
 from "./tracks/skyline/skyline-challenges-v0140.mjs";
import {createShipArtController} from "./ships/ship-hero-loader-v01342.mjs";
import {HANGAR_HERO_0134,createStingrayHeroShowroom}
 from "./ships/hangar-hero-v0134.mjs";
import {STINGRAY_PRESENTATION_01347,visualSettingsForShip}
 from "./ships/stingray-presentation-v01347.mjs";
if(validateLuminance().length)throw new Error("Invalid SKYSHIFT atmosphere balance");

const $=id=>document.getElementById(id);
// The published boot script is the source of truth for the live build label.
const SKYSHIFT_BUILD_VERSION=new URL(
 document.querySelector("script[data-game-module]")?.src||location.href
).searchParams.get("v")||"0.26.5";
const CINEMATIC_ENABLED=new URLSearchParams(location.search).get("lighting")!=="classic";
// 0.27.0: do not overlay the old open-world scenery or 760m shadow
// segment on the continuous Neon Vault structure.
const envEnabled=!isVault()&&new URLSearchParams(location.search).get("env")!=="classic";
const sharedTunnelEnabled=
 new URLSearchParams(location.search).get("sharedTunnel")!=="classic"&&
 (!new URLSearchParams(location.search).has("v")||
  sharedTunnelVersionActive0280(new URLSearchParams(location.search).get("v")));
// 0.28.1: Vault installs the ORIGINAL Skyline full renderer, not its
// parallel 0.27.x copy. Legacy remains opt-in for pixel comparison.
const trueSharedQueryVersion=(new URLSearchParams(location.search).get("v")||"0.28.0")
 .split(".").map(Number);
const trueSharedVaultEnabled=isVault()&&sharedTunnelEnabled&&
 trueSharedQueryVersion[0]===0&&
 (trueSharedQueryVersion[1]>28||
  (trueSharedQueryVersion[1]===28&&trueSharedQueryVersion[2]>=1))&&
 new URLSearchParams(location.search).get("trueSharedRenderer")!=="classic";
// Vault-only 0.28.2 gate; 0.28.1 & Skyline retain their original artwork.
const sharedOpticsVersion=(new URLSearchParams(location.search)
 .get("v")||"0.28.1").split(".").map(Number);
const sharedOpticsEnabled=trueSharedVaultEnabled&&
 sharedOpticsVersion[0]===0&&
 (sharedOpticsVersion[1]>28||
  (sharedOpticsVersion[1]===28&&sharedOpticsVersion[2]>=2));
// 0.28.4: true real-scene PMREM capture on VAULT only. Explicitly
// ?pmrem=off gives exact previous 0.28.3 pixels, not a studio fallback.
const pmremReleaseEnabled=trueSharedVaultEnabled&&
 readPmremRelease0284(location.search);
const pmremEnabled=pmremReleaseEnabled&&
 !["off","classic"].includes(new URLSearchParams(location.search).get("pmrem"));
const sharedWaveParityEnabled=trueSharedVaultEnabled&&
 vaultSpatialWaveEnabled0285(location.search);
const stabilityReleaseEnabled=trueSharedVaultEnabled&&
 reflectionStabilityEnabled0286(location.search);
const archFootAssemblyEnabled=trueSharedVaultEnabled&&
 archFootRelease0287(location.search);
const precisionNeonReleaseEnabled=trueSharedVaultEnabled&&
 precisionNeonEnabled0288(location.search);
const cinematicMetalReleaseEnabled=trueSharedVaultEnabled&&
 cinematicMetalEnabled0289(location.search);
const straightParityReleaseEnabled=trueSharedVaultEnabled&&
 straightParityEnabled02891(location.search);
const ceilingFixtureReleaseEnabled=trueSharedVaultEnabled&&
 ceilingFixtureEnabled02892(location.search);
const archOpticsReleaseEnabled=trueSharedVaultEnabled&&
 archOpticsEnabled02893(location.search);
const archRoadReleaseEnabled=archOpticsReleaseEnabled&&
 archRoadEnabled02893(location.search);
const unifiedSourcesReleaseEnabled=trueSharedVaultEnabled&&
 unifiedSourcesEnabled02894(location.search);
const unifiedCeilingRoadReleaseEnabled=unifiedSourcesReleaseEnabled&&
 ceilingRoadEnabled02894(location.search);
const roadSpillReleaseEnabled=trueSharedVaultEnabled&&roadSpillEnabled02895(location.search);
const coveWaveReleaseEnabled=trueSharedVaultEnabled&&coveWaveEnabled02895(location.search);
const curveContinuityReleaseEnabled=trueSharedVaultEnabled&&
 surfaceContinuityEnabled02896(location.search);
const surfaceFinish02898=trueSharedVaultEnabled&&surfaceFinishEnabled02898(location.search);
const vaultPolish02899=trueSharedVaultEnabled&&vaultPolishEnabled02899(location.search);
const curveDeckCleanup028910=trueSharedVaultEnabled&&curveDeckCleanupEnabled028910(location.search);
const authoritativeDeck028911=authoritativeDeckEnabled028911(location.search);
const sharedRoadLightEnabled=sharedOpticsEnabled&&
 new URLSearchParams(location.search).get("sharedRoadLight")!=="classic";
const sharedShipLightEnabled=sharedOpticsEnabled&&
 new URLSearchParams(location.search).get("sharedShipLight")!=="classic";
const fullTunnelFoundationEnabled=isVault()&&
 new URLSearchParams(location.search).get("fullTunnel")!=="classic";
const vaultMaterialParityEnabled=fullTunnelFoundationEnabled&&
 tunnelReleaseAtLeast0280(new URLSearchParams(location.search).get("v")||"0.28.0",1)&&
 new URLSearchParams(location.search).get("vaultMaterial")!=="classic";
// 0.27.2: the actual Skyline 0.24.1 physical panel silhouette, not a
// painted copy. ?vaultArchitecture=classic restores the exact 0.27.1 shell.
const vaultArchitectureEnabled=vaultMaterialParityEnabled&&
 tunnelReleaseAtLeast0280(new URLSearchParams(location.search).get("v")||"0.28.0",2)&&
 new URLSearchParams(location.search).get("vaultArchitecture")!=="classic";
const vaultFullLightingEnabled=vaultArchitectureEnabled&&
 tunnelReleaseAtLeast0280(new URLSearchParams(location.search).get("v")||"0.28.0",3)&&
 new URLSearchParams(location.search).get("vaultLighting")!=="classic";
const vaultPremiumFinishEnabled=vaultFullLightingEnabled&&
 tunnelReleaseAtLeast0280(new URLSearchParams(location.search).get("v")||"0.28.0",4)&&
 new URLSearchParams(location.search).get("vaultFinish")!=="classic";
// Rebirth is the default on Skyline. ?worldArt=classic shows the original
// 0.19.2 decoration in full, with exactly the same racing physics.
const rebirthEnabled=envEnabled&&TRACK_ID_0160==="skyline"&&
 new URLSearchParams(location.search).get("worldArt")!=="classic";
// A/B: the exact original 0.20.0 open-wall station versus 0.20.5 interior.
const enclosedStationEnabled=rebirthEnabled&&
 new URLSearchParams(location.search).get("stationStyle")!=="classic";
// Pass 1: original 0.20.1 station as fair window-layout A/B fallback.
const observationWindowsEnabled=enclosedStationEnabled&&
 new URLSearchParams(location.search).get("windows")!=="classic";
// 0.20.5 cleans up fake shut windows; compare ?windowCleanup=classic.
const ribbonWindowsEnabled=observationWindowsEnabled&&
 new URLSearchParams(location.search).get("windowCleanup")!=="classic";
// Material-only 0.20.5: the archived 0.20.2.1 geometry and coloring can be
// restored at ?materialGrade=classic, with the same scene lights and race.
const graphiteGradeEnabled=ribbonWindowsEnabled&&
 new URLSearchParams(location.search).get("materialGrade")!=="classic";
// Pass 3 glTF neon layers the existing graphite materials, not a new grade.
const premiumNeonEnabled=graphiteGradeEnabled&&
 new URLSearchParams(location.search).get("neon")!=="classic";
const sculptedNeonEnabled=premiumNeonEnabled&&
 new URLSearchParams(location.search).get("neonPolish")!=="classic";
// Pass 4 A/B: the old 0.20.4.1 light scene/road remains untouched when off.
const architecturalRebirthEnabled=sculptedNeonEnabled&&
 new URLSearchParams(location.search).get("architecturePass")!=="classic";
// Phase A: swap the whole former corridor, not an overlay on top of it.
const reviewedLegacyVersion=/^0\.20\./.test(new URLSearchParams(location.search).get("v")||"");
const cinematicHeroEnabled=architecturalRebirthEnabled&&!reviewedLegacyVersion&&
 new URLSearchParams(location.search).get("cinematicHero")!=="classic";
const cinematicGradeEnabled=cinematicHeroEnabled&&
 new URLSearchParams(location.search).get("cinematicGrade")!=="classic";
// True large tunnel replaces the Phase A/B block corridor in the same interval.
const tunnelMegaEnabled=cinematicGradeEnabled&&
 new URLSearchParams(location.search).get("tunnelMega")!=="classic";
// Local neon is now the author of tunnel light, not external Hemisphere/Key.
const neonInteriorEnabled=tunnelMegaEnabled&&
 new URLSearchParams(location.search).get("interiorLight")!=="classic";
// 0.21.2.5.1: spatially synchronized interior neons; exact 0.21.2.5 A/B preserved.
const tunnelSpectrumEnabled=neonInteriorEnabled&&
 new URLSearchParams(location.search).get("tunnelSpectrum")!=="classic";
// 0.21.2.5: tunnel-only fog isolation + local rail glare trim, no global lights.
const exteriorSealEnabled=tunnelSpectrumEnabled&&
 new URLSearchParams(location.search).get("exteriorSeal")!=="classic";
// 0.21.2.5: fix *white PBR glare* on road and ship, not tunnel color/fog.
const whiteCoreEnabled=exteriorSealEnabled&&
 new URLSearchParams(location.search).get("whiteCore")!=="classic";
// White streak traced in real WebGL to the physically shaded rail BODY,
// not the rail LEDs, road, ship, fog or global bloom.
const railBodyContainmentEnabled=whiteCoreEnabled&&
 new URLSearchParams(location.search).get("railBody")!=="classic";
// 0.21.2.5: prevent an exterior key light from bleaching the vehicle hull.
const shipWhiteSpillEnabled=whiteCoreEnabled&&
 new URLSearchParams(location.search).get("shipWhite")!=="classic";
// 0.21.2.6: world sun/hemisphere may not bleach the PBR road INSIDE the tunnel.
const roadSolarEnabled=whiteCoreEnabled&&
 new URLSearchParams(location.search).get("roadSolar")!=="classic";
// 0.21.3 additive hard-surface art, safely gated from historical A/B versions.
const structuralTunnelEnabled=exteriorSealEnabled&&
 new URLSearchParams(location.search).get("tunnelStructure")!=="classic"&&
 !/^0\.21\.[0-2](?:\.|$)/.test(new URLSearchParams(location.search).get("v")||"");
// 0.21.4: longer neon direction lines + deliberately calmer structural contrast.
// Explicit 0.21.3 A/B URLs retain their original 0.21.3 look.
const integratedNeonFlowEnabled=structuralTunnelEnabled&&
 new URLSearchParams(location.search).get("tunnelFlow")!=="classic"&&
 !/^0\.21\.[0-3](?:\.|$)/.test(new URLSearchParams(location.search).get("v")||"");
// 0.21.5: matte architectural deck finish inside sealed tunnel only.
const premiumRoadEnabled=roadSolarEnabled&&TRACK_ID_0160==="skyline"&&
 new URLSearchParams(location.search).get("premiumRoad")!=="classic"&&
 !/^0\.21\.[0-4](?:\.|$)/.test(new URLSearchParams(location.search).get("v")||"");
// 0.24.2: road-only spectral arch reflections. Historical A/B versions
// and ?cinematicRoad=classic retain the original 0.24.1 road.
const roadReflectionRelease=(new URLSearchParams(location.search).get("v")||"0.24.2").split(".").map(Number);
const cinematicRoadEnabled=premiumRoadEnabled&&
 new URLSearchParams(location.search).get("cinematicRoad")!=="classic"&&
 roadReflectionRelease[0]===0&&
 (roadReflectionRelease[1]>24||
  (roadReflectionRelease[1]===24&&roadReflectionRelease[2]>=2));
// 0.26.3 Pass 3: native GGX from the real, banked cyan/amber fixtures.
// ?roadRebuild=classic reproduces 0.26.2 exactly (no scene/flight changes).
const roadRebuildEnabled=cinematicRoadEnabled&&
 roadReflectionRelease[0]===0&&
 (roadReflectionRelease[1]>26||
  (roadReflectionRelease[1]===26&&roadReflectionRelease[2]>=3))&&
 new URLSearchParams(location.search).get("roadRebuild")!=="classic";
// 0.26.3.1 target-image missing lower rail LEDs and warm arch-foot pools.
const edgeFloorEnabled=roadRebuildEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 (roadReflectionRelease[2]>3||
 (roadReflectionRelease[2]===3&&(roadReflectionRelease[3]??0)>=1))&&
 new URLSearchParams(location.search).get("edgeFloor")!=="classic";
// 0.26.3.2: short ground-level cyan and single connected warm floor bands.
const edgeSourceRebuildEnabled=edgeFloorEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 (roadReflectionRelease[2]>3||
 (roadReflectionRelease[2]===3&&(roadReflectionRelease[3]??0)>=2))&&
 new URLSearchParams(location.search).get("edgeSources")!=="classic";
// 0.26.3.3: new cyan source lights on authored STRAIGHTS ONLY.
// Keep orange vault-foot bands and curve arrows exactly as in 0.26.3.2.
const straightEdgesEnabled=edgeSourceRebuildEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 (roadReflectionRelease[2]>3||
 (roadReflectionRelease[2]===3&&(roadReflectionRelease[3]??0)>=3))&&
 new URLSearchParams(location.search).get("straightEdges")!=="classic";
// 0.26.4: the existing corrected straight-only edges are REQUIRED;
// restore exact 0.26.3.3 optically with ?finalCohesion=classic.
const finalCohesionEnabled=straightEdgesEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 roadReflectionRelease[2]>=4&&
 new URLSearchParams(location.search).get("finalCohesion")!=="classic";
// 0.21.6: speed-reactive ENERGY in existing tunnel neon, never an extra clock.
const cinematicMotionEnabled=integratedNeonFlowEnabled&&premiumRoadEnabled&&
 new URLSearchParams(location.search).get("cinematicMotion")!=="classic"&&
 !/^0\.21\.[0-5](?:\.|$)/.test(new URLSearchParams(location.search).get("v")||"");
// 0.22.0 Pass 1: genuine material finish on existing structural meshes.
// The 0.21.x versions and ?rebirthMaterial=classic retain their older art.
const premiumMaterialRebirthEnabled=cinematicMotionEnabled&&
 new URLSearchParams(location.search).get("rebirthMaterial")!=="classic"&&
 !/^0\.21\./.test(new URLSearchParams(location.search).get("v")||"");
// 0.22.0 Pass 2: locally colored neon light on existing metal surfaces.
// ?v=0.22.0 remains the exact Pass 1 release for visual comparisons.
const cinematicNeonEnabled=premiumMaterialRebirthEnabled&&
 new URLSearchParams(location.search).get("cinematicNeon")!=="classic"&&
 !["0.22.0","0.22.0.1"].includes(new URLSearchParams(location.search).get("v")||"");
// 0.23.0 P1: local, solar-sealed GGX metal on one reference gallery.
const physicalMaterialEnabled=cinematicNeonEnabled&&TRACK_ID_0160==="skyline"&&
 new URLSearchParams(location.search).get("physicalMaterial")!=="classic"&&
 !/^0\.22\./.test(new URLSearchParams(location.search).get("v")||"");
// 0.23.1: actual recessed 3D panels + distinct satin/graphite metal.
// ?trueDepth=classic reproduces the exact 0.23.0 shader and panel geometry.
const trueMaterialDepthEnabled=physicalMaterialEnabled&&
 new URLSearchParams(location.search).get("trueDepth")!=="classic"&&
 !["0.23.0"].includes(new URLSearchParams(location.search).get("v")||"");
// 0.23.2 Pass 2: only local neon highlights on real metal panels.
const lightArchitectureEnabled=trueMaterialDepthEnabled&&
 new URLSearchParams(location.search).get("lightArchitecture")!=="classic"&&
 !["0.23.0","0.23.1","0.23.1.1"].includes(
  new URLSearchParams(location.search).get("v")||"");
// 0.23.3: full 368 m of original neon-safe metal and sculpted panels.
// Compare against the untouched 0.23.2 gallery with ?unifiedTunnel=classic.
const unifiedTunnelEnabled=lightArchitectureEnabled&&
 new URLSearchParams(location.search).get("unifiedTunnel")!=="classic"&&
 !["0.23.0","0.23.1","0.23.1.1","0.23.2"].includes(
  new URLSearchParams(location.search).get("v")||"");
// 0.24.0: bounded architecture-driven neon bounce over full 0.23.3 vault.
// ?architecturalNeon=classic is the same deployment with this pass off.
const architecturalNeonEnabled=unifiedTunnelEnabled&&
 new URLSearchParams(location.search).get("architecturalNeon")!=="classic"&&
 !["0.23.0","0.23.1","0.23.1.1","0.23.2","0.23.3"].includes(
  new URLSearchParams(location.search).get("v")||"");
// 0.24.1: premium real panel bevel/score and material finish.
// ?surfaceCraft=classic reproduces the exact 0.24.0 tunnel rendering.
const surfaceCraftEnabled=architecturalNeonEnabled&&
 new URLSearchParams(location.search).get("surfaceCraft")!=="classic"&&
 !["0.23.0","0.23.1","0.23.1.1","0.23.2","0.23.3","0.24.0"].includes(
  new URLSearchParams(location.search).get("v")||"");
// 0.25.0: actual DARK metallic substrate with separate local neon light.
// ?darkMetal=classic restores the exact 0.24.2 appearance in this build.
const darkMetalEnabled=surfaceCraftEnabled&&
 new URLSearchParams(location.search).get("darkMetal")!=="classic"&&
 !/^0\.(?:2[0-4])(?:\.|$)/.test(new URLSearchParams(location.search).get("v")||"");
// 0.25.1: microscopic directional metal finish, no global fill or bloom.
const microMetalVersion=(new URLSearchParams(location.search).get("v")||"0.25.1")
 .split(".").map(Number);
const microMetalEnabled=darkMetalEnabled&&
 new URLSearchParams(location.search).get("microMetal")!=="classic"&&
 microMetalVersion[0]===0&&
 (microMetalVersion[1]>25||
 (microMetalVersion[1]===25&&microMetalVersion[2]>=1));
// 0.26.0 pass 1: independent cool cyan coves, amber practicals and native
// zone-colored main neon. 0.25.1 is exactly preserved with ?dualTone=classic.
const dualToneVersion=(new URLSearchParams(location.search).get("v")||"0.26.2")
 .split(".").map(Number);
const dualToneEnabled=microMetalEnabled&&
 new URLSearchParams(location.search).get("dualTone")!=="classic"&&
 dualToneVersion[0]===0&&dualToneVersion[1]>=26;
// 0.26.0 Pass 2: native physical metal light response, separate from the
// original 0.26.0 dual-tone Basic-material solar seal. Same-build A/B switch.
const trueMetalEnabled=dualToneEnabled&&
 new URLSearchParams(location.search).get("trueMetal")!=="classic"&&
 dualToneVersion[0]===0&&dualToneVersion[1]>=26;
// Local finite cyan/amber strip reflections on top of original 0.26.0 P2.
// Historical 0.26.0 QA remains on its untouched physical metal pipeline.
const localReflectionsEnabled=trueMetalEnabled&&
 dualToneVersion[0]===0&&
 (dualToneVersion[1]>26||
  (dualToneVersion[1]===26&&dualToneVersion[2]>=1))&&
 new URLSearchParams(location.search).get("localReflections")!=="classic";
// Reuse the ORIGINAL blackout controller across both tunnel interiors.
// ?unifiedLighting=classic restores the original light-control behavior.
// 0.26.2: micro-normal and micro-roughness maps on EXISTING native GGX
// cyan/amber local reflection coats; exact classic comparison is on 0.26.1.
const premiumMetalEnabled=localReflectionsEnabled&&
 dualToneVersion[0]===0&&dualToneVersion[1]===26&&dualToneVersion[2]>=2&&
 new URLSearchParams(location.search).get("premiumMetal")!=="classic";
// 0.26.4.1: only after final HDR polish and actual premium metal. Historical
// 0.26.4 and ?unifiedLight=classic remain exact previous pixel output.
const unifiedLightResponseEnabled=finalCohesionEnabled&&premiumMetalEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 (roadReflectionRelease[2]>4||
 (roadReflectionRelease[2]===4&&(roadReflectionRelease[3]??0)>=1))&&
 new URLSearchParams(location.search).get("unifiedLight")!=="classic";
// 0.26.4.2 polishing is a bounded OPTICAL layer on top of actual 0.26.4.1
// metal and straight-only edge geometry; no changes to flight or exposure.
const reflectionFinishEnabled=unifiedLightResponseEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 (roadReflectionRelease[2]>4||
  (roadReflectionRelease[2]===4&&(roadReflectionRelease[3]??0)>=2))&&
 new URLSearchParams(location.search).get("reflectionFinish")!=="classic";
// 0.26.4.3 local transport: original roof cyan kept, walls and amber
// rebalanced at source on sealed materials. Never activate for older builds.
const fixtureTransportEnabled=reflectionFinishEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 (roadReflectionRelease[2]>4||
  (roadReflectionRelease[2]===4&&(roadReflectionRelease[3]??0)>=3))&&
 new URLSearchParams(location.search).get("fixtureTransport")!=="classic";
// 0.26.5 local physical metal on sealed rail and 0.26.1 wall coats.
const railWallResponseEnabled=fixtureTransportEnabled&&
 roadReflectionRelease[0]===0&&roadReflectionRelease[1]===26&&
 roadReflectionRelease[2]>=5&&
 new URLSearchParams(location.search).get("railWallResponse")!=="classic";
const unifiedTunnelLightingEnabled=tunnelMegaEnabled&&exteriorSealEnabled&&
 new URLSearchParams(location.search).get("unifiedLighting")!=="classic";
// 0.22.0 Pass 3: additive postprocess; Pass 1 and Pass 2 links unchanged.
const velocityCinemaEnabled=cinematicNeonEnabled&&
 new URLSearchParams(location.search).get("velocityCinema")!=="classic"&&
 !["0.22.0","0.22.0.1","0.22.0.2"].includes(
  new URLSearchParams(location.search).get("v")||"");
// 0.22.0 Pass 4: non-destructive HDR grade, independent A/B.
const unifiedGradeEnabled=cinematicNeonEnabled&&
 new URLSearchParams(location.search).get("unifiedGrade")!=="classic"&&
 !["0.22.0","0.22.0.1","0.22.0.2","0.22.0.3"].includes(
  new URLSearchParams(location.search).get("v")||"");
const worldEnabled=envEnabled&&!rebirthEnabled&&
 new URLSearchParams(location.search).get("world")!=="classic";
const architectureEnabled=worldEnabled&&new URLSearchParams(location.search).get("architecture")!=="classic";
function fleetStorage(){try{return localStorage}catch{return null}}
let fleetProgress=window.__skyshiftBoot?.menuSnapshot?.fleet??readFleet(fleetStorage());
let previewShipId=fleetProgress.selected,activeShipId="",activeCraft=null;
const shipArtController=createShipArtController(THREE,{
 search:location.search,
 currentCraft:()=>activeCraft,
 currentShipId:()=>activeShipId
});
if(!fleetProgress.clears&&bestForTrial()>0){
 fleetProgress=saveFleet(fleetStorage(),recordFleetClear(fleetProgress,true).state);
 previewShipId=fleetProgress.selected;
}
// 0.9.0 developer comparison only. Default stays balanced, the user can
// A/B exact physics and authored geometry with ?camera=classic|kinetic.
const cameraOption=new URLSearchParams(location.search).get("camera");
const CAMERA_MODE=["classic","balanced","kinetic"].includes(cameraOption)?
 cameraOption:"balanced";
const CAMERA_GAIN=CAMERA_MODE==="classic"?0:CAMERA_MODE==="kinetic"?1.15:.85;
const UI={
 canvas:$("game"),start:$("start-btn"),retry:$("retry-btn"),
 menu:$("menu"),end:$("end-screen"),pause:$("pause-screen"),
 challengeScreen:$("challenges-screen"),challengeButton:$("challenges-btn"),
 challengeList:$("challenge-grid"),challengeSummary:$("challenge-summary"),
 challengeBack:$("challenges-back-btn"),challengeHud:$("challenge-hud"),
 challengeClock:$("challenge-clock"),challengeHudName:$("challenge-hud-name"),
 challengeResult:$("challenge-result"),challengeEndBack:$("challenge-end-back"),
 settings:$("settings-screen"),settingsOpen:$("menu-settings-btn"),
 settingsBack:$("settings-back-btn"),pauseMenu:$("pause-menu-btn"),
 pauseGhostToggle:$("pause-ghost-toggle"),
 resume:$("resume-btn"),restart:$("restart-paused-btn"),
 pauseBtn:$("pause-btn"),hud:$("hud"),controls:$("mobile-controls"),
 shieldFill:$("shield-fill"),shieldText:$("shield-text"),shieldStatus:$("shield-status"),
 progress:$("zone-progress-fill"),sector:$("zone-number"),
 sectorName:$("sector-name"),distance:$("distance"),speed:$("speed"),
 flight:$("flight-state"),toast:$("toast"),banner:$("zone-banner"),
 bannerNum:$("zone-banner-number"),bannerName:$("zone-banner-name"),
 flash:$("zone-flash"),stick:$("stick"),knob:$("stick-knob"),
 jump:$("jump-btn"),grip:$("grip-btn"),gripCue:$("grip-cue"),
 riskCue:$("risk-line-cue"),error:$("error"),finalTitle:$("final-title"),
 finalDistance:$("final-distance"),finalSector:$("final-zone"),
  lapNumber:$("lap-number"),lapInfo:$("lap-info"),finalLaps:$("final-laps"),
 finalBest:$("personal-best"),finalTime:$("flight-time"),
 finalJumps:$("final-jumps"),finalStyle:$("final-style"),export:$("audit-btn"),
 trialStatus:$("tt-menu-status"),trialHud:$("tt-hud"),
 trialClock:$("tt-clock"),trialDelta:$("tt-delta"),trialResult:$("tt-result"),
 raceLabel:$("trial-label"),
 fullscreen:$("fullscreen-btn"),menuFullscreen:$("menu-fullscreen-btn"),fidelityToggle:$("fidelity-btn"),
 fullscreenHelp:$("fullscreen-help"),
 hangar:$("hangar-screen"),hangarBtn:$("hangar-btn"),
 hangarBack:$("hangar-back"),endHangar:$("end-hangar-btn"),
 menuSelectedShip:$("menu-selected-ship"),
 trackPicker:$("track-picker"),trackName:$("menu-track-name"),
 trackTagline:$("track-tagline"),trackFeatures:$("track-features"),
 topbarTrack:$("topbar-track-name"),
 fleetProgress:$("fleet-progress"),
 fleetPreviewTitle:$("fleet-preview-title"),
 fleetPreviewDescription:$("fleet-preview-description"),
 unlockToast:$("fleet-unlock-toast")
};
// A single wavefront palette for the entire *world* behind the boundary.
const COLOR=ZONE_PALETTES.map(p=>({
 color:p.light,sky:p.sky,fog:p.fog,name:p.name
}));
const themes=COLOR.map(p=>({
  ...p,skyColor:new THREE.Color(p.sky),fogColor:new THREE.Color(p.fog),
  accent:new THREE.Color(p.color)
}));
const targetSky=new THREE.Color(),targetFog=new THREE.Color(),
 targetAccent=new THREE.Color();
const SPECTRAL_WHITE=new THREE.Color(0xf5fbff);
const SHADOW_VOID=new THREE.Color(SHADOW_TUNNEL.voidHex);
const uiState={mode:"menu",inputX:0,jumpPressed:false,jumpHeld:false,gripHeld:false,gripPointer:null,stickPointer:null,
 keys:new Set(),bannerTimeout:null,toastTimeout:null,trackHint:-1};
// 0.28.9.7 startup profiling: zero scene traversal until explicitly requested.
const startupOrigin=performance.now(),startupMarks=Object.create(null);
let nativeFrameExperiment=null;
let legacyCinematicRoadWashInstalled=false;
function markStartup(label){
 startupMarks[label]=Math.round((performance.now()-startupOrigin)*10)/10;
}
markStartup("moduleEvaluated");
// QA samples the mounted mesh itself, not just the intended route width.
function deckGeometryAudit028911(){
 const deck=world?.getObjectByName?.("Zone Ribbon · integrated PBR racing deck");
 const coord=deck?.geometry?.getAttribute("aTrackCoord"),pos=deck?.geometry?.getAttribute("position");
 if(!coord||!pos)return null;
 const cols=MESH_SPEC.lateralColumns,rows=coord.count/cols;
 let maxPositionError=0,maxWidthError=0;
 const samples=[0,235,777,820,840,847,900,962,995,1085,2547,3399].map(station=>{
  const row=Math.min(rows-1,Math.round(station*(rows-1)/TRIAL.length)),first=row*cols;
  const s=coord.getX(first),actualWidth=coord.getY(first+cols-1)-coord.getY(first),expectedWidth=widthAt(s);
  maxWidthError=Math.max(maxWidthError,Math.abs(actualWidth-expectedWidth));
  for(let col=0;col<cols;col++){
   const idx=first+col,lateral=expectedWidth*(col/(cols-1)-.5),p=positionAt(s,lateral,0);
   maxPositionError=Math.max(maxPositionError,Math.hypot(pos.getX(idx)-p.x,pos.getY(idx)-p.y,pos.getZ(idx)-p.z));
  }
  return {station,arc:s,actualWidth,expectedWidth};
 });
 return {authoritative:authoritativeDeck028911,maxWidthError,maxPositionError,samples};
}
window.__skyshiftStartupAudit=()=>{
 const meshes=[],materials=new Set(),geometries=new Set();
 world?.traverse?.(obj=>{
  if(!obj.isMesh)return;
  meshes.push(obj);
  if(obj.geometry)geometries.add(obj.geometry);
  for(const mat of (Array.isArray(obj.material)?obj.material:[obj.material]))
   if(mat)materials.add(mat);
 });
 const now=performance.now();
 const stamps={...startupMarks};
 const durations={
  sharedTunnelMs:stamps.sharedTunnelReady!==undefined&&stamps.sharedTunnelBegin!==undefined?
   Math.round((stamps.sharedTunnelReady-stamps.sharedTunnelBegin)*10)/10:null,
  pmremMs:stamps.pmremReady!==undefined&&stamps.pmremBegin!==undefined?
   Math.round((stamps.pmremReady-stamps.pmremBegin)*10)/10:null,
  restOfSceneMs:stamps.sceneReady!==undefined&&stamps.sharedTunnelReady!==undefined?
   Math.round((stamps.sceneReady-stamps.sharedTunnelReady)*10)/10:null
 };
 return {
  track:TRACK_ID_0160,version:VAULT_MEGA_JUMP_ACTIVE?VAULT_JUMP_VERSION:vaultPolish02899?PRODUCTION_TRACK.version:surfaceFinish02898?"0.28.9.8":"0.28.9.7",
  elapsedSinceModuleMs:Math.round((now-startupOrigin)*10)/10,
  browserBootMs:window.__skyshiftBoot?.readyAfterMs??null,
  phase:window.__skyshiftBoot?.phase??"loading",
  stamps,durations,nativeFrameExperiment:nativeFrameExperiment?.stats()??null,
  atlas:premiumMetalTexturePoolStats0262(THREE),
  renderer:renderer?{
   memory:{...renderer.info.memory},
   programs:renderer.info.programs?.length??null
  }:null,
  scene:{meshes:meshes.length,geometryObjects:geometries.size,
   materials:materials.size,
   sharedTunnelModules:sharedTunnelRuntime?.audit?.().trueSharedRenderer?.sourceModules??0,
   sharedTunnelFailureReason:sharedTunnelRuntime?.audit?.().trueSharedRenderer?.reason??null,
   legacyRoadResponseMeshes:meshes.filter(m=>m.name==="Tunnel / NEON_ROAD_RESPONSE").length,
   boostPadCount:BOOST_PADS.length,riskGateCount:RHYTHM_GATES_0160.length,
   shoulderMarks:identitySurface?.shoulderMarks??null,
   railChevrons:identitySurface?.chevrons??null,
   curveDeckCleanup:curveDeckCleanup028910,
   deckGeometry:authoritativeDeck028911?deckGeometryAudit028911():null,
   megaJumpActive:VAULT_MEGA_JUMP_ACTIVE,physicalGaps:GAPS.map(g=>({id:g.id,start:g.start,end:g.end})),
   legacyCinematicRoadWash:legacyCinematicRoadWashInstalled,
   mainBoostOnly:VAULT_BOOST_0283_ACTIVE&&BOOST_PADS.every(p=>p.kind==="boost"&&p.multiplier===1.4),
   omittedLegacyRoadBatches:sharedTunnelRuntime?.audit?.().trueSharedRenderer?.omittedLegacyRoadBatches??0,
   startupFrameSampler:sharedTunnelRuntime?.audit?.().trueSharedRenderer?.startupFrameOptimization02897??null,
   pmremActive:pmremPipeline?.active??false},
  jsHeapMB:performance.memory?.usedJSHeapSize?
   Math.round(performance.memory.usedJSHeapSize/1048576):null
 };
};
const worldClock={last:performance.now(),accum:0};
const resourceSmoke=new URLSearchParams(location.search).get("resourceSmoke")==="1";
const teardownReport={errors:[],released:null};
// Only explicit resource QA freezes the hangar camera and collects counters.
let resourceFrame=0,lastShipRelease=null;
const runtimeLifetime=createRuntimeLifetime({
 requestFrame:callback=>requestAnimationFrame(callback),
 cancelFrame:id=>cancelAnimationFrame(id),frame:loop,
 resetClock:()=>{worldClock.last=performance.now();worldClock.accum=0;},
 onSuspend:()=>{if(uiState.mode==="playing")pause();},
 onContextLost:()=>{
  if(uiState.mode==="playing")pause();
  sceneReady=false;shipArtController.dispose();
  UI.error.classList.remove("hidden");
  UI.error.textContent="Graphics context lost. Waiting for recovery…";
 },
 // Existing track/fidelity changes already use a clean reload. Recover using
 // the same boot path rather than reusing invalid GPU handles.
 onContextRestored:()=>location.reload(),
 onDispose:({contextLost})=>{
  sceneReady=false;shipArtController.dispose();
  const cleanup=[()=>clearTimeout(uiState.bannerTimeout),()=>clearTimeout(uiState.toastTimeout),
   ()=>fullscreenController?.destroy(),()=>clearInput(),
   ()=>{if(!contextLost)gpuClock?.reset();},()=>pmremPipeline?.dispose?.(),
   ()=>releaseShip(),()=>ghostVisual?.dispose?.(),()=>sharedTunnelRuntime?.dispose?.(),
   ()=>releaseRemainingScene(),()=>{if(velocityExperience)velocityCinematography?.dispose?.();},()=>neonPipeline?.dispose?.(),()=>renderer?.dispose?.(),()=>perfPanel?.remove()];
  for(const release of cleanup)try{release();}catch(error){teardownReport.errors.push(String(error?.message??error));console.warn("SKYSHIFT cleanup",error);}
 }
});
let scene,camera,renderer,world,ship,shipGlow,shipShade,roadMat,edgeMat,flight;
let claritySettings=null,fidelityProfile=null,fidelityDirector=null;
let neonKit,neonPipeline,velocityCinematography=null,unifiedCinematicGrade=null,finalCohesion=null,unifiedMetalLight=null,premiumReflectionFinish=null,fixtureTransport=null,trueRailWall=null,engineLights=[],engineCore,enginePlumes=[],identitySurface,premiumSurface,spaceBackdrop,shadowTunnel,tunnelBlackout,worldLights,bladeTips;
let cinematicLighting=null,signatureEnvironment=null,cinematicWorld=null,orbitalHero=null;
let fullTunnelCircuit=null,vaultMaterialParity=null,vaultArchitecture=null,vaultFullLighting=null,sharedTunnelRuntime=null;
let sharedRoadLight=null,sharedShipLight=null,pmremPipeline=null,cinematicRoadFinish=null,
 sharedStraightEdgeRoad=null,archRoadReflections=null,archLegacyOverlay=null,
 unifiedCeilingRoad=null,unifiedLegacyRoad=null,roadSpill02895=null,curveContinuity02896=null;
let stationWorld=null,whiteCoreContainment=null,shipWhiteSpill=null,roadSolarSpill=null,
 premiumRoadSurface=null,cinematicRoadReflections=null,cinematicRoadRebuild=null,
 edgeFloorLighting=null;
let shadowMesh,premiumFX,sideThrusters,reactiveWingFlaps,livingWake,railSparks;
let sectorLandmarks=null,ghostVisual=null,hangarHeroRig=null;
const racingExperience=createRacingExperience();
const raceSession=createRaceSession({api:raceTimeTrialAPI,
 sampleIntervalSeconds:timeTrialAPI.TIME_TRIAL_0160.sampleIntervalSeconds,
 storage:fleetStorage,bankAt,pitchAt});
const timeTrialState=raceSession.trial;
let challengeProgress=readChallengeProgress(fleetStorage());
let currentChallenge=null,lastChallengeGrading=null;
let perfFrames=0,perfTotal=0,perfMin=200;
let renderSamples=0,renderCallTotal=0,renderCallPeak=0,triangleTotal=0;
const raceSimulation=createRaceSimulation();
let frameMonitor=createFrameMonitor();
const perfSettings=readPerfConfig(location.search);
const smartPerformance=VAULT_SMART_ACTIVE?(window.__skyshiftBoot?.menuSnapshot?.performance??readPerformance(fleetStorage(),matchMedia('(pointer:coarse)').matches,perfSettings)):null;
const presentationGate=createPresentationGate();
let trackVisibility=null,detailLod=null;
const advancedGpu=VAULT_ADVANCED_GPU_ACTIVE?(window.__skyshiftBoot?.menuSnapshot?.gpu??readAdvancedGpu(fleetStorage())):null;
const velocityExperience=VAULT_VELOCITY_ACTIVE?(window.__skyshiftBoot?.menuSnapshot?.velocity??readVelocityExperience(fleetStorage(),VAULT_EXTREME_BLUR_ACTIVE)):null;
const blurCraftProjection=new THREE.Vector3();
function velocityExperienceAudit(){return velocityExperience?{...velocityExperience,blur:velocityCinematography?.stats?.(),camera:{aspect:camera?.aspect,verticalFov:camera?.fov,horizontalFov:camera?horizontalFov(camera.fov,camera.aspect):null,peakVerticalFov:chaseCameraController.maxKineticFov}}:null;}
let lastAdvancedGpuFrame=null;
function applyAdvancedBloom(){if(advancedGpu&&neonPipeline&&perfSettings.preset!=='bloom-full')neonPipeline.setBloomResolutionScale(resolveBloomScale(advancedGpu.bloom,neonPipeline.originalBloomResolutionScale));}
if(smartPerformance)perfSettings.fixedQuality=smartPerformance.quality==='fixed';
const fidelityChoice=readFidelityChoice({search:location.search,storage:fleetStorage()});
const frameProfiler=newPerfMonitor();
const endurance=VAULT_COMPACT_ACTIVE?createEnduranceAudit():null;
endurance?.attachBattery(navigator);
let gpuClock=null,perfPanel=null,lastPerfPanelUpdate=0;
const hudBudget=newHudBudget(),domWrites=createDomWriteCache();
const engineFxFrame={dt:0,playing:false,flight:{forwardSpeed:44,boostMultiplier:1},
 poseAt,positionAt,ship:null,shipGlow:null,sectorColor:0,
 motionWeight:null,velocity:null,presence:null};
let completedSparkStats=null;
const fidelitySignals={s:0,speed:44,boostMultiplier:1,wave:0,
 playing:false,circuitLength:CIRCUIT.lapLength};
let adaptiveQuality=createAdaptiveQuality(),wakeSmokePath=null;
let motionState=createFlightMotionState(),cinematicState=createCinematicState(),
 boostSpring=createBoostSpringState(),velocityState=createVelocityState(),
 velocityPresence=createVelocityPresenceState();
let kineticCamera=createKineticCameraState();
let signatureFlight=createSignatureFlightState();
const reactiveHud=createReactiveHud(UI.hud);
let previousHudShield=100;
const flightTuning={...MOTION_DEFAULTS};
const cinematicTuning={...CINEMATIC_DEFAULTS};
if(CAMERA_GAIN===0){
 cinematicTuning.previewGain=.23;
 cinematicTuning.previewMaximum=.12;
}
// One shared source of cosmetic input signals for hull, camera and engines.
const motionRig=createUnifiedFlightRig({
 flightTuning,cinematicTuning,headingAt,surfaceHeightAt,
 hoverHeight:TRIAL.hoverHeight,cameraGain:CAMERA_GAIN,
 lapLength:CIRCUIT.lapLength,magneticWall:MAGNETIC_WALL,corkscrew:CORKSCREW
});
const chaseCameraController=createChaseCameraController({
 Vector3:THREE.Vector3,chasePose,cameraBankAt,cinematicFov,kineticFovAt,stepBoostSpring,
 boostFovTarget,boostFovResponse,cinematicTuning,CAMERA_GAIN,TRIAL,BOOST_CONFIG,
 CLASSIC_BOOST_FOV,BOOST_SPRING,clamp,lerp,
 adjustFov:velocityExperience?(base,aspect,speed)=>adaptiveVelocityFov(base,aspect,speed,velocityExperience.adaptiveCamera):null
});
const shipPresentation=createShipPresentation({
 Vector3:THREE.Vector3,onRoad,surfaceNormalAt,positionAt,bankAt,pitchAt,
 TRIAL,BOOST_CONFIG,NEON_TUNING,SPECTRAL_WHITE,waveResonanceStrength,
 spectralChargeStrength,engineLightFactor,clamp
});
const raceTelemetry=createRaceTelemetry();
let previousSector=0,sceneReady=false,fullscreenController=null,lastRailLog=0;
let railFeedback=createRailFeedbackState();
const raceHud=createRaceHud({UI,uiState,domWrites,ZONE_PALETTES,TRIAL,CIRCUIT,
 challengeDistance,formatTrialTime,formatTrialDelta,updateGhostDelta,curvatureAt,
 sectorAt,isAurora,isVault,gripApexCue,GRIP_APEX,riskCueAt,AIR_TRICKS,bankDegreesAt,
 event,flashToast,cleanRaceHud:VAULT_JUMP_POLISH_ACTIVE});
let zoneWave=newZoneWaveState();
const visualWaveView02899=createSinglePassWaveView02899();
let tunnelInside=false,tunnelEntries=0,tunnelExits=0,tunnelSeconds=0,tunnelMaxIntensity=0;
let waveSmokeHold=false;

const countdownEnabled=VAULT_MEGA_JUMP_ACTIVE&&VAULT_JUMP_VERSION==="0.29.8.1";
const raceCountdown=createRaceCountdown();
const raceLifecycle=createRaceLifecycle({UI,uiState,raceSession,timeTrialState,resetFlight,refreshHud,hudBudget,clearInput,refreshTrialMenu,worldClock,event,now:()=>performance.now(),clearTimeout,ctx:{get sceneReady(){return sceneReady&&(!window.__skyshiftBoot?.deferred||window.__skyshiftBoot.phase==="ready")},get currentChallenge(){return currentChallenge},get world(){return world},setChallenge(challenge){currentChallenge=challenge;lastChallengeGrading=null},app:()=>$("app"),hideGhost:()=>ghostVisual?.hide()}});
function bestForTrial(){return readLegacyRaceBest(fleetStorage(),raceBestKey);}
// A best Time Trial is separate from the historic normal-circuit record.
function refreshTrialMenu(){
 const best=raceSession.personalBest();
 UI.trialStatus.textContent=best?
  "PERSONAL BEST · "+formatTrialTime(best.duration)+" · "+best.ship.toUpperCase():"";
 UI.trialStatus.classList.toggle("hidden",!best);
 UI.pauseGhostToggle.textContent="GHOST "+(raceSession.ghostEnabled?"ON":"OFF");
 UI.pauseGhostToggle.setAttribute("aria-pressed",String(raceSession.ghostEnabled));
 UI.pauseGhostToggle.setAttribute("aria-label",
  "Ghost "+(raceSession.ghostEnabled?"på":"av")+". Tryck för att ändra");
}
function recordRealGhostPose(force=false){raceSession.record(flight,force);}
function flashToast(message,time=1350){
 if(VAULT_JUMP_POLISH_ACTIVE&&uiState.mode==="playing")return;
 UI.toast.textContent=message;UI.toast.classList.remove("hidden");
 clearTimeout(uiState.toastTimeout);
 uiState.toastTimeout=setTimeout(()=>UI.toast.classList.add("hidden"),time);
}
function event(kind,properties={}){
 raceTelemetry.record(flight,kind,properties);
}
function addQuad(points,colors,a,b,c,d,tint){
 for(const p of [a,b,c,a,c,d]){
   points.push(p.x,p.y,p.z);
   if(colors)colors.push(tint.r,tint.g,tint.b);
 }
}
function toVec(s,lateral,offset=0){
 const p=positionAt(s,lateral,offset);
 return new THREE.Vector3(p.x,p.y,p.z);
}
function buildGeometry(points,colors=null){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
 if(colors)geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 return geo;
}
function buildRoad(){
 // The roadway TOP is one contiguous indexed mesh with shared vertex normals.
 // Vertical wall facades remain separate so road edge lighting stays crisp.
 const walls=[],wallColors=[],jumpMarks=[],padFaces=[];
 const boundaries=GEOMETRY_BREAKS;
 const tintSide=new THREE.Color(0x091222);
 for(let k=0;k<boundaries.length-1;k++){
   let from=boundaries[k],to=boundaries[k+1];
   for(let d=from;d<to-.001;d+=.8) {
     const e=Math.min(to,d+.8),mid=(d+e)*.5;
     const intervals=roadIntervals(mid);
     for(const [a,b] of intervals) {
       const p1=toVec(d,a),p2=toVec(d,b),p3=toVec(e,b),p4=toVec(e,a);
       const wallNormal=surfaceNormalAt(mid);
        const drop=new THREE.Vector3(-wallNormal.x*1.05,-wallNormal.y*1.05,
          -wallNormal.z*1.05);
       addQuad(walls,wallColors,p1.clone().add(drop),p1,p4,p4.clone().add(drop),tintSide);
       addQuad(walls,wallColors,p2,p2.clone().add(drop),p3.clone().add(drop),p3,tintSide);
       // The v0.4.7 faceted armor is a separate continuous swept mesh.
       // No redundant neon skirt/border stripe along the deck sides.
     }
     // Long racing guides are now part of the unified road material.
     // Runway paint in the last metres before each mandatory jump.
     for(const gap of GAPS)if(mid>=gap.start-17&&mid<gap.start-.8){
       const band=(Math.floor((gap.start-mid)/2.8)%2)===0;
       if(band){
         for(const [a,b] of intervals){
           for(const lateral of [a+(b-a)*.32,a+(b-a)*.68]){
             addQuad(jumpMarks,null,toVec(d,lateral-.38,.073),toVec(d,lateral+.38,.073),
               toVec(e,lateral+.38,.073),toVec(e,lateral-.38,.073));
           }
         }
       }
     }
   }
 }
 // The optional right-hand route gets its own readable advance markings.
 for(const cut of RISK_CUTS){
   for(let d=cut.start-12;d<cut.start-1;d+=1.4){
     const e=Math.min(cut.start-1,d+1.4);
     if(Math.floor((cut.start-d)/2.8)%2!==0)continue;
     for(const [a,b] of roadIntervals((d+e)*.5)){
       if(a<0)continue;
       const m=(a+b)*.5;
       addQuad(jumpMarks,null,toVec(d,m-.64,.084),toVec(d,m+.64,.084),
         toVec(e,m+.64,.084),toVec(e,m-.64,.084));
     }
   }
 }
 // The chamber remains enclosed: a recessed, non-driveable pit floor
 // and end faces are batched into existing road sidewalls, not a second deck.
 if(VAULT_MEGA_JUMP_ACTIVE){
  const {start,end,pitDepth}=VAULT_MEGA_JUMP,w=widthAt(start)/2;
  for(let d=start;d<end-.001;d+=.8){
   const e=Math.min(d+.8,end);
   addQuad(walls,wallColors,toVec(d,-w,-pitDepth),toVec(d,w,-pitDepth),toVec(e,w,-pitDepth),toVec(e,-w,-pitDepth),tintSide);
   for(const side of [-1,1])addQuad(walls,wallColors,toVec(d,side*w),toVec(e,side*w),toVec(e,side*w,-pitDepth),toVec(d,side*w,-pitDepth),tintSide);
  }
  for(const s of [start,end])addQuad(walls,wallColors,toVec(s,-w),toVec(s,w),toVec(s,w,-pitDepth),toVec(s,-w,-pitDepth),tintSide);
 }
 // Highlight each separate landing island at its front and rear edge.
 for(const gap of GAPS){
   for(const spot of [gap.start-1.0,gap.end+.2]){
     for(const [a,b] of roadIntervals(spot)){
       addQuad(padFaces,null,toVec(spot,a+.17,.085),toVec(spot,b-.17,.085),
         toVec(spot+.32,b-.17,.085),toVec(spot+.32,a+.17,.085));
     }
   }
 }
 roadMat=new THREE.MeshStandardMaterial({
   color:LUMINANCE.roadColor,vertexColors:true,
   metalness:LUMINANCE.roadMetalness,roughness:LUMINANCE.roadRoughness,
   emissive:LUMINANCE.roadEmissive,
   emissiveIntensity:LUMINANCE.roadEmissiveIntensity,
   side:THREE.DoubleSide
 });
 edgeMat=neonKit.edgeBody;
 premiumSurface=createSmartPremiumTrackMaterial(THREE,fidelityProfile);
 const road=new THREE.Mesh(createPremiumDeckGeometry(THREE,authoritativeDeck028911?
  {TRIAL,positionAt,widthAt,gapAt}:null),premiumSurface.material);
 road.name="Zone Ribbon · integrated PBR racing deck";
 road.frustumCulled=false;world.add(road);
 const sidewalls=new THREE.Mesh(buildGeometry(walls,wallColors),roadMat);
 sidewalls.name="Deliberately hard-edged vertical road sides";
 sidewalls.frustumCulled=false;world.add(sidewalls);
 const gold=neonKit.warning;
 const jumps=new THREE.Mesh(buildGeometry(jumpMarks),gold);
 jumps.frustumCulled=false;world.add(jumps);
 const caps=new THREE.Mesh(buildGeometry(padFaces),neonKit.landing);
 caps.frustumCulled=false;world.add(caps);
}
function makeBillboard(text,s,height=6.7,scale=8,lateral=0){
 const canvas=document.createElement("canvas");
 canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext("2d");
 ctx.clearRect(0,0,512,128);
 ctx.font="900 58px Arial, sans-serif";ctx.textAlign="center";
 ctx.shadowColor="#55dffb";ctx.shadowBlur=20;ctx.fillStyle="#e6f8ff";
 ctx.fillText(text,256,78);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({
   map:texture,color:new THREE.Color(0xf1faff).multiplyScalar(1.10),
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
 });
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(scale,scale*.25),mat);
 const p=poseAt(s);
 const place=positionAt(s,lateral,height);
 sign.position.set(place.x,place.y,place.z);
 sign.rotation.y=-p.heading;
 world.add(sign);
 return sign;
}
function makeArch(s,label,color,wide=16){
 const group=new THREE.Group(),p=poseAt(s);
 group.position.set(p.x,p.y,p.z);group.rotation.y=-p.heading;
 const metal=new THREE.MeshStandardMaterial({color:0x15253c,metalness:.7,
   roughness:.35});
 const lightBody=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(NEON_TUNING.archBodyLuminance),
   toneMapped:false,side:THREE.DoubleSide});
 const lightCore=new THREE.MeshBasicMaterial({color:new THREE.Color(0xe9faff).multiplyScalar(NEON_TUNING.archCoreLuminance),
   toneMapped:false,side:THREE.DoubleSide});
 const halo=new THREE.MeshBasicMaterial({color,
   transparent:true,opacity:NEON_TUNING.archHaloOpacity,blending:THREE.AdditiveBlending,
   depthWrite:false,toneMapped:false});
 function buildBar(width,height,depth,x,y,z,material){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
   mesh.position.set(x,y,z);group.add(mesh);return mesh;
 }
 for(const side of [-1,1]){
   const x=side*(wide/2+.36);
   buildBar(.56,7.5,.83,x,3.75,0,metal);
   buildBar(.24,7.37,.88,x,3.75,-.25,halo);
   buildBar(.12,7.16,.89,x,3.75,-.30,lightBody);
   buildBar(.028,7.0,.92,x,3.75,-.33,lightCore);
 }
 buildBar(wide+1.25,.46,.85,0,7.5,0,metal);
 buildBar(wide+1.2,.25,.95,0,7.66,-.25,halo);
 buildBar(wide+1.15,.10,.91,0,7.67,-.32,lightBody);
 buildBar(wide+1.08,.026,.95,0,7.7,-.34,lightCore);
 world.add(group);
 if(label==="FINISH")makeBillboard(label,s,8.7,6.6);
}

function buildDecor(){
 // The invisible/visually noisy roadside beacons (four instanced pillar
 // layers every 18m) are removed completely, not merely hidden.
 // Keep only the authored FINISH arch; the raised rails and chevrons now
 // communicate every turn and carry the continuous spectral zone wave.
 for(const arch of ARCHES)if(arch.label==="FINISH")
  makeArch(arch.s,arch.label,arch.color,widthAt(arch.s)+.5);
 // Distinct elevated sectors. The leap is clearly warned with an actual
 // suspended sign before the opening, never an obstacle across the road.
 if(!isVault())for(const sector of CIRCUIT.sectors.slice(1))
  makeBillboard(sector.name,sector.start+45,10.2,21,0);
 if(!isAurora()&&!isVault())makeBillboard("SKYLINE LEAP",SKYLINE_LEAP.start-50,9.4,15,0);
 if(VAULT_MEGA_JUMP_ACTIVE&&!VAULT_JUMP_POLISH_ACTIVE)makeBillboard("VAULT MEGA JUMP",VAULT_MEGA_JUMP.start-35,12,15,0);
 // Portal warning is safely above the racing lane, after the wall ride.
 if(!isVault())makeBillboard(isAurora()?"LUMEN PASS":"SHADOW TUNNEL",
  SHADOW_TUNNEL.start-83,11,15,0);
}
// The page owns all remaining scene resources after the specialised owners
// have returned their leases and detached their roots. Neon materials may be
// unused, so include the entire kit in the same identity-deduplicated release.
function releaseRemainingScene(){
 const resources=collectObjectResources(scene,{textures:true});
 for(const material of Object.values(neonKit??{}))
  if(material?.isMaterial)resources.materials.add(material);
 // PMREM render targets and the shared atlas are released by their owners.
 // The remaining direct material textures are page-local (billboards, etc.).
 teardownReport.released=releaseResourceDifference(resources);
 scene?.clear?.();
}
function releaseShip(){
 // Dispose ship-local FX before removing their craft. Shared neon and PMREM
 // remain owned by their respective pipelines, not this vehicle.
 tunnelBlackout?.reset();
 pmremPipeline?.detachShip?.();sharedShipLight?.detachShip?.();
 const prior=resourceSmoke&&ship?collectObjectResources(ship):null;
 const pending=prior?new Set(prior.geometries):null;
 const watches=[];
 if(pending)for(const geometry of pending){
  const listener=()=>pending.delete(geometry);
  geometry.addEventListener("dispose",listener);watches.push([geometry,listener]);
 }
 const before=resourceSmoke?renderer?.info.memory.geometries:null;
 premiumFX?.dispose();sideThrusters?.dispose();livingWake?.dispose();
 reactiveWingFlaps?.dispose();railSparks?.dispose();
 premiumFX=sideThrusters=livingWake=reactiveWingFlaps=railSparks=null;
 if(ship){
  ship.removeFromParent();
  releaseResourceDifference(collectObjectResources(ship),{materials:new Set([neonKit?.ship])});
  ship=null;
 }
 if(pending){
  lastShipRelease={owned:prior.geometries.size,undisposed:pending.size,before,after:renderer?.info.memory.geometries??null};
  for(const [geometry,listener] of watches)geometry.removeEventListener("dispose",listener);
 }
}
// Only the explicit browser smoke probe may override the release's hull.
let mantaQaOverride=null;
function makeShip(id=fleetProgress.selected){
 // Ship and engine visuals can change; the real physical state is untouched.
 releaseShip();
 shipGlow=neonKit.ship;
 const craft=id==="stingray"?
   buildStingrayEvo(THREE,shipGlow):(mantaQaOverride??VAULT_MANTA_REBIRTH_ACTIVE)?buildMantaVisualRebirth(THREE,shipGlow,{corrected:["0.29.5.1","0.29.5.2","0.29.6","0.29.7","0.29.8","0.29.8.1"].includes(mantaQaOverride??VAULT_JUMP_VERSION)}):buildPremiumMantaBlade(THREE,shipGlow);
 activeCraft=craft;activeShipId=id;ship=craft.ship;
 // A stable SINGLE transform for the full craft (including animated tail
 // and attached engine FX), never evaluated from wing-road intersections.
 // Manta's default scale remains 1.00.
 if(id==="stingray"){
  const visual=visualSettingsForShip(id);
  ship.scale.set(visual.scaleX,visual.scaleY,visual.scaleZ);
 }
 bladeTips=separateBladeTipMaterial(ship,craft.materials.cyan);
 engineCore=craft.engineCore;enginePlumes=craft.enginePlumes;
 engineLights=ENGINE_SOCKETS.map((socket,i)=>{
  const light=new THREE.PointLight(
   0x43ddf0,NEON_TUNING.enginePointIntensity*.42,3.15,1.8);
  light.position.set(socket.x,socket.y-.33,socket.z+.03);
  light.name=i===0?"Port engine fill":"Starboard engine fill";
  ship.add(light);return light;
 });
 scene.add(ship);
 // Bind PBR ship hull, including fleet swaps, to a visual-only light trim.
 whiteCoreContainment?.attachShip(ship);
 shipWhiteSpill?.attachShip(ship);
 sharedShipLight?.attachShip(ship);
 pmremPipeline?.attachShip(ship);
 premiumFX=createTwinEngineFX(THREE,scene,ship,craft.materials.cyan,{energyPlumes:id==="manta"&&["0.29.5.2","0.29.6","0.29.7","0.29.8","0.29.8.1"].includes(mantaQaOverride??VAULT_JUMP_VERSION)});
 reactiveWingFlaps=installReactiveWingFlaps(THREE,ship,{variant:id});
 livingWake=createLivingWakeFX(THREE,scene,ship,{variant:id,
  lowMemory:claritySettings?.lowMemory??false});
 railSparks=createRailScrapeSparks(THREE,scene,{
  lowMemory:claritySettings?.lowMemory??false});
 sideThrusters=createSideThrusters(THREE,ship);
 if(spaceBackdrop)
  tunnelBlackout=(unifiedTunnelLightingEnabled?
    createUnifiedTunnelLightingController:createTunnelBlackoutController)({
    worldLights,camera,bladeTips,
  // The original 760m Shadow Tunnel light curve must NOT leak into
  // the 3400m Neon Vault. Reuse the native PBR sun-containment controller
  // with a sealed interior level at EVERY track coordinate instead.
  ...(isVault()?{levelsAt:vaultLightLevels0270}:{})
 });
 if(!shadowMesh)shadowMesh=createContactShadow(THREE,scene);
 UI.jump.classList.add("hidden");
 // A scene-art preview only; 120Hz flight/camera/GRIP remain unchanged.
 void shipArtController.onCraftBuilt(craft,id).then(()=>{
  if(runtimeLifetime.disposed||runtimeLifetime.contextLost)return;
  if(activeCraft===craft){
   whiteCoreContainment?.attachShip(ship);
   shipWhiteSpill?.attachShip(ship);
   sharedShipLight?.attachShip(ship);
   pmremPipeline?.attachShip(ship);
  }
  if(activeCraft===craft&&id==="stingray"&&uiState.mode==="hangar")
   refreshHangar();
 });
}
function refreshHangar(){
 UI.menuSelectedShip.textContent=FLEET.find(x=>x.id===fleetProgress.selected)?.name||
   FLEET[0].name;
 UI.fleetPreviewTitle.textContent=FLEET.find(x=>x.id===previewShipId)?.name||
   FLEET[0].name;
 const art=shipArtController.audit();
 UI.fleetPreviewDescription.textContent=previewShipId==="stingray"?
  art.heroApplied?"HERO 4.0 · PANSARSVANS · STABIL SVÄNG":
  art.status==="loading"?"HERO-MODELL · LADDAR 3D-GEOMETRI":
  "Segmenterad mekanisk svans · reagerar på styrning, GRIP och boost":
  VAULT_MANTA_REBIRTH_ACTIVE?(["0.29.5.1","0.29.5.2","0.29.6","0.29.7","0.29.8","0.29.8.1"].includes(VAULT_JUMP_VERSION)?"DARK GRAPHITE · CYAN WING INLAYS · DUBBLA MOTORER":"GRAPHITE REBIRTH · SKULPTERAT SKROV · DUBBLA MOTORER"):"Hårdskuren interceptor · dubbla motorer";
 for(const item of FLEET){
  const card=document.querySelector('[data-fleet-card="'+item.id+'"]');
  const status=document.querySelector('[data-fleet-status="'+item.id+'"]');
  const preview=document.querySelector('[data-fleet-preview="'+item.id+'"]');
  const equip=document.querySelector('[data-fleet-equip="'+item.id+'"]');
  const unlocked=isFleetUnlocked(fleetProgress,item.id);
  card?.classList.toggle("active",previewShipId===item.id);
  card?.classList.toggle("locked",!unlocked);
  preview?.setAttribute("aria-pressed",String(previewShipId===item.id));
  if(status)status.textContent=unlocked?
    (fleetProgress.selected===item.id?"UTRUSTAD":"UPPLÅST"):
    "LÅST · KLARA 3 VARV";
  if(equip){
   equip.disabled=!unlocked;
   equip.textContent=!unlocked?"LÅST":
    fleetProgress.selected===item.id?"UTRUSTAD":"VÄLJ";
  }
 }
 UI.fleetProgress.textContent=fleetProgress.clears>0?
  "FULLSTÄNDIGA LOPP: "+fleetProgress.clears+" · STINGRAY EVO UPPLÅST":
  "KLARA ALLA TRE VARV I ETT LOPP FÖR ATT LÅSA UPP STINGRAY EVO";
}
// Gameplay-only Skyline Challenges: always drive the ORIGINAL stepFlight.
function refreshChallenges(){
 const summary=challengeSummary(challengeProgress);
 UI.challengeSummary.textContent=summary.bronzeOrBetter+" / "+summary.total+
  " COMPLETED · "+summary.gold+" GOLD";
 UI.challengeList.replaceChildren();
 for(const c of CHALLENGES_0140){
  const unlocked=challengeUnlocked(challengeProgress,c.id);
  const record=challengeProgress.records[c.id];
  const button=document.createElement("button");
  button.type="button";button.className="challenge-card";
  button.dataset.challengeId=c.id;button.dataset.medal=record?.medal??"none";
  button.disabled=!unlocked;
  const top=document.createElement("span");top.className="challenge-top";
  const name=document.createElement("span");name.className="challenge-title";
  name.textContent=c.number+" · "+c.name;
  const status=document.createElement("span");status.className="challenge-state";
  status.textContent=!unlocked?"LOCKED · "+c.unlocksAt+" BRONZE":
   record?.medal?record.medal.toUpperCase():"PLAY";
  top.append(name,status);
  const sub=document.createElement("span");sub.className="challenge-sub";
  sub.textContent=c.subtitle+" · "+Math.round(challengeDistance(c))+" M"+
   (record?.bestSeconds?" · PB "+formatTrialTime(record.bestSeconds):"");
  button.append(top,sub);
  button.setAttribute("aria-label",c.name+" "+
    (!unlocked?"låst, samla "+c.unlocksAt+" bronsmedaljer":
      (record?.medal??"ej klarad")+", starta utmaning"));
  UI.challengeList.append(button);
 }
}
function openChallenges(){
 if(!ACTIVE_TRACK_0160.hasSkylineChallenges)return;
 if(!sceneReady||!["menu","ended"].includes(uiState.mode))return;
 refreshChallenges();
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.hangar.classList.add("hidden");UI.challengeScreen.classList.remove("hidden");
 UI.settingsOpen.classList.add("hidden");UI.fullscreen.classList.add("hidden");
 UI.controls.classList.add("hidden");UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");
 uiState.mode="challenges";
}
function closeChallenges(){
 if(uiState.mode!=="challenges")return;
 currentChallenge=null;lastChallengeGrading=null;
 UI.challengeScreen.classList.add("hidden");UI.menu.classList.remove("hidden");
 UI.settingsOpen.classList.remove("hidden");uiState.mode="menu";
 document.getElementById("app").classList.remove("challenge-active");
 resetFlight();refreshTrialMenu();
}
function seedChallengeFlight(c){
 const s=c.startS,p=positionAt(s,0,0);
 const completedGates=Math.floor(s/(CIRCUIT.lapLength/10));
 Object.assign(flight,{s,lateral:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(s),y:surfaceHeightAt(s)+TRIAL.hoverHeight*surfaceNormalAt(s).y,
  currentSpeed:TRIAL.startSpeed,zoneCruiseSpeed:TRIAL.startSpeed,
  zoneSpeedStage:0,checkpoint:completedGates*(CIRCUIT.lapLength/10),
  checkpointsPassed:completedGates,lap:1,lapsCompleted:0,
  elapsed:0,lastLapAt:0,grounded:true,vy:0});
}
function endChallengeRun(won){
 completedSparkStats=railSparks?.stats()??null;
 const c=currentChallenge,metrics=captureChallengeMetrics(c,flight,racingExperience);
 metrics.reachedExit=won&&metrics.reachedExit;
 const grading=evaluateChallenge(c,metrics);
 lastChallengeGrading=grading;
 const update=recordChallenge(challengeProgress,c.id,grading);
 challengeProgress=saveChallengeProgress(fleetStorage(),update.progress);
 uiState.mode="ended";clearInput();
 UI.finalTitle.textContent=grading.medal==="none"?
  "CHALLENGE INCOMPLETE":c.name+" · "+grading.medal.toUpperCase();
 UI.finalTitle.classList.toggle("success",grading.medal!=="none");
 UI.finalDistance.textContent=Math.floor(Math.max(0,flight.s-c.startS))+
  " / "+Math.round(challengeDistance(c))+" M";
 UI.finalSector.textContent=String(zoneWave.playerStage+1).padStart(2,"0");
 UI.finalBest.textContent=challengeProgress.records[c.id]?.bestSeconds?
  formatTrialTime(challengeProgress.records[c.id].bestSeconds):"—";
 UI.finalTime.textContent=formatTrialTime(flight.elapsed);
 UI.finalLaps.textContent="CHALLENGE";
 UI.finalJumps.textContent=flight.peakYawRateDeg.toFixed(1)+"°/S";
 UI.finalStyle.textContent=flight.offRoadSeconds.toFixed(1)+" S";
 UI.trialResult.classList.add("hidden");UI.unlockToast.classList.add("hidden");
 UI.challengeResult.dataset.medal=grading.medal;
 UI.challengeResult.textContent=(grading.medal==="none"?
   "FINISH THE SECTION TO EARN BRONZE":
   "MEDAL "+grading.medal.toUpperCase()+" · "+formatTrialTime(flight.elapsed)+
   " · "+(grading.skillMet?"SKILL COMPLETE":"SKILL NOT YET COMPLETE"))+
   (update.newlyUnlocked.length?
    " · NEW CHALLENGE UNLOCKED: "+update.newlyUnlocked.map(id=>getChallenge(id).name).join(", "):"");
 UI.challengeResult.classList.remove("hidden");
 UI.challengeEndBack.classList.remove("hidden");
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.fullscreen.classList.add("hidden");
 UI.end.classList.remove("hidden");
 event("challenge_finished",{id:c.id,medal:grading.medal,time:grading.elapsed,
  cleanCarves:metrics.cleanCarves,contacts:metrics.railContacts,
  unlocked:update.newlyUnlocked});
}
function openHangar(){
 if(!sceneReady||!["menu","ended"].includes(uiState.mode))return;
 previewShipId=fleetProgress.selected;
 if(activeShipId!==previewShipId)makeShip(previewShipId);
 refreshHangar();
 uiState.mode="hangar";
 $("app").classList.add("hangar-active");
 // Keep the real racing track visible behind both ships, as in 0.10.0.
 world.visible=true;
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.hangar.classList.remove("hidden");
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");
 UI.fullscreen.classList.add("hidden");
 UI.settingsOpen.classList.add("hidden");
}
function closeHangar(){
 if(uiState.mode!=="hangar")return;
 UI.hangar.classList.add("hidden");UI.menu.classList.remove("hidden");
 $("app").classList.remove("hangar-active");
 world.visible=true;
 uiState.mode="menu";
 if(activeShipId!==fleetProgress.selected)makeShip(fleetProgress.selected);
 UI.settingsOpen.classList.remove("hidden");
 UI.fullscreen.classList.add("hidden");
 resetFlight();
}
function previewFleetShip(id){
 if(uiState.mode!=="hangar"||!FLEET.some(item=>item.id===id))return;
 previewShipId=id;
 if(activeShipId!==id)makeShip(id);
 refreshHangar();
}
function equipFleetShip(id){
 if(uiState.mode!=="hangar"||!isFleetUnlocked(fleetProgress,id))return;
 fleetProgress=saveFleet(fleetStorage(),equipFleet(fleetProgress,id));
 previewShipId=fleetProgress.selected;
 if(activeShipId!==previewShipId)makeShip(previewShipId);
 refreshHangar();
}
// Every asynchronous boot boundary must recheck the existing lifetime owner.
// A page exit or lost context must not resume construction on released handles.
function assertStartupLifetime(){
 if(runtimeLifetime.disposed||runtimeLifetime.contextLost)
  throw Error("Race initialization interrupted");
}
async function raceLoadingStage(label,step){
 await window.__skyshiftLoadingStage(label,step);
 assertStartupLifetime();
}
async function initScene(){
 markStartup("sceneBegin");
 if(window.__skyshiftBoot?.deferred)await raceLoadingStage("BUILDING ROAD AND RENDERER",2);
 scene=new THREE.Scene();
 hangarHeroRig=createStingrayHeroShowroom(THREE,scene);
 scene.background=new THREE.Color(COLOR[0].sky);
 scene.fog=new THREE.FogExp2(COLOR[0].fog,LUMINANCE.fogDensity*.57);
 if(CINEMATIC_ENABLED){
  scene.background.multiplyScalar(CINEMATIC_SPACE_0170.skyScale);
  scene.fog.color.multiplyScalar(CINEMATIC_SPACE_0170.fogScale);
  scene.fog.density*=CINEMATIC_SPACE_0170.fogDensityScale;
 }
 camera=new THREE.PerspectiveCamera(67,innerWidth/Math.max(1,innerHeight),.1,650);
 scene.add(camera);
 // Explicitly select quality based on real device capabilities. The
 // HDR composer owns anti-aliasing (SMAA); canvas MSAA would only waste
 // memory and cannot smooth our offscreen RenderPass.
 claritySettings=selectClarityProfile(navigator.deviceMemory,devicePixelRatio||1);
 const limitedMemory=claritySettings.lowMemory;
 fidelityProfile=chooseFidelity0121({
  lowMemory:limitedMemory,preset:perfSettings.preset,choice:fidelityChoice
 });
 fidelityDirector=createFidelityDirector(fidelityProfile);
 // Only switch the vertex shader at startup; a menu toggle reloads cleanly
 // while retaining the normal game's adaptive DPR and lightweight bloom.
 UI.fidelityToggle.textContent="FIDELITY "+(fidelityProfile.premium?"ON":"OFF")+" · TOGGLE";
 UI.fidelityToggle.setAttribute("aria-pressed",String(fidelityProfile.premium));
 UI.fidelityToggle.setAttribute("aria-label",
  "Optimerad Fidelity "+(fidelityProfile.premium?"på":"av")+
  ". Tryck för att ändra, spelet laddas om.");
 UI.fidelityToggle.disabled=FIDELITY_0121.overridePresets.includes(perfSettings.preset);
 const options={canvas:UI.canvas,antialias:false,
  powerPreference:limitedMemory?"default":"high-performance"};
 try{
  renderer=new THREE.WebGLRenderer(options);
 }catch(primaryError){
  renderer=new THREE.WebGLRenderer({...options,
   antialias:false,powerPreference:"default"});
 }
 renderer.setPixelRatio(claritySettings.renderDpr);
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 // Sum renderer workload across all composer passes (last pass alone=1 call).
 renderer.info.autoReset=false;
 // Native canvas remains high fidelity; adaptive detail adjusts only the
 // internal HDR composer targets on sustained slow devices.
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=LUMINANCE.exposure;
 neonKit=createNeonKit(THREE);
 const ambient=new THREE.HemisphereLight(
   LUMINANCE.ambientSky,LUMINANCE.ambientGround,LUMINANCE.ambientIntensity
 );
 scene.add(ambient);
 const key=new THREE.DirectionalLight(0xb5d6ff,LUMINANCE.keyIntensity);
 key.position.set(12,28,18);scene.add(key);
 const edgeFill=new THREE.DirectionalLight(0xf87ac6,LUMINANCE.fillIntensity);
 edgeFill.position.set(-18,11,-22);scene.add(edgeFill);
 worldLights={ambient,key,fill:edgeFill};
 // The visible distant star and the real PBR key agree in world space.
 // No additional dynamic lights or changes to handling/camera logic.
 if(CINEMATIC_ENABLED)cinematicLighting=createCinematicSpaceLighting(THREE,{
  scene,camera,worldLights,lowMemory:limitedMemory
 });
 world=new THREE.Group();scene.add(world);
 buildRoad();
 markStartup("roadReady");
 identitySurface=installAeroBarriers(THREE,world,{shoulderMarks:!curveDeckCleanup028910});
 // Static indirect-light pockets reuse the existing deck draw call.
 // The tunnel and blackout decorators retain the final say over darkness.
 if(CINEMATIC_ENABLED&&!limitedMemory&&!curveDeckCleanup028910){
  installCinematicRoadLighting(premiumSurface.material);
  legacyCinematicRoadWashInstalled=true;
 }
 // Static 760m architecture and preserved high-energy road markings.
 if(!isVault()){
  installTunnelRoadShading(premiumSurface.material);
  installBlackoutRoadShading(premiumSurface.material);
  shadowTunnel=installShadowTunnel(THREE,world);
  shadowTunnel.setAccent(neonKit.worldAccent);
 }
 // Always retain white core and bloom. Disable only optional filaments
 // when navigator reports a low-memory device.
 const waveDetail=limitedMemory?"low":"high";
 premiumSurface?.setDetailMode(waveDetail);
 identitySurface?.setDetailMode(waveDetail);
  buildDecor();
 // 0.28.0: shared authored tunnel STYLE and track-specific ROUTE.
 // Both Skyline and Vault use the same 0.21.1 profile, 0.24.1 sculptor,
 // packed 0.26.2 material and native 0.26.x GGX. Existing visuals are
 // installed through ONE controlled runtime; no duplicated builders.
 // EF07: the 4GB shared renderer benefits from exact native frame reuse.
 // High retains the previous sampler unless explicit benchmark opt-in.
 // QA-only override lets the real browser compare the unchanged old path.
 const frameOverride=perfSettings.enabled?new URLSearchParams(location.search).get("ef07NativeFrame"):null;
 if(trueSharedVaultEnabled&&(VAULT_MEGA_JUMP_ACTIVE||frameOverride==="1"||(limitedMemory&&frameOverride!=="0")))
  nativeFrameExperiment=createStaticPositionSampler();
 sharedTunnelRuntime=createSharedTunnelRuntime0280(THREE,world,{
  track:TRACK_ID_0160,positionAt,lowMemory:limitedMemory,
  trackLength:CIRCUIT.lapLength,enabled:sharedTunnelEnabled,
  ...(VAULT_MEGA_JUMP_ACTIVE?{positionAt:createTunnelProfileSampler(nativeFrameExperiment??positionAt,chamberProfileAt)}:nativeFrameExperiment?{positionAt:nativeFrameExperiment}:{})
 });
 // Reinstall the SAME Skyline source pipeline over the independent
 // Vault spline. Its 0.27.x pipeline only runs on explicit classic/fallback.
 markStartup("sharedTunnelBegin");
 if(window.__skyshiftBoot?.deferred)await raceLoadingStage("BUILDING TUNNEL GEOMETRY",3);
 const trueSharedVault=sharedTunnelRuntime.installTrueShared({
  enabled:trueSharedVaultEnabled,
  policy:{
   spatialWave:sharedWaveParityEnabled,stableStrips:stabilityReleaseEnabled,
   archFeet:archFootAssemblyEnabled,precisionNeon:precisionNeonReleaseEnabled,
   cinematicMetal:cinematicMetalReleaseEnabled,upperWallStability:surfaceFinish02898,straightOnly:straightParityReleaseEnabled,
   ceilingFixtures:ceilingFixtureReleaseEnabled,premiumArch:archOpticsReleaseEnabled,
   waveCove:coveWaveReleaseEnabled,fastFrames:!VAULT_MEGA_JUMP_ACTIVE&&!limitedMemory&&startupSamplerEnabled02897(location.search),
   straightRanges:straightParityReleaseEnabled?vaultStraightRanges02891():[]
  },
  omitLegacyRoadResponse:omitLegacyRoadResponseEF05(location.search,
   unifiedSourcesReleaseEnabled&&cleanLegacyRoadEnabled02894(location.search))
 });
 nativeFrameExperiment?.finish();
 markStartup("sharedTunnelReady");
 // CI-only exact digest of mounted tunnel geometry; no production traversal
 // or hashing unless explicitly requested. Preserve all typed-array bytes.
 if(perfSettings.enabled&&new URLSearchParams(location.search).get("ef07GeometryDigest")==="1")
  window.__skyshiftEF07GeometryDigest=async()=>{
   const entries=[],uniqueGeometries=new Set(),uniqueAttributes=new Set(),uniqueArrays=new Set(),uniqueBuffers=new Set(),groups=new Map();
   let attributeBytes=0,arrayBytes=0,bufferBytes=0;
   trueSharedVault.root?.traverse(obj=>{
    const g=obj.geometry;if(!g)return;
    uniqueGeometries.add(g);
    for(const [name,attr] of [...Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)),...(g.index?[["$index",g.index]]:[])]){
     entries.push({name:obj.name,attribute:name,itemSize:attr.itemSize,normalized:attr.normalized,
      count:attr.count,array:attr.array});
     if(!uniqueAttributes.has(attr)){
      uniqueAttributes.add(attr);attributeBytes+=attr.array.byteLength;
      const key=obj.name+" / "+name;
      groups.set(key,(groups.get(key)??0)+attr.array.byteLength);
     }
     if(!uniqueArrays.has(attr.array)){uniqueArrays.add(attr.array);arrayBytes+=attr.array.byteLength;}
     if(!uniqueBuffers.has(attr.array.buffer)){uniqueBuffers.add(attr.array.buffer);bufferBytes+=attr.array.buffer.byteLength;}
    }
   });
   const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
   const rows=[];let totalBytes=0;
   for(const {array,...meta} of entries){
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);totalBytes+=bytes.byteLength;
    rows.push({...meta,type:array.constructor.name,hash:hex(await crypto.subtle.digest("SHA-256",bytes))});
   }
   return {arrays:rows.length,totalBytes,sha256:hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(rows)))),
    unique:{geometries:uniqueGeometries.size,attributes:uniqueAttributes.size,arrays:uniqueArrays.size,buffers:uniqueBuffers.size,
     attributeBytes,arrayBytes,bufferBytes,largestAttributeGroups:[...groups].sort((a,b)=>b[1]-a[1]).slice(0,12)}};
  };
 // One mounted source plan, shared by every current optical consumer.
 // Historical comparison/fallback routes preserve their former full-course plan.
 if(perfSettings.enabled&&new URLSearchParams(location.search).get("ef07GeometryDigest")==="1")
  window.__skyshiftEF07RenderWork=()=>({...renderer.info.render});
 const opticalContext=createSharedOpticalContext({
  positionAt,sourcePositionAt:VAULT_MEGA_JUMP_ACTIVE?createTunnelProfileSampler(positionAt,chamberProfileAt):positionAt,trackLength:CIRCUIT.lapLength,lowMemory:limitedMemory,tunnel:trueSharedVault,
  enabled:sharedRoadLightEnabled||sharedShipLightEnabled||archRoadReleaseEnabled||unifiedCeilingRoadReleaseEnabled,
  unifiedSources:unifiedSourcesReleaseEnabled
 });
 // Optional 0.28.9.3 diagnostic, unchanged by default.
 archLegacyOverlay=diagnosticLegacyRoadOverlay02893(world,{
  enabled:archOpticsReleaseEnabled&&
   new URLSearchParams(location.search).get("archLegacyRoad")==="off"
 });
 // 0.28.9.4: reversible removal of ten old additive road overlays.
 unifiedLegacyRoad=installLegacyRoadCleanup02894(world,{
  enabled:unifiedSourcesReleaseEnabled,
  clean:cleanLegacyRoadEnabled02894(location.search)
 });
 const sharedLayers=sharedTunnelRuntime.installVault({
  foundationEnabled:fullTunnelFoundationEnabled,
  materialEnabled:vaultMaterialParityEnabled,
  architectureEnabled:vaultArchitectureEnabled,
  lightingEnabled:vaultFullLightingEnabled,
  finishEnabled:vaultPremiumFinishEnabled
 });
 ({foundation:fullTunnelCircuit,material:vaultMaterialParity,
   architecture:vaultArchitecture,lighting:vaultFullLighting}=sharedLayers);
 // 0.20.5: six architectural vaults, far-field fins and coherent edge light
 // around the S-link on Skyline. Instanced visuals only, no new colliders.
 if(envEnabled&&!rebirthEnabled)signatureEnvironment=installSignatureEnvironment(THREE,world,{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt
 });
 // 0.20.5: full 3-chapter environment, without any new physical colliders.
 // world=classic retains the old 0.18 world for a fair A/B comparison.
 if(worldEnabled)cinematicWorld=installCinematicWorld(THREE,world,{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt
 });
 // Pass 2: replace just the old simple 278m station with one sculpted,
 // selectively lit observatory; no scene-wide material/light adjustment.
 if(architectureEnabled)orbitalHero=installOrbitalHero(THREE,world,{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt
 });
 // 0.20.5 World Art Pipeline: coherent, authored glTF station interior.
 // This replaces the old random arches/rings in rebirth mode; asset loading
 // is async and safe, but the old 120 Hz race motor stays authoritative.
 if(rebirthEnabled)stationWorld=sharedTunnelRuntime.installSkyline((THREE,world,sharedOptions)=>(premiumMetalEnabled?installPremiumMetalSurfaceLibrary:
     localReflectionsEnabled?installTrueLocalReflectionsPass1:
     trueMetalEnabled?installTrueMetalMaterialsPass2:
     dualToneEnabled?installDualToneLightingPass1:
     microMetalEnabled?installMicroSurfaceMetalDefinition:
     darkMetalEnabled?installDarkMetallicFoundation:
     surfaceCraftEnabled?installPremiumSurfaceCraftsmanship:
     architecturalNeonEnabled?installArchitecturalNeonLighting:
     unifiedTunnelEnabled?installUnifiedTunnelMaterials:
     lightArchitectureEnabled?installCinematicLightArchitecture:
    trueMaterialDepthEnabled?installTrueMaterialDepthRebuild:
    physicalMaterialEnabled?installPhysicalMaterialRebuild:
    cinematicNeonEnabled?installCinematicNeonLighting:
    premiumMaterialRebirthEnabled?installPremiumMaterialRebirth:
    cinematicMotionEnabled?installCinematicEnergyMotion:
    integratedNeonFlowEnabled?installIntegratedNeonFlow:
    structuralTunnelEnabled?installStructuralTunnelRebuild:
   enclosedStationEnabled?
  (tunnelMegaEnabled?(neonInteriorEnabled?
    (tunnelSpectrumEnabled?(exteriorSealEnabled?installExteriorLightSeal:installNeonDrivenInterior):installClassicNeonInterior):
    installTunnelMegastructure):
   cinematicHeroEnabled?(cinematicGradeEnabled?installCinematicGradeHero:installCinematicHero):
   architecturalRebirthEnabled?installArchitecturalWorldArt:
   sculptedNeonEnabled?installSculptedNeonWorldArt:
   premiumNeonEnabled?installPremiumNeonWorldArt:
   graphiteGradeEnabled?installGraphiteWorldArt:
   ribbonWindowsEnabled?installRibbonWindowArt:
   observationWindowsEnabled?installObservationWorldArt:installEnclosedWorldArt):
  installWorldArt)(THREE,world,sharedOptions),{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt,
  roadMaterial:exteriorSealEnabled?premiumSurface?.material:null,
  vaultHeightClassic:new URLSearchParams(location.search).get("vaultHeight")==="classic"
 });
 // 0.26.4.1: darken original sealed titanium substrates and calibrate the
 // actual near-light GGX sources on the unchanged physical panels/ribs.
 // This happens after the original 0.26.2 material chain has installed.
 unifiedMetalLight=installUnifiedMetalLighting02641(THREE,world,stationWorld,{
  enabled:unifiedLightResponseEnabled,lowMemory:limitedMemory
 });
 // Existing rail paint now reduces its overbright white glare solely inside
 // the sealed tunnel. No collider, input, or global bloom pass changes.
 identitySurface?.setTunnelGlareScale?.(exteriorSealEnabled?
  EXTERIOR_SEAL_02122.railGlareInteriorScale:1);
 // 0.12.0's roadside sculptures resembled extra poles. Remove entirely;
 // the ship and camera now carry the visual identity with zero added draws.
 // Open space, no geological scenery, distant monuments or 3D floor.
 makeShip();
 // 0.21.2.5: suppress external white PBR specular on road and current
 // ship INSIDE this sealed 368m tunnel only. No world light/exposure edits.
 whiteCoreContainment=whiteCoreEnabled?createWhiteCoreContainment({
  roadMaterial:premiumSurface?.material,
  railSurface:identitySurface,
  ship
 }):null;
 shipWhiteSpill=shipWhiteSpillEnabled?createShipWhiteSpillController(THREE,ship):null;
 // 0.28.2: finite-source local color on existing physical ship, no key light.
 sharedShipLight=installSharedOpticalShip(THREE,ship,opticalContext,sharedShipLightEnabled);
 // Existing road-only shader; preserve rail, ship, local neon and wave emission.
 roadSolarSpill=roadSolarEnabled?createRoadSolarSpillController(premiumSurface.material):null;
 // Chain after the white-core and road solar seal PBR modifications.
 premiumRoadSurface=premiumRoadEnabled?createPremiumRoadSurfaceController(
  premiumSurface.material,{lowMemory:limitedMemory}):null;
 // 0.24.2 road-only portal/crown color reflections on the ORIGINAL deck.
 // Install after road solar seal and 0.21.5 finish; no world light changes.
 cinematicRoadReflections=cinematicRoadEnabled?
  createCinematicRoadReflectionController(premiumSurface.material,
   {lowMemory:limitedMemory}):null;
 // 0.26.3: unchanged indexed PBR deck, original banked physical LED sites.
 cinematicRoadRebuild=roadRebuildEnabled?
  createCinematicRoadReflectionRebuild0263(THREE,
   world.getObjectByName("Zone Ribbon · integrated PBR racing deck"),{
    positionAt,lowMemory:limitedMemory,
    vaultHeightClassic:new URLSearchParams(location.search)
     .get("vaultHeight")==="classic",
    legacy:cinematicRoadReflections
   }):null;
 // 0.28.2: reuse actual Skyline 0.26.3 GGX native material on the
 // unmodified Vault deck, real source positions over the entire 3400m.
 ({native:sharedRoadLight,finish:cinematicRoadFinish,straight:sharedStraightEdgeRoad,
  arch:archRoadReflections,cove:unifiedCeilingRoad,spill:roadSpill02895}=installSharedRoadOptics(
   THREE,world,opticalContext,{
    road:sharedRoadLightEnabled,cinematic:cinematicMetalReleaseEnabled,straight:straightParityReleaseEnabled,
    arch:archRoadReleaseEnabled,unifiedSources:unifiedSourcesReleaseEnabled,ceiling:unifiedCeilingRoadReleaseEnabled,
    ceilingFixtures:ceilingFixtureReleaseEnabled,spill:roadSpillReleaseEnabled,edgeOnly:surfaceFinish02898
   },{initialWave:zoneWave,previousCeiling:unifiedCeilingRoad,previousSpill:roadSpill02895}));
 // 0.28.9.6: same indexed PBR road, optically soften the original
 // edge-light mask before curves, and remove the periodic 3400m
 // antipodal palette jump; leave the white core/wave crest alone.
 curveContinuity02896=installCurveSurfaceContinuity02896(THREE,
  world.getObjectByName("Zone Ribbon · integrated PBR racing deck"),{
   enabled:curveContinuityReleaseEnabled&&!!sharedStraightEdgeRoad?.active&&
    !!unifiedCeilingRoad?.active,
   curveEnabled:new URLSearchParams(location.search).get("curveBlend")!=="classic",
   waveEnabled:new URLSearchParams(location.search).get("waveSeam")!=="classic"
  });
 if(curveContinuityReleaseEnabled&&!curveContinuity02896.active)
  throw Error("0.28.9.6 existing road continuity unavailable");
 // Subtle visible cyan inset rails and arch-foot amber floor pools, with
 // original indexed racing deck and road GGX left unmodified in classic mode.
 edgeFloorLighting=edgeFloorEnabled?
  (straightEdgesEnabled?installStraightOnlyEdgeLighting02633:
   edgeSourceRebuildEnabled?installRepositionedEdgeAndConnectedFoot02632:
   installEdgeLightingFloorPools02631)(THREE,world,
   world.getObjectByName("Zone Ribbon · integrated PBR racing deck"),{
    positionAt,lowMemory:limitedMemory,
    vaultHeightClassic:new URLSearchParams(location.search)
     .get("vaultHeight")==="classic",roadRebuild:cinematicRoadRebuild
  }):null;
 // Matte only this rail's PBR shell inside the first 368m. The colored
 // inlay remains the same native zone-wave material and draw batch.
 identitySurface?.setRailBodyContainment?.(railBodyContainmentEnabled?1:0);
 // Two-batch, translucent personal ghost with no physical collider or AI.
 ghostVisual=createPersonalGhostVisual(THREE,scene);
 spaceBackdrop=installSpaceBackdrop(THREE,camera);
 // Global light fades do not affect engine point lights or emitted neon.
 tunnelBlackout=(unifiedTunnelLightingEnabled?
    createUnifiedTunnelLightingController:createTunnelBlackoutController)({
    worldLights,camera,bladeTips,
    // The active controller is reconstructed once after scenery setup.
    // It too must use the same full-lap Vault-only no-sun profile.
    ...(isVault()?{levelsAt:vaultLightLevels0270}:{})
   });
 // HDR multilayer bloom renders *after* the beauty pass and before tone mapping.
 neonPipeline=createNeonPipeline(THREE,renderer,scene,camera,{
  lowMemory:limitedMemory,forceFullBloom:perfSettings.preset==="bloom-full"
 });
 neonPipeline.resize(innerWidth,innerHeight);
 // Selective HDR velocity pass between SMAA and OutputPass; off when idle.
 velocityCinematography=velocityExperience?installTrueVelocityMotionBlur(THREE,neonPipeline,camera,{mode:velocityExperience.motionBlur}):installVelocityCinematography(THREE,neonPipeline,{
  enabled:velocityCinemaEnabled,lowMemory:limitedMemory
 });
 velocityCinematography.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);
 // P4 grade follows P3 optional blur, still before the original OutputPass.
 unifiedCinematicGrade=installUnifiedCinematicGrade(THREE,neonPipeline,{
  enabled:unifiedGradeEnabled,lowMemory:limitedMemory
 });
 unifiedCinematicGrade.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);
 // Pass 4: fine chromatic grade and bounded HDR fixture response. The
 // existing UnrealBloomPass, SMAA, unified grade and OutputPass are retained.
 finalCohesion=installFinalCohesion0264(THREE,neonPipeline,world,{
  enabled:finalCohesionEnabled,lowMemory:limitedMemory
 });
 finalCohesion.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);
 // 0.26.4.2: uses original PBR coats, indexed GGX road and the EXISTING
 // connected amber geometry, after the physical light and HDR pipeline.
 premiumReflectionFinish=installPremiumReflectionFinish02642(
  THREE,world,world.getObjectByName("Zone Ribbon · integrated PBR racing deck"),{
   enabled:reflectionFinishEnabled,lowMemory:limitedMemory,
   metalState:unifiedMetalLight,roadRebuild:cinematicRoadRebuild,
   straightEdges:edgeFloorLighting,finalCohesion
  });
 // 0.26.4.3: same real sources, physical metal and banked road.
 fixtureTransport=installUnifiedFixtureTransport02643(
  THREE,world,world.getObjectByName("Zone Ribbon · integrated PBR racing deck"),{
   enabled:fixtureTransportEnabled,lowMemory:limitedMemory,
   metalState:unifiedMetalLight,roadRebuild:cinematicRoadRebuild,
   reflectionFinish:premiumReflectionFinish,straightEdges:edgeFloorLighting
  });
 // 0.26.5: original anti-sunlight rail metal, straight-only cyan inlays
 // and physical 0.26.1 wall GGX. No changed driving or collision geometry.
 trueRailWall=installTrueRailWallResponse0265(THREE,world,{
  enabled:railWallResponseEnabled,lowMemory:limitedMemory,positionAt,
  identitySurface,stationWorld,fixtureTransport,straightEdges:edgeFloorLighting
 });
 markStartup("roadAndFixturesReady");
 if(window.__skyshiftBoot?.deferred)await raceLoadingStage("BAKING LOCAL REFLECTIONS",4);
 // 0.28.4 PMREM is captured ONCE from the already built original
 // Skyline-shaped Vault, after all source fixtures/physical shaders exist.
 // Only actual tunnel PBR coats + the hull use the resulting CubeUV.
 // Never set scene.environment or touch the indexed road or boost arrows.
 pmremPipeline=finalizeSharedOptics(THREE,renderer,scene,world,opticalContext,{
  track:TRACK_ID_0160,ship,tunnel:trueSharedVault,pmremEnabled,
  finish:cinematicRoadFinish,markStartup,
  cinematic:cinematicMetalReleaseEnabled?{
   contrast:cinematicComponentEnabled0289("cinematicContrast",location.search)?1:0,
   strips:cinematicComponentEnabled0289("cinematicStrips",location.search)?1:0,
   road:cinematicComponentEnabled0289("cinematicRoad",location.search)?1:0
  }:null
 });
 if(perfSettings.enabled){
  if(perfSettings.preset==="no-bloom")neonPipeline.bloom.enabled=false;
  if(perfSettings.preset==="no-smaa")neonPipeline.smaa.enabled=false;
  if(perfSettings.preset==="low-dpr")
   neonPipeline.setInternalPixelRatio(Math.min(1,claritySettings.renderDpr),innerWidth,innerHeight);
  perfPanel=document.createElement("div");
  perfPanel.id="skyshift-perf-panel";
  perfPanel.style.cssText="position:fixed;top:55px;left:10px;z-index:25;pointer-events:none;white-space:pre-line;padding:7px;max-width:245px;border:1px solid #6db9dd99;border-radius:6px;background:#061420e8;color:#effaff;font:11px/1.4 monospace";
  perfPanel.textContent="SKYSHIFT PERF / "+perfSettings.preset;
  if(VAULT_COMPACT_ACTIVE&&new URLSearchParams(location.search).get('perfPanel')!=='1'){perfPanel=null;}
  else document.body.appendChild(perfPanel);
 }
 gpuClock=createGpuTimer(renderer.getContext(),perfSettings.enabled||smartPerformance?.diagnostics===true);
 if(smartPerformance)trackVisibility=createTrackSectionVisibility(THREE,world,trueSharedVault.root,{occlusion:advancedGpu?createTunnelOcclusion(THREE,trueSharedVault.root):null});
 if(advancedGpu){detailLod=createDistantDetailLod(THREE,world,trueSharedVault.root);applyAdvancedBloom();}
 // Non-interactive rendering diagnostic for browser CI and exported audits.
 window.__skyshiftClarityInfo=()=>clarityAudit(claritySettings,neonPipeline);
 runtimeLifetime.listen(window,"resize",resize);
 sceneReady=true;
 markStartup("sceneReady");
 if(resourceSmoke)window.__skyshiftResourceAudit=()=>({
  lifetime:runtimeLifetime.audit(),teardown:{...teardownReport},
  atlas:premiumMetalTexturePoolStats0262(THREE),ship:shipArtController.audit(),
  renderer:renderer?{...renderer.info.memory,programs:renderer.info.programs?.length??null}:null,
  objects:scene?.children?.length??0,activeShip:activeShipId,mode:uiState.mode,
  stamps:{...startupMarks},frame:resourceFrame,lastShipRelease,
  bindingCounts:{pmrem:pmremPipeline?.stats?.().shipMaterials??0,local:sharedShipLight?.stats?.().physicalHullMaterials??0}
 });
 // Source-of-truth 0.28.0 plan/installer audit for every current
 // course, including Aurora's deliberately empty tunnel inventory.
 if(new URLSearchParams(location.search).get("sharedTunnelSmoke")==="1")
  window.__skyshiftSharedTunnelAudit=()=>({
   ...sharedTunnelRuntime?.audit?.(),
   sharedRequested:sharedTunnelEnabled,
   originalRoadMaterial:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),originalGrip:Boolean(UI.grip),
   originalCourseMeters:CIRCUIT.lapLength,
   actualOriginalSourceActive:!!trueSharedVault?.active,
   sharedRoadReflections0282:sharedRoadLight?.stats?.()??null,
   sharedShipLighting0282:sharedShipLight?.stats?.()??null,
   pmrem0284:pmremPipeline?.stats?.()??null,
   centralSource:TUNNEL_SHARED_ARCHITECTURE_0280
  });
 // 0.28.9.6: actual indexed road A/B without moving camera or wavefront.
 if(new URLSearchParams(location.search).get("curveContinuitySmoke")==="1"){
  window.__skyshiftCurveContinuityAudit=()=>({
   release:CURVE_CONTINUITY_02896.version,
   requested:curveContinuityReleaseEnabled,
   road:curveContinuity02896?.stats?.()??null,
   originalEdge:sharedStraightEdgeRoad?.stats?.()??null,
   originalSpill:roadSpill02895?.stats?.()??null,
   originalArch:archRoadReflections?.stats?.()??null,
   originalCeiling:unifiedCeilingRoad?.stats?.()??null,
   originalShip:!!ship,originalGrip:!!UI.grip,physics:flight?.s!==undefined,
   originalRoadMaterial:premiumSurface?.material?.type??null
  });
  window.__skyshiftCurveContinuityFrameProof=()=>{
   if(!curveContinuity02896?.active||!neonPipeline?.render)
    throw Error("0.28.9.6 real wave/curve same-frame proof unavailable");
   const initial=curveContinuity02896.stats();
   const render=(curve,wave)=>{
    curveContinuity02896.setComparison({curve,wave});
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:render(0,0),curveOnly:render(1,0),
    waveOnly:render(0,1),after:render(1,1),
    audit:window.__skyshiftCurveContinuityAudit(),s:flight?.s};}
   finally{
    curveContinuity02896.setComparison({
     curve:initial.curveStrength,wave:initial.waveStrength});
    neonPipeline.render(0);
   }
  };
 }
 // 0.28.9.5: real WebGL independent lip spill + wave-cove comparisons.
 if(new URLSearchParams(location.search).get("roadSpillWaveSmoke")==="1"){
  window.__skyshiftRoadSpillWaveAudit=()=>({
   release:ROAD_SPILL_COVE_02895.version,
   requested:roadSpillReleaseEnabled&&coveWaveReleaseEnabled,
   spill:roadSpill02895?.stats?.()??null,
   cove:trueSharedVault?.stats?.().waveCoupledWallCoves02895??null,
   edge:trueSharedVault?.stats?.().straightOnlyCyan02891??null,
   ceiling:unifiedCeilingRoad?.stats?.()??null,
   originalShip:!!ship,originalGrip:!!UI.grip,
   currentWave:zoneWave.shaderBaseStage,
   originalRoadMaterial:premiumSurface?.material?.type??null
  });
  window.__skyshiftRoadSpillWaveFrameProof=()=>{
   if(!roadSpill02895?.active||!trueSharedVault?.active||!neonPipeline?.render)
    throw Error("0.28.9.5 genuine physical before/after unavailable");
   const initialRoad=roadSpill02895.stats().strength;
   const initialCove=trueSharedVault.stats().waveCoupledWallCoves02895.sample?.enabled??1;
   const render=(road,cove)=>{
    roadSpill02895.setComparison(road);
    trueSharedVault.setWaveCoveComparison(cove);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:render(0,0),spillOnly:render(1,0),
    coveOnly:render(0,1),after:render(1,1),
    audit:window.__skyshiftRoadSpillWaveAudit(),s:flight?.s};}
   finally{
    roadSpill02895.setComparison(initialRoad);
    trueSharedVault.setWaveCoveComparison(initialCove);
    neonPipeline.render(0);
   }
  };
 }
 // 0.28.9.4 same-camera old additive overlay vs ceiling GGX.
 if(new URLSearchParams(location.search).get("unifiedSourcesSmoke")==="1"){
  window.__skyshiftUnifiedSourcesAudit=()=>({
   requested:unifiedSourcesReleaseEnabled,
   release:UNIFIED_SOURCES_02894.version,
   oldRoad:unifiedLegacyRoad?.stats?.()??null,
   ceilingRoad:unifiedCeilingRoad?.stats?.()??null,
   movedCeiling:trueSharedVault?.stats?.().ceilingFixtureCohesion02892??null,
   arch:archRoadReflections?.stats?.()??null,
   edges:sharedStraightEdgeRoad?.stats?.()??null,
   source:trueSharedVault?.stats?.().straightOnlyCyan02891??null,
   originalRoad:premiumSurface?.material?.type??null,
   shipPresent:!!ship,gripPresent:!!UI.grip,
   originalPhysics:flight?.s!==undefined
  });
  window.__skyshiftUnifiedSourcesFrameProof=()=>{
   if(!unifiedSourcesReleaseEnabled||!neonPipeline?.render||
      !unifiedCeilingRoad?.active||!unifiedLegacyRoad?.active)
    throw Error("0.28.9.4 native old-road/ceiling A/B unavailable");
   const originalCeiling=unifiedCeilingRoad.stats().strength;
   const originalLegacy=unifiedLegacyRoad.stats().removedBatches>0?1:0;
   const render=(legacyClean,ceiling)=>{
    unifiedLegacyRoad.setComparison(legacyClean);
    unifiedCeilingRoad.setComparison(ceiling);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:render(0,0),cleanOnly:render(1,0),
    sourceOnly:render(0,1),after:render(1,1),
    audit:window.__skyshiftUnifiedSourcesAudit(),s:flight?.s};}
   finally{
    unifiedLegacyRoad.setComparison(originalLegacy);
    unifiedCeilingRoad.setComparison(originalCeiling);
    neonPipeline.render(0);
   }
  };
 }
 // 0.28.9.3 real arch/road optical QA and independent legacy layer.
 if(new URLSearchParams(location.search).get("archOpticsSmoke")==="1"){
  window.__skyshiftArchOpticsAudit=()=>({
   track:TRACK_ID_0160,requested:archOpticsReleaseEnabled,
   source:trueSharedVault?.stats?.().premiumArchOptics02893??null,
   road:archRoadReflections?.stats?.()??null,
   legacyRoadResponseCount:archLegacyOverlay?.count??0,
   legacyRoadResponseSuppressed:archLegacyOverlay?.suppressed??false,
   edge:trueSharedVault?.stats?.().straightOnlyCyan02891??null,
   originalShip:!!ship,originalGrip:!!UI.grip,
   originalPhysics:flight?.s!==undefined,definition:ARCH_OPTICS_02893
  });
  window.__skyshiftArchOpticsSetStage=(stage,front)=>{
   if(uiState.mode!=="playing"||!Number.isInteger(stage)||
      stage<0||stage>=ZONE_PALETTES.length-1||
      !Number.isFinite(front))throw Error("0.28.9.3 QA requires a playable real wave stage");
   zoneWave.shaderBaseStage=stage;zoneWave.playerStage=stage;
   zoneWave.activeCount=1;zoneWave.fronts[0]=front;
   zoneWave.fronts[1]=-10000;zoneWave.fronts[2]=-10000;
   premiumSurface?.setWaveState(zoneWave);
   identitySurface?.setWaveState(zoneWave);
   stationWorld?.updateWave?.(zoneWave);
   sharedTunnelRuntime?.updateWave?.(zoneWave);
   archRoadReflections?.updateWave?.(zoneWave);
 unifiedCeilingRoad?.updateWave?.(zoneWave);
 roadSpill02895?.updateWave?.(zoneWave);
   return window.__skyshiftArchOpticsAudit();
  };
  window.__skyshiftArchOpticsFrameProof=()=>{
   if(!archOpticsReleaseEnabled||!neonPipeline?.render||
       !archRoadReflections?.active)
    throw Error("0.28.9.3 original WebGL unavailable");
   const oldArch=trueSharedVault.stats().premiumArchOptics02893.source?.sourceStrength??1;
   const oldRoad=archRoadReflections.stats().strength;
   const sample=(arch,road)=>{
    trueSharedVault.setArchOpticsComparison(arch);
    archRoadReflections.setComparison(road);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:sample(0,0),archOnly:sample(1,0),
    roadOnly:sample(0,1),after:sample(1,1),
    audit:window.__skyshiftArchOpticsAudit(),s:flight?.s};}
   finally{
    trueSharedVault.setArchOpticsComparison(oldArch);
    archRoadReflections.setComparison(oldRoad);
    neonPipeline.render(0);
   }
  };
 }
 // 0.28.9.2 shared ceiling seams and moving palette smoke probe.
  if(new URLSearchParams(location.search).get("ceilingFixtureSmoke")==="1"){
   window.__skyshiftCeilingFixtureAudit=()=>({
    track:TRACK_ID_0160,requested:ceilingFixtureReleaseEnabled,
    source:trueSharedVault?.stats?.().ceilingFixtureCohesion02892??null,
    sharedWave:trueSharedVault?.stats?.().sharedWave0285??null,
    edge:trueSharedVault?.stats?.().straightOnlyCyan02891??null,
    originalShip:!!ship,originalGrip:!!UI.grip,
    definition:CEILING_FIXTURE_02892
   });
  }
  // 0.28.9.1 visual and geometric bend-clearance probe.
 // The underlying Skyline 0.26.3.3 source mask is adapted to Vault metres.
 if(new URLSearchParams(location.search).get("straightParitySmoke")==="1"){
  window.__skyshiftStraightParityProbe=()=>{
   const t=trueSharedVault?.stats?.()??{};
   const p=t.straightOnlyCyan02891??null;
   const r=sharedStraightEdgeRoad?.stats?.()??null;
   return {track:TRACK_ID_0160,requested:straightParityReleaseEnabled,
    source:p,road:r,originalRoad:sharedRoadLight?.stats?.()??null,
    metal:t.cinematicMetal0289??null,
    archFoot:t.archFootAssembly0287??null,
    precision:t.precisionNeon0288??null,
    stable:t.stableLuminous0286??null,
    wave:t.sharedWave0285??null,pmrem:!!pmremPipeline?.active,
    originalShip:!!ship,originalGrip:!!UI.grip,
    unchanged:{geometry:true,physics:true,boost:true,ship:true,
     orangeFoot:true,turnArrows:true},
    definition:STRAIGHT_EDGE_PARITY_02891
   };
  };
 }
 // 0.28.9: same-frame real game render with full 0.28.8 PMREM kept.
 // Tests image identity on zero-strength settings then enables components.
 if(new URLSearchParams(location.search).get("cinematicMetalSmoke")==="1"){
  window.__skyshiftCinematicMetalAudit=()=>{
   const tunnel=trueSharedVault?.stats?.()??{};
   return {track:TRACK_ID_0160,requested:cinematicMetalReleaseEnabled,
    tunnel:tunnel.cinematicMetal0289??null,
    road:cinematicRoadFinish?.stats?.()??null,
    originalShared:!!trueSharedVault?.active,
    originalSource:tunnel.precisionNeon0288??null,
    stableMetal:tunnel.stableLuminous0286??null,
    archFoot:tunnel.archFootAssembly0287??null,
    pmremActive:!!pmremPipeline?.active,
    zoneWave:tunnel.sharedWave0285?.active??false,
    originalShip:!!ship,grip:!!UI.grip,
    geometryUntouched:true,physicsUntouched:true,boostUntouched:true,
    newMeshes:0,newWorldLights:0,newRenderPasses:0,
    design:CINEMATIC_METAL_0289};
  };
  window.__skyshiftCinematicMetalFrames=()=>{
   if(!trueSharedVault?.stats?.().cinematicMetal0289?.active||
    !cinematicRoadFinish?.stats?.().active||!neonPipeline?.render)
    throw Error("0.28.9 real full source/road WebGL A/B unavailable");
   const originalTunnel=trueSharedVault.stats().cinematicMetal0289.strength;
   const originalRoad=cinematicRoadFinish.stats().strength;
   const render=(contrast,strips,road)=>{
    trueSharedVault.setCinematicMetalComparison({contrast,strips});
    cinematicRoadFinish.setComparison({road});
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    return {before:render(0,0,0),
     contrastOnly:render(originalTunnel.contrast,0,0),
     stripsOnly:render(0,originalTunnel.strips,0),
     roadOnly:render(0,0,originalRoad.road),
     after:render(originalTunnel.contrast,originalTunnel.strips,originalRoad.road),
     s:flight?.s??null,meta:window.__skyshiftCinematicMetalAudit()};
   }finally{
    trueSharedVault.setCinematicMetalComparison(originalTunnel);
    cinematicRoadFinish.setComparison(originalRoad);
   }
  };
 }
 // 0.28.8: exact same camera/frame native source shader comparison.
 // Only the small cove/L emission and original wall-masked GGX gains move.
 if(new URLSearchParams(location.search).get("precisionNeonSmoke")==="1"){
  window.__skyshiftPrecisionNeonAudit=()=>{
   const data=trueSharedVault?.stats?.()??{};
   return {track:TRACK_ID_0160,requested:precisionNeonReleaseEnabled,
    precision:data.precisionNeon0288??null,
    arch:data.archFootAssembly0287??null,
    stability:data.stableLuminous0286??null,
    originalShared:!!trueSharedVault?.active,
    pmremActive:!!pmremPipeline?.active,
    waveAligned:data.sharedWave0285?.active??false,
    originalShip:!!ship,grip:!!UI.grip,
    roadMaterial:premiumSurface?.material?.type??null,
    physicsUntouched:true,boostUntouched:true,
    originalGGX:true,originalPMREM:true,
    noExtraWorldLights:true,design:PRECISION_NEON_0288
   };
  };
  window.__skyshiftPrecisionNeonFrameProof=()=>{
   if(!trueSharedVault?.stats?.().precisionNeon0288?.active||
    !neonPipeline?.render)
    throw Error("0.28.8 true original-source WebGL comparison unavailable");
   const strength=trueSharedVault.stats().precisionNeon0288.strength;
   const capture=value=>{
    trueSharedVault.setPrecisionNeonComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {before:capture(0),after:capture(1),
    s:flight?.s??null,meta:window.__skyshiftPrecisionNeonAudit()};}
   finally{trueSharedVault.setPrecisionNeonComparison(strength);}
  };
 }
 // 0.28.7 native geometry QA only: replacing the existing L emitter
 // cannot be toggled by shader uniforms; compare independent launches
 // with &archFoot=classic at identical camera positions.
 if(new URLSearchParams(location.search).get("archFootSmoke")==="1"){
  window.__skyshiftArchFootAudit=()=>{
   const data=trueSharedVault?.stats?.()??{};
   return {track:TRACK_ID_0160,
    release:archFootAssemblyEnabled?"0.28.7":"legacy",
    requested:archFootAssemblyEnabled,
    arch:data.archFootAssembly0287??null,
    originalShared:!!trueSharedVault?.active,
    stability:data.stableLuminous0286??null,
    pmremActive:!!pmremPipeline?.active,
    waveAligned:data.sharedWave0285?.active??false,
    roadMaterial:premiumSurface?.material?.type??null,
    originalShip:!!ship,grip:!!UI.grip,
    replacedOriginalFoot:!!data.archFootAssembly0287?.active,
    physicsUntouched:true,boostUntouched:true,
    geometryTrackUntouched:true,addedWorldLights:0,
    design:ARCH_FOOT_0287
   };
  };
  window.__skyshiftArchFootFrameProof=()=>{
   if(!trueSharedVault?.stats?.().archFootAssembly0287?.active||
    !neonPipeline?.render)
    throw Error("0.28.7 original shared arch-foot A/B unavailable");
   const capture=value=>{
    trueSharedVault.setArchFootComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    return {old: capture(0),updated:capture(1),
     s:flight?.s??null,meta:window.__skyshiftArchFootAudit()};
   }finally{trueSharedVault.setArchFootComparison(1);}
  };
 }
 // 0.28.6: actual same-scene renderer A/B. Keep all positional
 // light sources, PMREM, zone wave, ship and physics UNCHANGED.
 if(new URLSearchParams(location.search).get("reflectionStabilitySmoke")==="1"){
  window.__skyshiftReflectionStabilityAudit=()=>({
   track:TRACK_ID_0160,
   requested:stabilityReleaseEnabled,
   release:stabilityReleaseEnabled?"0.28.6":"legacy",
   source:STABILITY_0286,
   tunnel:trueSharedVault?.stats?.().stableLuminous0286??null,
   originalShared:!!trueSharedVault?.active,
   pmremActive:!!pmremPipeline?.active,
   ship:!!ship,grip:!!UI.grip,
   roadMaterial:premiumSurface?.material?.type??null,
   physicsUntouched:true,boostUntouched:true,
   originalWave:sharedWaveParityEnabled
  });
  window.__skyshiftReflectionStabilityFrames=()=>{
   if(!trueSharedVault?.stats?.().stableLuminous0286?.active||
    !neonPipeline?.render)
    throw Error("0.28.6 stable source real WebGL A/B unavailable");
   const prev=trueSharedVault.stats().stableLuminous0286.strength;
   const capture=value=>{
    trueSharedVault.setReflectionComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),stable:capture(1),
    s:flight?.s??null,
    meta:window.__skyshiftReflectionStabilityAudit()};}
   finally{trueSharedVault.setReflectionComparison(prev);}
  };
 }
 // PMREM QA: exact-frame comparison with unchanged underlying scene,
 // camera, local GGX, bloom and zone wave. Does not advance the sim.
 if(new URLSearchParams(location.search).get("pmremSmoke")==="1"){
  window.__skyshiftPmremAudit=()=>({
   track:TRACK_ID_0160,release:pmremReleaseEnabled?"0.28.4":"legacy",
   requested:pmremEnabled,probe:pmremPipeline?.stats?.()??null,
   originalTunnelActive:!!trueSharedVault?.active,
   roadSourceActive:!!sharedRoadLight?.active,
   shipSourceActive:!!sharedShipLight?.active,
   roadMaterial:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),originalGrip:Boolean(UI.grip),
   raceMeters:CIRCUIT.lapLength,
   addedRenderPasses:0,changedPhysics:false,
   changedBoost:false,changedWhiteKey:false
  });
  window.__skyshiftPmremFrameProof=()=>{
   if(!pmremPipeline?.active||!neonPipeline?.render)
    throw Error("0.28.4 genuine PMREM A/B unavailable");
   const previous=pmremPipeline.stats().strength;
   const draw=value=>{
    pmremPipeline.setComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    return {classic:draw(0),pmrem:draw(1),
     s:flight?.s??null,track:TRACK_ID_0160,
     map:pmremPipeline.stats()};
   }finally{pmremPipeline.setComparison(previous);}
  };
 }
 // v0.28.5 wave regression: static geometry and fixed-clock spectral
 // stage, with a user-facing classic fallback (?waveSync=classic).
 // QA helpers exist ONLY behind an explicit smoke flag.
 if(new URLSearchParams(location.search).get("waveParitySmoke")==="1"){
  window.__skyshiftVaultWaveParityAudit=()=>{
   const t=sharedTunnelRuntime?.audit?.().trueSharedRenderer;
   const modules=t?.sharedWave0285?.modules??[];
   const front=zoneWave.fronts[0];
   const checks=modules.map(module=>{
    const sourceS=module.sourceMeters*.5;
    const globalS=module.start+module.scale*sourceS;
    const localSigned=waveSignedGlobal0285(sourceS,front,module,CIRCUIT.lapLength);
    const roadSigned=((globalS-front+CIRCUIT.lapLength*.5)%CIRCUIT.lapLength+
     CIRCUIT.lapLength)%CIRCUIT.lapLength-CIRCUIT.lapLength*.5;
    return {index:module.moduleIndex,globalS,localSigned,roadSigned,
     delta:Math.abs(localSigned-roadSigned)};
   });
   return {...VAULT_WAVE_PARITY_0285,
    track:TRACK_ID_0160,release:sharedWaveParityEnabled?"0.28.5":"legacy",
    enabled:sharedWaveParityEnabled,
    modules,tunnelPatches:t?.sharedWave0285?.patchedMaterials??0,
    originalSharedRendererActive:!!trueSharedVault?.active,
    nativeRoadWave:!!premiumSurface?.setWaveState,
    front,shaderBaseStage:zoneWave.shaderBaseStage,
    playerStage:zoneWave.playerStage,checks,
    physicsUntouched:true,gripUntouched:true,
    boostUntouched:true,roadGeometryUntouched:true,
    pmremUntouched:true,addedLights:0
   };
  };
  window.__skyshiftVaultWaveParitySetFront=(front)=>{
   if(uiState.mode!=="playing"||!Number.isFinite(front))
    throw Error("Wavefront QA requires running game and finite front");
   if(!isVault())throw Error("0.28.5 wavefront QA Vault only");
   zoneWave.waves=[{index:1,atSeconds:18,startS:front}];
   zoneWave.fronts[0]=front;
   zoneWave.fronts[1]=-10000;zoneWave.fronts[2]=-10000;
   zoneWave.shaderBaseStage=0;zoneWave.activeCount=1;
   zoneWave.playerStage=flight.s>front?1:0;
   zoneWave.lastStepSeconds=18.42;
   premiumSurface?.setWaveState(zoneWave);
   identitySurface?.setWaveState(zoneWave);
   sharedTunnelRuntime?.updateWave?.(zoneWave);
 archRoadReflections?.updateWave?.(zoneWave);
 unifiedCeilingRoad?.updateWave?.(zoneWave);
 roadSpill02895?.updateWave?.(zoneWave);
   refreshHud();
   return window.__skyshiftVaultWaveParityAudit();
  };
 }
 // QA-only real GPU A/B on identical camera frames, no flight changes.
 if(new URLSearchParams(location.search).get("sharedOpticsSmoke")==="1"){
  window.__skyshiftSharedOpticsAudit=()=>({
   track:TRACK_ID_0160,release:"0.28.2",
   requested:sharedOpticsEnabled,
   road:sharedRoadLight?.stats?.()??null,
   ship:sharedShipLight?.stats?.()??null,
   originalSourceActive:!!trueSharedVault?.active,
   originalRoad:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),originalGrip:Boolean(UI.grip),
   trackLength:CIRCUIT.lapLength,physicsUnchanged:true,
   whiteWorldLightsAdded:0
  });
  window.__skyshiftSharedOpticsFrameProof=(roadStrength=1,shipStrength=1)=>{
   if(!neonPipeline?.render||!sharedRoadLight?.active||
    !sharedShipLight?.active)throw Error("0.28.2 original road/ship absent");
   const roadPrev=sharedRoadLight.stats().strength,
    shipPrev=sharedShipLight.stats().strength;
   const render=(r,h)=>{
    sharedRoadLight.setComparison(r);sharedShipLight.setComparison(h);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:render(0,0),road:render(1,0),
    ship:render(0,1),both:render(roadStrength,shipStrength),
    s:flight?.s??null,track:TRACK_ID_0160};}
   finally{sharedRoadLight.setComparison(roadPrev);
    sharedShipLight.setComparison(shipPrev);}
  };
 }
 // 0.27.4: finish-only, same-frame A/B without altering 0.27.3.
 if(new URLSearchParams(location.search).get("vaultFinishSmoke")==="1")
  window.__skyshiftVaultFinishProbe=()=>({
   selected:TRACK_ID_0160,requested:vaultPremiumFinishEnabled,
   ...(vaultFullLighting?.stats?.().premiumFinish??{}),
   fullLighting:vaultFullLighting?.stats?.()??null,
   architecture:vaultArchitecture?.stats?.()??null,
   materialParity:vaultMaterialParity?.stats?.()??null,
   foundation:fullTunnelCircuit?.stats?.()??null,
   sunKeyScale:tunnelBlackout?.levels?.key??null,
   originalShip:Boolean(ship),originalGrip:Boolean(UI.grip),
   originalRoad:premiumSurface?.material?.type??null,
   raceMeters:TRIAL.raceLength,
   cameraDistanceToPilotMeters:camera&&flight?
    +Math.hypot(camera.position.x-flight.worldX,
      camera.position.z-flight.worldZ).toFixed(2):null
  });
 if(new URLSearchParams(location.search).get("vaultFinishFrameProof")==="1")
  window.__skyshiftVaultFinishFrameProof=()=>{
   if(!vaultFullLighting?.active||!vaultPremiumFinishEnabled||!neonPipeline?.render)
    throw Error("SKYSHIFT 0.27.4 true Vault finish not installed");
   const old=vaultFullLighting.stats().premiumFinish.enabledAmount;
   const draw=value=>{
    vaultFullLighting.setFinishComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(0),premium:draw(1),
    s:flight?.s??null,audit:vaultFullLighting.stats().premiumFinish};}
   finally{vaultFullLighting.setFinishComparison(old);neonPipeline.render(0);}
  };
 // 0.27.3 genuine GPU material + local 3400m fixture transport A/B.
 if(new URLSearchParams(location.search).get("vaultLightingSmoke")==="1")
  window.__skyshiftVaultLightingProbe=()=>({
   selected:TRACK_ID_0160,requested:vaultFullLightingEnabled,
   ...(vaultFullLighting?.stats?.()??{}),
   architecture:vaultArchitecture?.stats?.()??null,
   foundation:fullTunnelCircuit?.stats?.()??null,
   materialParity:vaultMaterialParity?.stats?.()??null,
   sunKeyScale:tunnelBlackout?.levels?.key??null,
   originalShip:Boolean(ship),originalGrip:Boolean(UI.grip),
   originalRoad:premiumSurface?.material?.type??null,
   raceMeters:TRIAL.raceLength,
   cameraDistanceToPilotMeters:camera&&flight?
    +Math.hypot(camera.position.x-flight.worldX,
      camera.position.z-flight.worldZ).toFixed(2):null
  });
 if(new URLSearchParams(location.search).get("vaultLightingFrameProof")==="1")
  window.__skyshiftVaultLightingFrameProof=()=>{
   if(!vaultFullLighting?.active||!neonPipeline?.render)
    throw Error("SKYSHIFT 0.27.3 real GGX source lights not installed");
   const old=vaultFullLighting.stats().strength;
   const draw=v=>{
    vaultFullLighting.setComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(0),lighting:draw(1),
    s:flight?.s??null,audit:vaultFullLighting.stats()};}
   finally{vaultFullLighting.setComparison(old);neonPipeline.render(0);}
  };
 // 0.27.2 reusable Skyline HARD-SURFACE architecture, real in-game
 // same-frame A/B; never touches ship, road or racing simulation.
 if(new URLSearchParams(location.search).get("vaultArchitectureSmoke")==="1")
  window.__skyshiftVaultArchitectureProbe=()=>({
   selected:TRACK_ID_0160,requested:vaultArchitectureEnabled,
   ...(vaultArchitecture?.stats?.()??{}),
   materialParity:vaultMaterialParity?.stats?.()??null,
   foundation:fullTunnelCircuit?.stats?.()??null,
   sunKeyScale:tunnelBlackout?.levels?.key??null,
   originalShip:Boolean(ship),gripPresent:Boolean(UI.grip),
   originalRoad:premiumSurface?.material?.type??null,
   raceDistance:TRIAL.raceLength,
   cameraDistanceToPilotMeters:camera&&flight?
    +Math.hypot(camera.position.x-flight.worldX,
      camera.position.z-flight.worldZ).toFixed(2):null
  });
 if(new URLSearchParams(location.search).get("vaultArchitectureFrameProof")==="1")
  window.__skyshiftVaultArchitectureFrameProof=()=>{
   if(!vaultArchitecture?.active||!neonPipeline?.render)
    throw Error("0.27.2 real source geometry not installed");
   const old=vaultArchitecture.stats().strength;
   const draw=v=>{
    vaultArchitecture.setComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(0),architecture:draw(1),
    s:flight?.s??null,stats:vaultArchitecture.stats()};}
   finally{vaultArchitecture.setComparison(old);neonPipeline.render(0);}
  };
 // 0.27.1 material-only QA and deterministic same-frame toggle.
 if(new URLSearchParams(location.search).get("vaultMaterialSmoke")==="1")
  window.__skyshiftVaultMaterialProbe=()=>({
   selected:TRACK_ID_0160,requested:vaultMaterialParityEnabled,
   ...(vaultMaterialParity?.stats?.()??{}),
   foundation:fullTunnelCircuit?.stats?.()??null,
   rail:identitySurface?.getRailBodyContainment?.()??null,
   solar:tunnelBlackout?.levels?.key??null,
   road:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),
   originalGrip:Boolean(UI.grip),
   originalTrackLength:CIRCUIT.lapLength
  });
 if(new URLSearchParams(location.search).get("vaultMaterialFrameProof")==="1")
  window.__skyshiftVaultMaterialFrameProof=()=>{
   if(!vaultMaterialParity?.active||!neonPipeline?.render)
    throw Error("0.27.1 material parity not installed");
   const before=vaultMaterialParity.stats().strength;
   const render=v=>{
    vaultMaterialParity.setComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:render(0),parity:render(1),s:flight?.s??null,
    state:vaultMaterialParity.stats()};}
   finally{vaultMaterialParity.setComparison(before);neonPipeline.render(0);}
  };
 // 0.27.0 QA-only: read the real 3D chunk/track invariants.
 if(new URLSearchParams(location.search).get("fullTunnelSmoke")==="1")
  window.__skyshiftFullTunnelProbe=()=>({
   selected:TRACK_ID_0160,requested:fullTunnelFoundationEnabled,
   ...(fullTunnelCircuit?.stats?.()??{}),
   circuit:CIRCUIT.id,lapMeters:CIRCUIT.lapLength,
   totalMeters:TRIAL.raceLength,roadMesh:premiumSurface?.material?.type,
   intactRail:Boolean(identitySurface?.setWaveState),
   originalShip:Boolean(ship),noJump:GAPS.length===0,
   originalGripAvailable:Boolean(UI.grip),
   worldChildren:world?.children?.length??0,
    vaultGlobalLightSeal:isVault()?VAULT_LIGHT_SEAL_0270:null,
    ambientScale:tunnelBlackout?.levels?.ambient??null,
    sunKeyScale:tunnelBlackout?.levels?.key??null,
    cameraDistanceToPilotMeters:camera&&flight?
     +Math.hypot(camera.position.x-flight.worldX,
      camera.position.z-flight.worldZ).toFixed(2):null
  });
 if(new URLSearchParams(location.search).get("fullTunnelFrameProof")==="1")
  window.__skyshiftFullTunnelFrameProof=()=>{
   if(!fullTunnelCircuit?.active||!neonPipeline?.render)
    throw Error("SKYSHIFT 0.27.0 tunnel not rendered");
   neonPipeline.render(0);
   return {image:renderer.domElement.toDataURL("image/png").split(",")[1],
    s:flight?.s??null,world:fullTunnelCircuit.stats()};
  };
 // 0.20.5 authored glTF world inspection, deliberately QA-only.
 if(new URLSearchParams(location.search).get("artSmoke")==="1")
  window.__skyshiftArtProbe=()=>({
   enabled:rebirthEnabled,track:TRACK_ID_0160,
   ...(stationWorld?.stats?.()??{active:false,status:"classic",installedBays:0,drawBatches:0}),
   variant:shipWhiteSpillEnabled?"ship-white-spill-contained":
    railBodyContainmentEnabled?"rail-body-highlight-contained":
    whiteCoreEnabled?"white-core-contained-tunnel":
    exteriorSealEnabled?"sealed-neon-tunnel":
    tunnelSpectrumEnabled?"neon-wave-interior":
    neonInteriorEnabled?"neon-driven-interior":
    tunnelMegaEnabled?"continuous-vault-tunnel":
    cinematicGradeEnabled?"cinematic-material-light":
    cinematicHeroEnabled?"cinematic-megastructure":
    architecturalRebirthEnabled?"architectural-rebirth":
    sculptedNeonEnabled?"sculpted-premium-neon":
    premiumNeonEnabled?"premium-integrated-neon":
    graphiteGradeEnabled?"graphite-regrade":
    ribbonWindowsEnabled?"ribbon-cleanup":
    (observationWindowsEnabled?"observation-balance":
     enclosedStationEnabled?"enclosed":"classic-open"),
   importedMeshes:(world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1")??
    world.getObjectByName("SKYSHIFT · Cinematic Megastructure 0.21.0-A")??
    world.getObjectByName("CONTINUUM STATION · Architectural Rebirth 0.20.5")??
    world.getObjectByName("CONTINUUM STATION · Sculpted Neon 0.20.4.1")??
    world.getObjectByName("CONTINUUM STATION · Integrated Neon 0.20.4")??
    world.getObjectByName("CONTINUUM STATION · Graphite Regrade 0.20.3")??
    world.getObjectByName("CONTINUUM STATION · Ribbon Cleanup 0.20.2.1")??
    world.getObjectByName("CONTINUUM STATION · Observation Balance 0.20.2")??
    world.getObjectByName("CONTINUUM STATION · Architectural Depth 0.20.1")??
    world.getObjectByName("CONTINUUM STATION · World Art 0.20.0"))?.children
    .map(x=>({name:x.name,vertices:x.geometry?.attributes?.position?.count??0,
     isInstanced:!!x.isInstancedMesh,
     roadConforming:!!x.geometry?.userData?.trackConforming,
     metallic:x.material?.metalness??null,roughness:x.material?.roughness??null,
     emissive:x.material?.emissive?.getHex?.()??null,
     firstVertexRgb:x.geometry?.attributes?.color?
      [x.geometry.attributes.color.getX(0),x.geometry.attributes.color.getY(0),
       x.geometry.attributes.color.getZ(0)]:null}))??[],
   legacyDecorDisabled:!signatureEnvironment&&!cinematicWorld&&!orbitalHero
  });
 // 0.21.2.5 same-frame ship source isolation, QA only.
 if(new URLSearchParams(location.search).get("shipSourceSmoke")==="1")
  window.__skyshiftShipSourceSmoke=()=>{
   if(!ship||!neonPipeline?.render||!renderer?.domElement)
    throw Error("Ship/source not ready");
   const mats=new Set(),parts=[];
   ship.traverse(obj=>{
    if(obj.isMesh){
     parts.push(obj);
     const a=Array.isArray(obj.material)?obj.material:[obj.material];
     for(const m of a)if(m)mats.add(m);
    }
   });
   const store=[...mats].map(m=>({
    m,roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat,
    clearcoatRoughness:m.clearcoatRoughness,emissiveIntensity:m.emissiveIntensity
   }));
   const levels={ambient:worldLights.ambient.intensity,
    key:worldLights.key.intensity,fill:worldLights.fill.intensity};
   const engines=engineLights.map(x=>x.intensity);
   const originalVisible=parts.map(m=>m.visible);
   const report=store.map(({m})=>({
    name:m.name||"",type:m.type,clearcoat:m.clearcoat??null,
    roughness:m.roughness??null,metalness:m.metalness??null
   }));
   const modes=["baseline","noKey","noWorld","noEngines","noCoat",
    "matteHull","noPolishArmor","noSeams","noShip"];
   const captures={};
   try{
    for(const mode of modes){
     for(const x of store){
      const {m}=x;
      if(x.roughness!==undefined)m.roughness=x.roughness;
      if(x.metalness!==undefined)m.metalness=x.metalness;
      if(x.clearcoat!==undefined)m.clearcoat=x.clearcoat;
      if(x.clearcoatRoughness!==undefined)m.clearcoatRoughness=x.clearcoatRoughness;
      m.needsUpdate=true;
     }
     for(let i=0;i<parts.length;i++)parts[i].visible=originalVisible[i];
     worldLights.ambient.intensity=levels.ambient;
     worldLights.key.intensity=levels.key;
     worldLights.fill.intensity=levels.fill;
     engineLights.forEach((x,i)=>x.intensity=engines[i]);
     if(mode==="noKey")worldLights.key.intensity=0;
     if(mode==="noWorld")worldLights.key.intensity=
      worldLights.fill.intensity=worldLights.ambient.intensity=0;
     if(mode==="noEngines")engineLights.forEach(x=>x.intensity=0);
     if(mode==="noCoat"||mode==="matteHull")
      for(const x of store){
       const m=x.m;
       if(!m.isMeshPhysicalMaterial&&!m.isMeshStandardMaterial)continue;
       if(mode==="matteHull"){
        if(m.roughness!==undefined)m.roughness=.94;
        if(m.metalness!==undefined)m.metalness=.06;
       }
       if(m.clearcoat!==undefined)m.clearcoat=0;
       if(m.clearcoatRoughness!==undefined)m.clearcoatRoughness=1;
       m.needsUpdate=true;
      }
     if(mode==="noPolishArmor")
      for(const part of parts)if(/Premium bevelled shoulder armour/.test(part.name))
       part.visible=false;
     if(mode==="noSeams")
      for(const part of parts)if(/seams|luminescen|luminou/i.test(part.name))
       part.visible=false;
     if(mode==="noShip")for(const part of parts)part.visible=false;
     neonPipeline.render(0);
     captures[mode]=renderer.domElement.toDataURL("image/png").split(",")[1];
    }
    return {shipId:activeShipId,materials:report,captures,
     zone:flight.zoneIndex??null,s:flight.s};
   }finally{
    for(const x of store){
     const {m}=x;
     if(x.roughness!==undefined)m.roughness=x.roughness;
     if(x.metalness!==undefined)m.metalness=x.metalness;
     if(x.clearcoat!==undefined)m.clearcoat=x.clearcoat;
     if(x.clearcoatRoughness!==undefined)m.clearcoatRoughness=x.clearcoatRoughness;
     m.needsUpdate=true;
    }
    for(let i=0;i<parts.length;i++)parts[i].visible=originalVisible[i];
    worldLights.ambient.intensity=levels.ambient;
    worldLights.key.intensity=levels.key;
    worldLights.fill.intensity=levels.fill;
    engineLights.forEach((x,i)=>x.intensity=engines[i]);
   }
  };
 // 0.21.4: QA-only identical-frame view with/without integrated neons.
 if(new URLSearchParams(location.search).get("flowFrameProof")==="1")
  window.__skyshiftFlowFrameProof=()=>{
   if(!integratedNeonFlowEnabled||!neonPipeline?.render)
    throw Error("Neon flow same-frame proof unavailable");
   const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
   const strips=group?.children?.filter(o=>o.name==="Tunnel / FLOW_CORES"||
    o.name==="Tunnel / FLOW_RECESSES")??[];
   if(!strips.some(x=>x.name==="Tunnel / FLOW_CORES"))
    throw Error("Integrated neon core missing");
   const previous=strips.map(m=>m.visible);
   const draw=enabled=>{
    strips.forEach(m=>m.visible=enabled);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {baseline:draw(false),flow:draw(true),
    meshes:strips.length,trackS:flight?.s??null}}
   finally{strips.forEach((m,i)=>m.visible=previous[i])}
  };
 // 0.21.3: same-frame structural art-only comparison, no simulation step.
 if(new URLSearchParams(location.search).get("structureFrameProof")==="1")
  window.__skyshiftStructureFrameProof=()=>{
   if(!structuralTunnelEnabled||!neonPipeline?.render)
    throw Error("Structural tunnel same-frame proof unavailable");
   const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
   const meshes=group?.children?.filter(o=>
    o.name==="Tunnel / HARDSURFACE_PANELS"||
    o.name==="Tunnel / STRUCTURAL_CONDUITS")??[];
   if(!meshes.length)throw Error("Structural tunnel meshes absent");
   const original=meshes.map(m=>m.visible);
   const draw=active=>{
    for(const m of meshes)m.visible=active;
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(false),structural:draw(true),
    panels:meshes.length,trackS:flight?.s??null}}
   finally{meshes.forEach((m,i)=>m.visible=original[i])}
  };
 // 0.22.0 Pass 4: exact-frame original-versus-graded HDR QA.
 if(new URLSearchParams(location.search).get("unifiedGradeSmoke")==="1")
  window.__skyshiftUnifiedGradeProbe=()=>({
   requested:unifiedGradeEnabled,
   ...(unifiedCinematicGrade?.stats?.()??{active:false}),
   outputFinal:neonPipeline?.composer?.passes?.at(-1)===neonPipeline?.output,
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   blurBeforeGrade:!velocityCinematography?.active||
    (velocityCinematography.stats().passIndex<(unifiedCinematicGrade?.stats?.().passIndex??1000))
  });
 if(new URLSearchParams(location.search).get("unifiedGradeFrameProof")==="1")
  window.__skyshiftUnifiedGradeFrameProof=()=>{
   if(!unifiedCinematicGrade?.active||!neonPipeline?.render)
    throw Error("Unified Grade same-frame proof unavailable");
   const before=unifiedCinematicGrade.stats();
   const take=on=>{
    unifiedCinematicGrade.setComparison(on);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    unifiedCinematicGrade.setQualityLevel(0);
    unifiedCinematicGrade.update({playing:true,
     speedMultiplier:2.5,boostMultiplier:1.4});
    return {classic:take(0),graded:take(1),flightS:flight?.s??null};
   }finally{
    unifiedCinematicGrade.setQualityLevel(before.qualityLevel);
    unifiedCinematicGrade.update({playing:uiState.mode==="playing",
     speedMultiplier:velocityPresentationRatio(flight?.currentSpeed??TRIAL.startSpeed),
     boostMultiplier:Math.max(flight?.boostMultiplier??1,
      flight?.landingBoostMultiplier??1)});
    unifiedCinematicGrade.setComparison(before.comparison);
   }
  };
 // 0.22.0 Pass 3: same camera/ship/wave, only optional velocity pass toggled.
 if(new URLSearchParams(location.search).get("velocityCinemaSmoke")==="1")
  window.__skyshiftVelocityCinemaProbe=()=>({
   requested:velocityCinemaEnabled,
   ...(velocityCinematography?.stats?.()??{active:false}),
   rendererDpr:neonPipeline?.internalPixelRatio??null,
   outputFinal:neonPipeline?.composer?.passes?.at(-1)===neonPipeline?.output,
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("velocityCinemaFrameProof")==="1")
  window.__skyshiftVelocityCinemaFrameProof=()=>{
   if(!velocityCinematography?.active||!neonPipeline?.render)
    throw Error("Velocity Cinematography same-frame proof unavailable");
   const before=velocityCinematography.stats();
   const take=enabled=>{
    velocityCinematography.setComparison(enabled);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    velocityCinematography.setQualityLevel(0);
    velocityCinematography.update({playing:true,
     speedMultiplier:3.1,boostMultiplier:1.40});
    return {classic:take(0),cinematic:take(1),
     flightS:flight?.s??null,velocity:3.1};
   }finally{
    velocityCinematography.setQualityLevel(before.qualityLevel);
    velocityCinematography.update({playing:uiState.mode==="playing",
     speedMultiplier:velocityPresentationRatio(flight?.currentSpeed??TRIAL.startSpeed),
     boostMultiplier:Math.max(flight?.boostMultiplier??1,
      flight?.landingBoostMultiplier??1)});
    velocityCinematography.setComparison(before.comparison);
   }
  };
 // 0.26.0 pass 1: exact same-camera dual tone vs the 0.25.1 scene.
 if(new URLSearchParams(location.search).get("dualToneSmoke")==="1")
  window.__skyshiftDualToneProbe=()=>({
   requested:dualToneEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("dualToneFrameProof")==="1")
  window.__skyshiftDualToneFrameProof=()=>{
   if(!dualToneEnabled||!stationWorld?.setDualToneComparison||
      !stationWorld.stats().dualTone0260Enabled||!neonPipeline?.render)
    throw Error("0.26.0 same-frame dual-tone proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.0 original road deck unavailable");
   const prior=stationWorld.stats().dualTone0260Strength;
   const oldMaterial=deck.material,oldVisible=deck.visible;
   const oldTarget=renderer.getRenderTarget();
   let maskMaterial=null;
   const capture=value=>{
    stationWorld.setDualToneComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const directRoadMask=()=>{
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=capture(0),dual=capture(1);
    maskMaterial=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false
    });
    deck.material=maskMaterial;
    deck.visible=true;
    const roadMask=directRoadMask();
    deck.visible=false;
    const emptyMask=directRoadMask();
    return {classic,dual,roadMask,emptyMask,position:flight?.s??null};
   }finally{
    deck.visible=oldVisible;
    deck.material=oldMaterial;
    maskMaterial?.dispose();
    stationWorld.setDualToneComparison(prior);
    renderer.setRenderTarget(oldTarget);
    neonPipeline.render(0);
   }
  };
 // 0.26.2 P2: exactly matched camera/frame metal A/B; road and ship
 // stay on the original 0.26.1 shader path with no changes or additional lights.
 if(new URLSearchParams(location.search).get("premiumMetalSmoke")==="1")
  window.__skyshiftPremiumMetalProbe=()=>({
   requested:premiumMetalEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats?.().seal??null,
   unifiedLighting:unifiedTunnelLightingEnabled,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   comparison:"?premiumMetal=classic"
  });
 if(new URLSearchParams(location.search).get("premiumMetalFrameProof")==="1")
  window.__skyshiftPremiumMetalFrameProof=()=>{
   if(!premiumMetalEnabled||!stationWorld?.setPremiumMetalComparison||
    !stationWorld.stats().premiumMetal0262Enabled||!neonPipeline?.render)
    throw Error("0.26.2 premium metal proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.2 original road unavailable");
   const old=stationWorld.stats().premiumMetal0262Strength;
   const material=deck.material,wasVisible=deck.visible;
   const target=renderer.getRenderTarget();let mask=null;
   const snap=value=>{
    stationWorld.setPremiumMetalComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const maskSnap=()=>{
    renderer.setRenderTarget(null);renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=snap(0),premium=snap(1);
    mask=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,
     toneMapped:false,fog:false});
    deck.material=mask;deck.visible=true;
    const roadMask=maskSnap();
    deck.visible=false;
    const emptyMask=maskSnap();
    return {classic,premium,roadMask,emptyMask,s:flight?.s??null};
   }finally{
    deck.material=material;deck.visible=wasVisible;
    mask?.dispose();stationWorld.setPremiumMetalComparison(old);
    renderer.setRenderTarget(target);neonPipeline.render(0);
   }
  };
 // 0.26.1 P1: same-frame finite-strip PBR A/B, original road/ship
 // and native neon unmodified, no physics or camera progress.
 if(new URLSearchParams(location.search).get("localReflectionsSmoke")==="1")
  window.__skyshiftLocalReflectionsProbe=()=>({
   requested:localReflectionsEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats?.().seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   unifiedLighting:unifiedTunnelLightingEnabled,
   comparison:"?localReflections=classic"
  });
 if(new URLSearchParams(location.search).get("localReflectionsFrameProof")==="1")
  window.__skyshiftLocalReflectionsFrameProof=()=>{
   if(!localReflectionsEnabled||!stationWorld?.setLocalReflectionsComparison||
      !stationWorld.stats().localReflections0261Enabled||!neonPipeline?.render)
    throw Error("0.26.1 local reflection proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.1 original PBR deck unavailable");
   const old=stationWorld.stats().localReflections0261Strength;
   const material=deck.material,wasVisible=deck.visible,
    target=renderer.getRenderTarget();
   let mask=null;
   const snap=value=>{
    stationWorld.setLocalReflectionsComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const maskSnap=()=>{
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=snap(0),local=snap(1);
    mask=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false});
    deck.material=mask;
    deck.visible=true;
    const roadMask=maskSnap();
    deck.visible=false;
    const emptyMask=maskSnap();
    return {classic,local,roadMask,emptyMask,s:flight?.s??null};
   }finally{
    deck.material=material;deck.visible=wasVisible;
    mask?.dispose();
    stationWorld.setLocalReflectionsComparison(old);
    renderer.setRenderTarget(target);
    neonPipeline.render(0);
   }
  };
 // 0.26.0 Pass 2: true MeshPhysicalMaterial coating on exactly the same
 // original solar-sealed 0.26.0 Pass 1 world, for pixel A/B validation.
 if(new URLSearchParams(location.search).get("trueMetalSmoke")==="1")
  window.__skyshiftTrueMetalProbe=()=>({
   requested:trueMetalEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("trueMetalFrameProof")==="1")
  window.__skyshiftTrueMetalFrameProof=()=>{
   if(!trueMetalEnabled||!stationWorld?.setTrueMetalComparison||
      !stationWorld.stats().trueMetal0260P2Enabled||!neonPipeline?.render)
    throw Error("0.26.0 P2 physical metal same-frame proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.0 P2 original road unavailable");
   const original=stationWorld.stats().trueMetal0260P2Strength;
   const oldMaterial=deck.material,oldVisible=deck.visible;
   const oldTarget=renderer.getRenderTarget();
   let maskMaterial=null;
   const capture=value=>{
    stationWorld.setTrueMetalComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const directRoadMask=()=>{
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=capture(0),physical=capture(1);
    maskMaterial=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false
    });
    deck.material=maskMaterial;
    deck.visible=true;
    const roadMask=directRoadMask();
    deck.visible=false;
    const emptyMask=directRoadMask();
    return {classic,physical,roadMask,emptyMask,position:flight?.s??null};
   }finally{
    deck.visible=oldVisible;
    deck.material=oldMaterial;
    maskMaterial?.dispose();
    stationWorld.setTrueMetalComparison(original);
    renderer.setRenderTarget(oldTarget);
    neonPipeline.render(0);
   }
  };
 // 1.0 same-frame A/B: world light policy only, no new renderer or shade.
 if(new URLSearchParams(location.search).get("unifiedLightingSmoke")==="1")
  window.__skyshiftUnifiedLightingProbe=()=>({
   enabled:unifiedTunnelLightingEnabled,
   profile:unifiedTunnelLightingEnabled?UNIFIED_TUNNEL_LIGHTING_1:null,
   comparison:tunnelBlackout?.getComparison?.()??null,
   levels:{...tunnelBlackout?.levels},
   blackout:tunnelBlackout?.audit?.()??null,
   distance:flight?.s??null,
   engineLightIntensities:engineLights.map(light=>light.intensity),
   nativeWaveActive:Boolean(premiumSurface?.setWaveState),
   roadSolarSeal:roadSolarSpill?.stats?.().seal??null,
   whiteCoreProtectionEnabled:whiteCoreEnabled,
   shipWhiteProtectionEnabled:shipWhiteSpillEnabled
  });
 if(new URLSearchParams(location.search).get("unifiedLightingFrameProof")==="1")
  window.__skyshiftUnifiedLightingFrameProof=()=>{
   if(!unifiedTunnelLightingEnabled||!tunnelBlackout?.setComparison||
      !neonPipeline?.render||!flight)
    throw Error("Unified Tunnel Lighting QA requires active foundation");
   const original=tunnelBlackout.getComparison();
   const capture=value=>{
    tunnelBlackout.setComparison(value);
    // CI teleports a frozen 120 Hz flight; sample the REAL target position.
    tunnelBlackout.apply(flight.s);
    neonPipeline.render(0);
    return {data:renderer.domElement.toDataURL("image/png").split(",")[1],
     levels:{...tunnelBlackout.levels}};
   };
   try{
    return {classic:capture(0),unified:capture(1),s:flight.s};
   }finally{
    tunnelBlackout.setComparison(original);
    tunnelBlackout.apply(flight.s);
    neonPipeline.render(0);
   }
  };
 // 0.25.1 real same-frame micro finish vs unchanged 0.25.0 graphite.
 if(new URLSearchParams(location.search).get("microMetalSmoke")==="1")
  window.__skyshiftMicroMetalProbe=()=>({
   requested:microMetalEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("microMetalFrameProof")==="1")
  window.__skyshiftMicroMetalFrameProof=()=>{
   if(!microMetalEnabled||!stationWorld?.setMicroMetalComparison||
      !stationWorld.stats().microMetal0251Enabled||!neonPipeline?.render)
    throw Error("0.25.1 same-frame metal finish comparison unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.25.1 original road deck unavailable");
   const before=stationWorld.stats().microMetal0251Strength;
   const oldMaterial=deck.material,oldVisible=deck.visible;
   const oldTarget=renderer.getRenderTarget();
   let maskMaterial=null;
   const capture=value=>{
    stationWorld.setMicroMetalComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const directRoadMask=()=>{
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=capture(0),crafted=capture(1);
    maskMaterial=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false
    });
    deck.material=maskMaterial;
    deck.visible=true;
    const roadMask=directRoadMask();
    deck.visible=false;
    const emptyMask=directRoadMask();
    return {classic,crafted,roadMask,emptyMask,position:flight?.s??null};
   }finally{
    deck.visible=oldVisible;
    deck.material=oldMaterial;
    maskMaterial?.dispose();
    stationWorld.setMicroMetalComparison(before);
    renderer.setRenderTarget(oldTarget);
    neonPipeline.render(0);
   }
  };
 // 0.25.0 same-frame dark graphite/neon/practicals vs 0.24.2.
 if(new URLSearchParams(location.search).get("darkMetalSmoke")==="1")
  window.__skyshiftDarkMetalProbe=()=>({
   requested:darkMetalEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("darkMetalFrameProof")==="1")
  window.__skyshiftDarkMetalFrameProof=()=>{
   if(!darkMetalEnabled||!stationWorld?.setDarkMetalComparison||
      !stationWorld.stats().darkMetal0250Enabled||!neonPipeline?.render)
    throw Error("0.25.0 same-frame dark metal comparison unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.25.0 original road deck unavailable");
   const before=stationWorld.stats().darkMetal0250Strength;
   const oldMaterial=deck.material,oldVisible=deck.visible;
   const oldTarget=renderer.getRenderTarget();
   let maskMaterial=null;
   const capture=value=>{
    stationWorld.setDarkMetalComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const directRoadMask=()=>{
    // QA-only road silhouette in this exact camera frame. Banked bends
    // can place a WALL in the lower-center screen rectangle.
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=capture(0),dark=capture(1);
    maskMaterial=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false
    });
    deck.material=maskMaterial;
    deck.visible=true;
    const roadMask=directRoadMask();
    deck.visible=false;
    const emptyMask=directRoadMask();
    return {classic,dark,roadMask,emptyMask,position:flight?.s??null};
   }finally{
    deck.visible=oldVisible;
    deck.material=oldMaterial;
    maskMaterial?.dispose();
    stationWorld.setDarkMetalComparison(before);
    renderer.setRenderTarget(oldTarget);
    neonPipeline.render(0);
   }
  };
 // 0.24.1 true crafted panel geometry + shader vs exact 0.24.0 same frame.
 if(new URLSearchParams(location.search).get("surfaceCraftSmoke")==="1")
  window.__skyshiftSurfaceCraftProbe=()=>({
   requested:surfaceCraftEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("surfaceCraftFrameProof")==="1")
  window.__skyshiftSurfaceCraftFrameProof=()=>{
   if(!surfaceCraftEnabled||!stationWorld?.setSurfaceCraftComparison||
      !stationWorld.stats().surfaceCraft0241Enabled||!neonPipeline?.render)
    throw Error("0.24.1 same-frame material/geometry A/B unavailable");
   const previous=stationWorld.stats().surfaceCraft0241Strength;
   const capture=value=>{
    stationWorld.setSurfaceCraftComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),crafted:capture(1),position:flight?.s??null};}
   finally{stationWorld.setSurfaceCraftComparison(previous);}
  };
 // 0.24.0 architectural neon ON/OFF in the exact same 0.23.3 frame.
 if(new URLSearchParams(location.search).get("architecturalNeonSmoke")==="1")
  window.__skyshiftArchitecturalNeonProbe=()=>({
   requested:architecturalNeonEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("architecturalNeonFrameProof")==="1")
  window.__skyshiftArchitecturalNeonFrameProof=()=>{
   if(!architecturalNeonEnabled||!stationWorld?.setArchitecturalNeonComparison||
      !stationWorld.stats().architecturalNeon0240Enabled||!neonPipeline?.render)
    throw Error("0.24.0 exact-frame architectural neon A/B unavailable");
   const previous=stationWorld.stats().architecturalNeon0240Strength;
   const capture=value=>{
    stationWorld.setArchitecturalNeonComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),lit:capture(1),position:flight?.s??null};}
   finally{stationWorld.setArchitecturalNeonComparison(previous);}
  };
 // 0.23.3 full-tunnel geometry/materials versus 0.23.2 in the same frame.
 if(new URLSearchParams(location.search).get("unifiedTunnelSmoke")==="1")
  window.__skyshiftUnifiedTunnelProbe=()=>({
   requested:unifiedTunnelEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("unifiedTunnelFrameProof")==="1")
  window.__skyshiftUnifiedTunnelFrameProof=()=>{
   if(!unifiedTunnelEnabled||!stationWorld?.setUnifiedComparison||
      !stationWorld.stats().unifiedTunnel0233Enabled||!neonPipeline?.render)
    throw Error("0.23.3 unified tunnel A/B unavailable");
   const previous=stationWorld.stats().unifiedTunnel0233Strength;
   const capture=value=>{
    stationWorld.setUnifiedComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),unified:capture(1),position:flight?.s??null};}
   finally{stationWorld.setUnifiedComparison(previous);}
  };
 // 0.23.2 exact-frame new neon reflections vs unchanged 0.23.1.1.
 if(new URLSearchParams(location.search).get("lightArchitectureSmoke")==="1")
  window.__skyshiftLightArchitectureProbe=()=>({
   requested:lightArchitectureEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   originalControlsUntouched:true,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("lightArchitectureFrameProof")==="1")
  window.__skyshiftLightArchitectureFrameProof=()=>{
   if(!lightArchitectureEnabled||!stationWorld?.setLightArchitectureComparison||
      !stationWorld.stats().lightArchitecture0232Enabled||!neonPipeline?.render)
    throw Error("0.23.2 light architecture A/B unavailable");
   const previous=stationWorld.stats().lightArchitecture0232Strength;
   const capture=value=>{
    stationWorld.setLightArchitectureComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),lit:capture(1),position:flight?.s??null};}
   finally{stationWorld.setLightArchitectureComparison(previous);}
  };
 // 0.23.1 exact-frame metal+geometry A/B on the same track and camera.
 if(new URLSearchParams(location.search).get("trueDepthSmoke")==="1")
  window.__skyshiftTrueDepthProbe=()=>({
   requested:trueMaterialDepthEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState)
  });
 if(new URLSearchParams(location.search).get("trueDepthFrameProof")==="1")
  window.__skyshiftTrueDepthFrameProof=()=>{
   if(!trueMaterialDepthEnabled||!stationWorld?.setTrueDepthComparison||
      !stationWorld.stats().trueDepth0231Enabled||!neonPipeline?.render)
    throw Error("0.23.1 exact-frame comparison unavailable");
   const before=stationWorld.stats().trueDepth0231Strength;
   const capture=v=>{
    stationWorld.setTrueDepthComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),depth:capture(1),position:flight?.s??null};}
   finally{stationWorld.setTrueDepthComparison(before);}
  };
 // 0.23.0 P1 exact-frame material A/B without a physics/camera update.
 if(new URLSearchParams(location.search).get("physicalMaterialSmoke")==="1")
  window.__skyshiftPhysicalMaterialProbe=()=>({
   requested:physicalMaterialEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   originalControlsUntouched:true,originalCameraUntouched:true
  });
 if(new URLSearchParams(location.search).get("physicalMaterialFrameProof")==="1")
  window.__skyshiftPhysicalMaterialFrameProof=()=>{
   if(!physicalMaterialEnabled||!neonPipeline?.render||
      !stationWorld?.setPhysicalComparison||
      !stationWorld.stats().physicalMaterial023Enabled)
    throw Error("0.23.0 physical material A/B unavailable");
   const original=stationWorld.stats().physicalMaterial023Strength;
   const snap=v=>{
    stationWorld.setPhysicalComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:snap(0),physical:snap(1),
    position:flight?.s??null};}
   finally{stationWorld.setPhysicalComparison(original);}
  };
 // 0.22.0 Pass 2: identical camera, wave and ship pose with just the
 // colored local neon-bounce strength toggled. No physics tick.
 if(new URLSearchParams(location.search).get("cinematicNeonSmoke")==="1")
  window.__skyshiftCinematicNeonProbe=()=>({
   enabled:cinematicNeonEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   roadPremium:Boolean(premiumRoadSurface?.stats()?.active),
   originalGRIPUntouched:true,
   originalCameraUntouched:true
  });
 if(new URLSearchParams(location.search).get("cinematicNeonFrameProof")==="1")
  window.__skyshiftCinematicNeonFrameProof=()=>{
   if(!cinematicNeonEnabled||!neonPipeline?.render||
      !stationWorld?.setNeonComparison)
    throw Error("Cinematic Neon same-frame proof unavailable");
   const prev=stationWorld.stats().cinematicNeonStrength;
   const draw=v=>{
    stationWorld.setNeonComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(0),neon:draw(1),
    position:flight?.s??null}}
   finally{stationWorld.setNeonComparison(prev)}
  };
 // 0.22.0: premium materials only, same frame, no world/camera tick.
 if(new URLSearchParams(location.search).get("materialRebirthSmoke")==="1")
  window.__skyshiftMaterialRebirthProbe=()=>({
   enabled:premiumMaterialRebirthEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   roadPremiumEnabled:Boolean(premiumRoadSurface?.stats()?.active),
   fullSceneLightsUnchanged:Boolean(worldLights?.key&&worldLights?.ambient)
  });
 if(new URLSearchParams(location.search).get("materialRebirthFrameProof")==="1")
  window.__skyshiftMaterialRebirthFrameProof=()=>{
   if(!premiumMaterialRebirthEnabled||!neonPipeline?.render||
      !stationWorld?.setMaterialComparison)
    throw Error("Material Rebirth same-frame proof unavailable");
   const prev=stationWorld.stats().rebirthMaterialBlend;
   const render=amount=>{
    stationWorld.setMaterialComparison(amount);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:render(0),rebirth:render(1),
    position:flight?.s??null}}
   finally{stationWorld.setMaterialComparison(prev)}
  };
 // 0.21.6: same-frame physical-velocity cinematic energy A/B.
 if(new URLSearchParams(location.search).get("cinematicMotionSmoke")==="1")
  window.__skyshiftCinematicMotionProbe=()=>({
   enabled:cinematicMotionEnabled,
   ...(stationWorld?.stats?.()??{}),
   roadSolarSeal:roadSolarSpill?.stats()?.seal??null,
   premiumRoad:premiumRoadSurface?.stats()?.active??false,
   worldLightsUnchanged:Boolean(worldLights?.key)
  });
 if(new URLSearchParams(location.search).get("cinematicMotionFrameProof")==="1")
  window.__skyshiftCinematicMotionFrameProof=()=>{
   if(!cinematicMotionEnabled||!neonPipeline?.render||
      !stationWorld?.setMotionSample||!stationWorld?.setMotionComparison)
    throw Error("Cinematic motion same-frame proof unavailable");
   const previous=stationWorld.stats();
   const render=(enabled)=>{
    stationWorld.setMotionComparison(enabled);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    stationWorld.setMotionSample({flow:1,phaseMeters:flight?.s??165,
     boost:1,playing:true});
    return {baseline:render(0),cinematic:render(1),s:flight?.s??null};
   }finally{
    stationWorld.setMotionSample({flow:previous.cinematicFlow,
     phaseMeters:previous.cinematicPhaseMeters,
     boost:previous.cinematicBoost,playing:true});
    stationWorld.setMotionComparison(previous.cinematicComparison);
   }
  };
 // 0.26.4.3 QA: fixed-camera TRUE WebGL graphics, no AI image generation.
 if(new URLSearchParams(location.search).get("fixtureTransportSmoke")==="1")
  window.__skyshiftFixtureTransportProbe=()=>({
   requested:fixtureTransportEnabled,
   ...(fixtureTransport?.stats?.()??{}),
   premiumMetal:unifiedMetalLight?.stats?.().unifiedMetal02641Active??false,
   previousReflection:premiumReflectionFinish?.stats?.().reflectionFinish02642Active??false,
   straightOnly:edgeFloorLighting?.stats?.().straightEdges02633Active??false,
   amberBands:edgeFloorLighting?.stats?.().straightEdges02633AmberBands??0,
   roadGGX:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   whiteSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   finalHDR:finalCohesion?.stats?.().finalCohesion0264Active??false,
   originalRoadType:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),nativeWave:Boolean(premiumSurface?.setWaveState),
   originalExposure:renderer?.toneMappingExposure
  });
 if(new URLSearchParams(location.search).get("fixtureTransportFrameProof")==="1")
  window.__skyshiftFixtureTransportFrameProof=()=>{
   if(!fixtureTransport?.active||!neonPipeline?.render)
    throw Error("0.26.4.3 no actual source/metal comparison");
   const original=fixtureTransport.stats().fixtureTransport02643Strength;
   const priorTarget=renderer.getRenderTarget();
   const capture=v=>{
    fixtureTransport.setComparison(v);neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:capture(0),transport:capture(1),s:flight?.s??null};}
   finally{fixtureTransport.setComparison(original);
    renderer.setRenderTarget(priorTarget);neonPipeline.render(0);}
  };
 // 0.26.5: real WebGL fixed-camera rail and wall A/B.
 if(new URLSearchParams(location.search).get("railWallSmoke")==="1")
  window.__skyshiftRailWallProbe=()=>({
   requested:railWallResponseEnabled,...(trueRailWall?.stats?.()??{}),
   originalRailContainment:identitySurface?.getRailBodyContainment?.()??null,
   priorFixture:fixtureTransport?.stats?.().fixtureTransport02643Active??false,
   straightOnly:edgeFloorLighting?.stats?.().straightEdges02633Active??false,
   amberBands:edgeFloorLighting?.stats?.().straightEdges02633AmberBands??0,
   nativeWallGGX:stationWorld?.stats?.().localReflections0261Enabled??false,
   whiteSeal:roadSolarSpill?.stats?.().seal??null,
   originalRoadType:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),nativeWave:Boolean(premiumSurface?.setWaveState),
   exposure:renderer?.toneMappingExposure
  });
 if(new URLSearchParams(location.search).get("railWallFrameProof")==="1")
  window.__skyshiftRailWallFrameProof=()=>{
   if(!trueRailWall?.active||!neonPipeline?.render)
    throw Error("0.26.5 true rail/wall response unavailable");
   const original=trueRailWall.stats().railWall0265Strength;
   const oldTarget=renderer.getRenderTarget();
   const draw=v=>{
    trueRailWall.setComparison(v);neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(0),response:draw(1),s:flight?.s??null};}
   finally{trueRailWall.setComparison(original);
    renderer.setRenderTarget(oldTarget);neonPipeline.render(0);}
  };
 // 0.26.4.2: native WebGL same-frame material, road and amber falloff
 // proof. ?reflectionFinish=classic restores exact 0.26.4.1.
 if(new URLSearchParams(location.search).get("reflectionFinishSmoke")==="1")
  window.__skyshiftReflectionFinishProbe=()=>({
   requested:reflectionFinishEnabled,
   ...(premiumReflectionFinish?.stats?.()??{}),
   sourceMetal:unifiedMetalLight?.stats?.().unifiedMetal02641Active??false,
   roadGGX:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   straightOnly:edgeFloorLighting?.stats?.().straightEdges02633Active??false,
   amberBands:edgeFloorLighting?.stats?.().straightEdges02633AmberBands??0,
   finalHDR:finalCohesion?.stats?.().finalCohesion0264Active??false,
   whiteSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   originalRoadType:premiumSurface?.material?.type??null,
   originalShip:Boolean(ship),nativeWave:Boolean(premiumSurface?.setWaveState),
   originalExposure:renderer?.toneMappingExposure
  });
 if(new URLSearchParams(location.search).get("reflectionFinishFrameProof")==="1")
  window.__skyshiftReflectionFinishFrameProof=()=>{
   if(!premiumReflectionFinish?.active||!neonPipeline?.render)
    throw Error("0.26.4.2 real WebGL optical comparison unavailable");
   const old=premiumReflectionFinish.stats().reflectionFinish02642Strength;
   const prevTarget=renderer.getRenderTarget();
   const draw=value=>{
    premiumReflectionFinish.setComparison(value);neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{return {classic:draw(0),refined:draw(1),trackS:flight?.s??null};}
   finally{premiumReflectionFinish.setComparison(old);
    renderer.setRenderTarget(prevTarget);neonPipeline.render(0);}
  };
 // 0.26.4.1: true native WebGL material A/B with exactly the original
 // ship, wave, corner arrows, camera, local lights and HDR pass retained.
 if(new URLSearchParams(location.search).get("unifiedLightSmoke")==="1")
  window.__skyshiftUnifiedLightProbe=()=>({
   requested:unifiedLightResponseEnabled,
   ...(unifiedMetalLight?.stats?.()??{}),
   premiumMetal:stationWorld?.stats?.().premiumMetal0262Enabled??false,
   localGGX:stationWorld?.stats?.().localReflections0261Enabled??false,
   finalHDR:finalCohesion?.stats?.().finalCohesion0264Active??false,
   straightOnly:edgeFloorLighting?.stats?.().straightEdges02633Active??false,
   amberBands:edgeFloorLighting?.stats?.().straightEdges02633AmberBands??0,
   roadSolarSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   originalRoad:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   originalShip:Boolean(ship),
   renderPasses:neonPipeline?.composer?.passes?.length??null,
   originalExposure:renderer?.toneMappingExposure
  });
 if(new URLSearchParams(location.search).get("unifiedLightFrameProof")==="1")
  window.__skyshiftUnifiedLightFrameProof=()=>{
   if(!unifiedMetalLight?.active||!neonPipeline?.render)
    throw Error("0.26.4.1 native metal-light frame comparison unavailable");
   const saved=unifiedMetalLight.stats().unifiedMetal02641Strength,
    target=renderer.getRenderTarget();
   const shot=v=>{unifiedMetalLight.setComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];};
   try{return {classic:shot(0),balanced:shot(1),trackS:flight?.s??null};}
   finally{unifiedMetalLight.setComparison(saved);
    renderer.setRenderTarget(target);neonPipeline.render(0);}
  };
 // 0.26.4: true same-camera HDR optical A/B (previous 0.26.3.3).
 if(new URLSearchParams(location.search).get("finalCohesionSmoke")==="1")
  window.__skyshiftFinalCohesionProbe=()=>({
   requested:finalCohesionEnabled,
   ...(finalCohesion?.stats?.()??{}),
   straightOnly:edgeFloorLighting?.stats?.().straightEdges02633Active??false,
   amberBands:edgeFloorLighting?.stats?.().straightEdges02633AmberBands??0,
   originalRoad:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   originalMetal:stationWorld?.stats?.().premiumMetal0262Enabled??false,
   roadSolarSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   shipPresent:Boolean(ship),
   outputFinal:neonPipeline?.composer?.passes?.at(-1)===neonPipeline?.output,
   smaaPresent:Boolean(neonPipeline?.smaa),
   originalExposure:renderer?.toneMappingExposure
  });
 if(new URLSearchParams(location.search).get("finalCohesionFrameProof")==="1")
  window.__skyshiftFinalCohesionFrameProof=()=>{
   if(!finalCohesion?.active||!neonPipeline?.render)
    throw Error("0.26.4 real HDR frame proof unavailable");
   const before=finalCohesion.stats().finalCohesion0264Comparison;
   const shot=v=>{finalCohesion.setComparison(v);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];};
   try{
    return {classic:shot(0),cohesion:shot(1),trackS:flight?.s??null};
   }finally{
    finalCohesion.setComparison(before);neonPipeline.render(0);
   }
  };
 // 0.26.3.3: same-frame true WebGL proof that new cyan is absent
 // in curved/pointer zones and that amber arch feet stay unchanged.
 if(new URLSearchParams(location.search).get("straightEdgeSmoke")==="1")
  window.__skyshiftStraightEdgeProbe=()=>({
   requested:straightEdgesEnabled,
   ...(edgeFloorLighting?.stats?.()??{}),
   previousRoad:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   originalRoadMaterial:premiumSurface?.material?.type??null,
   solarSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   originalShip:Boolean(ship),originalRail:Boolean(identitySurface)
  });
 if(new URLSearchParams(location.search).get("straightEdgeFrameProof")==="1")
  window.__skyshiftStraightEdgeFrameProof=()=>{
   if(!straightEdgesEnabled||
    !edgeFloorLighting?.stats?.().straightEdges02633Active||
    !neonPipeline?.render)
    throw Error("0.26.3.3 straight-only WebGL proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.3.3 original PBR road unavailable");
   const originalStrength=edgeFloorLighting.stats().straightEdges02633Strength,
    originalMaterial=deck.material,originalVisible=deck.visible,
    originalTarget=renderer.getRenderTarget();
   let mask=null;
   const shot=value=>{
    edgeFloorLighting.setComparison(value);neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const raw=()=>{renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];};
   try{
    const off=shot(0),straightOnly=shot(1);
    mask=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,
     toneMapped:false,fog:false});
    deck.material=mask;deck.visible=true;const roadMask=raw();
    deck.visible=false;const emptyMask=raw();
    return {off,straightOnly,roadMask,emptyMask,trackS:flight?.s??null};
   }finally{
    deck.material=originalMaterial;deck.visible=originalVisible;
    mask?.dispose();edgeFloorLighting.setComparison(originalStrength);
    renderer.setRenderTarget(originalTarget);neonPipeline.render(0);
   }
  };
 // 0.26.3.2: same-frame low-edge/connected-band A/B with preserved ship.
 if(new URLSearchParams(location.search).get("edgeSourceSmoke")==="1")
  window.__skyshiftEdgeSourceProbe=()=>({
   requested:edgeSourceRebuildEnabled,
   ...(edgeFloorLighting?.stats?.()??{}),
   roadRebuild:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   solarSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   originalRail:Boolean(identitySurface),originalShip:Boolean(ship),
   nativeWave:Boolean(premiumSurface?.setWaveState),
   roadMaterial:premiumSurface?.material?.type??null
  });
 if(new URLSearchParams(location.search).get("edgeSourceFrameProof")==="1")
  window.__skyshiftEdgeSourceFrameProof=()=>{
   if(!edgeSourceRebuildEnabled||
    !edgeFloorLighting?.stats?.().edgeSources02632Active||!neonPipeline?.render)
    throw Error("0.26.3.2 real road/floor WebGL A/B unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.3.2 original deck missing");
   const originalStrength=edgeFloorLighting.stats().edgeSources02632Strength,
    originalMaterial=deck.material,originalVisible=deck.visible,
    originalTarget=renderer.getRenderTarget();
   let mask=null;
   const draw=value=>{
    edgeFloorLighting.setComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const raw=()=>{renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];};
   try{
    const classic=draw(0),repositioned=draw(1);
    mask=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,
     toneMapped:false,fog:false});
    deck.material=mask;deck.visible=true;const roadMask=raw();
    deck.visible=false;const emptyMask=raw();
    return {classic,repositioned,roadMask,emptyMask,trackS:flight?.s??null};
   }finally{
    deck.material=originalMaterial;deck.visible=originalVisible;
    mask?.dispose();edgeFloorLighting.setComparison(originalStrength);
    renderer.setRenderTarget(originalTarget);neonPipeline.render(0);
   }
  };
 // 0.26.3.1: same-frame actual WebGL A/B, preserve 0.26.3 and its wave.
 if(new URLSearchParams(location.search).get("edgeFloorSmoke")==="1")
  window.__skyshiftEdgeFloorProbe=()=>({
   requested:edgeFloorEnabled,
   ...(edgeFloorLighting?.stats?.()??{}),
   roadRebuild:cinematicRoadRebuild?.stats?.().roadRebuild0263Active??false,
   roadMaterial:premiumSurface?.material?.type??null,
   solarSeal:roadSolarSpill?.stats?.().seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats?.().seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   originalRail:Boolean(identitySurface),originalShip:Boolean(ship)
  });
 if(new URLSearchParams(location.search).get("edgeFloorFrameProof")==="1")
  window.__skyshiftEdgeFloorFrameProof=()=>{
   if(!edgeFloorLighting?.stats?.().edgeFloor02631Active||!neonPipeline?.render)
    throw Error("0.26.3.1 exact-frame edge/floor proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.3.1 original road missing");
   const old=edgeFloorLighting.stats().edgeFloor02631Strength,
    oldMaterial=deck.material,oldVisible=deck.visible,
    oldTarget=renderer.getRenderTarget();
   let mask=null;
   const draw=value=>{
    edgeFloorLighting.setComparison(value);neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const raw=()=>{renderer.setRenderTarget(null);renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];};
   try{
    const classic=draw(0),lit=draw(1);
    mask=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,
     toneMapped:false,fog:false});
    deck.material=mask;deck.visible=true;const roadMask=raw();
    deck.visible=false;const emptyMask=raw();
    return {classic,lit,roadMask,emptyMask,trackS:flight?.s??null};
   }finally{
    deck.material=oldMaterial;deck.visible=oldVisible;mask?.dispose();
    edgeFloorLighting.setComparison(old);renderer.setRenderTarget(oldTarget);
    neonPipeline.render(0);
   }
  };
 // 0.26.3: native GGX road A/B against EXACT 0.26.2, same world frame.
 if(new URLSearchParams(location.search).get("roadRebuildSmoke")==="1")
  window.__skyshiftRoadRebuildProbe=()=>({
   requested:roadRebuildEnabled,
   ...(cinematicRoadRebuild?.stats()??{}),
   legacyReflections:cinematicRoadReflections?.stats()?.seal??null,
   roadMaterial:premiumSurface?.material?.type??null,
   solarSeal:roadSolarSpill?.stats()?.seal??null,
   premiumRoadSeal:premiumRoadSurface?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   originalRail:Boolean(identitySurface),
   originalShip:Boolean(ship)
  });
 if(new URLSearchParams(location.search).get("roadRebuildFrameProof")==="1")
  window.__skyshiftRoadRebuildFrameProof=()=>{
   if(!roadRebuildEnabled||
    !cinematicRoadRebuild?.stats?.().roadRebuild0263Active||
    !neonPipeline?.render)
    throw Error("0.26.3 GPU A/B unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.26.3 original indexed deck missing");
   const prev=cinematicRoadRebuild.stats().roadRebuild0263Strength,
    visible=deck.visible,originalMaterial=deck.material,
    oldTarget=renderer.getRenderTarget();
   let mask=null;
   const draw=value=>{
    cinematicRoadRebuild.setComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const raw=()=>{
    renderer.setRenderTarget(null);renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=draw(0),physical=draw(1);
    deck.visible=false;
    const absent=draw(1);
    mask=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false
    });
    deck.material=mask;deck.visible=true;
    const roadMask=raw();
    deck.visible=false;
    const emptyMask=raw();
    return {classic,physical,absent,roadMask,emptyMask,
     trackS:flight?.s??null};
   }finally{
    deck.material=originalMaterial;deck.visible=visible;
    mask?.dispose();
    cinematicRoadRebuild.setComparison(prev);
    renderer.setRenderTarget(oldTarget);neonPipeline.render(0);
   }
  };
 // 0.24.2 same-frame neon reflections on ONLY the integrated road deck.
 if(new URLSearchParams(location.search).get("cinematicRoadSmoke")==="1")
  window.__skyshiftCinematicRoadProbe=()=>({
   requested:cinematicRoadEnabled,
   ...(cinematicRoadReflections?.stats()??{enabled:false,active:false}),
   roadMaterial:premiumSurface?.material?.type??null,
   solarSeal:roadSolarSpill?.stats()?.seal??null,
   priorRoadSeal:premiumRoadSurface?.stats()?.seal??null,
   nativeWave:Boolean(premiumSurface?.setWaveState),
   originalRail:Boolean(identitySurface),
   originalShip:Boolean(ship)
  });
 if(new URLSearchParams(location.search).get("cinematicRoadFrameProof")==="1")
  window.__skyshiftCinematicRoadFrameProof=()=>{
   if(!cinematicRoadEnabled||!cinematicRoadReflections||!neonPipeline?.render)
    throw Error("0.24.2 same-frame cinematic road proof unavailable");
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("0.24.2 original physical road unavailable");
   const prior=cinematicRoadReflections.stats().seal,oldVisible=deck.visible;
   const oldMaterial=deck.material,oldTarget=renderer.getRenderTarget();
   let segmentationMaterial=null;
   const draw=value=>{
    cinematicRoadReflections.setComparison(value);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   const drawRawMask=()=>{
    // Only for WebGL QA: render the original road silhouette WITHOUT bloom.
    // Never alter normal gameplay geometry, shaders, or scene configuration.
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=draw(0),cinematic=draw(1);
    deck.visible=false;
    const absent=draw(0);
    segmentationMaterial=new THREE.MeshBasicMaterial({
     color:0xffffff,side:THREE.DoubleSide,toneMapped:false,fog:false
    });
    deck.material=segmentationMaterial;
    deck.visible=true;
    const roadMask=drawRawMask();
    deck.visible=false;
    const emptyMask=drawRawMask();
    return {classic,cinematic,absent,roadMask,emptyMask,
     trackS:flight?.s??null};
   }finally{
    deck.material=oldMaterial;
    deck.visible=oldVisible;
    segmentationMaterial?.dispose();
    cinematicRoadReflections.setComparison(prior);
    renderer.setRenderTarget(oldTarget);
    neonPipeline.render(0);
   }
  };
 // 0.21.5: same-frame finish-only A/B, without a world or physics tick.
 if(new URLSearchParams(location.search).get("premiumRoadSmoke")==="1")
  window.__skyshiftPremiumRoadProbe=()=>({
   enabled:premiumRoadEnabled,
   ...(premiumRoadSurface?.stats()??{}),
   roadMaterial:premiumSurface?.material?.type??null,
   solarSeal:roadSolarSpill?.stats()?.seal??null,
   waveAvailable:Boolean(premiumSurface?.setWaveState),
   exteriorKeyUnchanged:Boolean(worldLights?.key),
   railBodyContainment:identitySurface?.getRailBodyContainment?.()??null
  });
 if(new URLSearchParams(location.search).get("premiumRoadFrameProof")==="1")
  window.__skyshiftPremiumRoadFrameProof=()=>{
   if(!premiumRoadSurface||!neonPipeline?.render)
    throw Error("Premium road exact-frame proof unavailable");
   const original=premiumRoadSurface.stats().seal;
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("Premium road physical deck unavailable");
   const visible=deck.visible;
   const draw=enabled=>{
    premiumRoadSurface.setComparison(enabled);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const baseline=draw(0),premium=draw(1);
    deck.visible=false;
    const absent=draw(1);
    return {baseline,premium,absent,trackS:flight?.s??null};
   }finally{
    deck.visible=visible;
    premiumRoadSurface.setComparison(original);
   }
  };
 // 0.21.2.6: EXACT same-frame road-only lighting comparison (no physics tick).
 if(new URLSearchParams(location.search).get("roadSolarSmoke")==="1")
  window.__skyshiftRoadSolarProbe=()=>({
   enabled:roadSolarEnabled,
   ...(roadSolarSpill?.stats()??{}),
   roadMaterial:premiumSurface?.material?.type??null,
   railBodyContainment:identitySurface?.getRailBodyContainment?.()??null,
   exteriorKeyIntensity:worldLights?.key?.intensity??null,
   waveEnabled:Boolean(premiumSurface?.setWaveState),
   sceneFogUnchanged:true
  });
 if(new URLSearchParams(location.search).get("roadSolarFrameProof")==="1")
  window.__skyshiftRoadSolarFrameProof=()=>{
   if(!roadSolarSpill||!neonPipeline?.render)
    throw Error("Road solar WebGL proof unavailable");
   const original=roadSolarSpill.stats().seal;
   const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
   if(!deck)throw Error("Road solar proof missing actual road mesh");
   const wasVisible=deck.visible;
   const render=level=>{
    roadSolarSpill.setComparison(level);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    const classic=render(0),contained=render(1);
    // Road removed ONLY for the third diagnostic exposure: this
    // measures an actual deck-pixel mask independently of the ship/rails.
    deck.visible=false;
    const absent=render(1);
    return {classic,contained,absent,
     sealBefore:0,sealAfter:1,s:flight?.s??null};
   }finally{
    deck.visible=wasVisible;
    roadSolarSpill.setComparison(original);
   }
  };
 // 0.21.2.5 diagnostic: actual rendered ship material and same-frame A/B.
 if(new URLSearchParams(location.search).get("shipWhiteSmoke")==="1")
  window.__skyshiftShipWhiteProbe=()=>({
   enabled:shipWhiteSpillEnabled,
   ...(shipWhiteSpill?.stats()??{}),
   previousPbrTrim:whiteCoreContainment?.stats()?.shipPbrMaterials??null,
   shipId:activeShipId,
   exteriorKeyIntensity:worldLights.key.intensity,
   railBodyContainment:identitySurface?.getRailBodyContainment?.(),
   geometryAndPhysicsUnchanged:true
  });
 if(new URLSearchParams(location.search).get("shipWhiteFrameProof")==="1")
  window.__skyshiftShipWhiteFrameProof=(extraRoll=0)=>{
   if(!shipWhiteSpill||!ship||!neonPipeline?.render)
    throw Error("Ship white proof not installed");
   const previousMask=shipWhiteSpill.stats().whiteMask;
   const previousRoll=ship.rotation.z;
   const draw=(mask)=>{
    shipWhiteSpill.setComparison(mask);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try{
    ship.rotation.z=previousRoll+extraRoll;
    return {classic:draw(0),contained:draw(1),
     shipId:activeShipId,maskBefore:0,maskAfter:1,
     capturePosition:flight.s,extraRoll};
   }finally{
    ship.rotation.z=previousRoll;
    shipWhiteSpill.setComparison(previousMask);
   }
  };
 // White-core-specific photo QA: examine *ship PBR* and *full-deck*
 // specular handling without changing the normal gameplay or physics.
 if(new URLSearchParams(location.search).get("whiteCoreSmoke")==="1")
  window.__skyshiftWhiteCoreProbe=()=>({
   enabled:whiteCoreEnabled,
   ...(whiteCoreContainment?.stats()??{}),
   railGlareScale:identitySurface?.getTunnelGlareScale?.()??null,
   railBodyContainment:identitySurface?.getRailBodyContainment?.()??null,
   railWhiteContainment:identitySurface?.getRailNeutralContainment?.()??null,
   currentShipId:activeShipId,
   roadMaterial:premiumSurface?.material?.type??null,
   worldLightsUnchanged:Boolean(worldLights?.ambient&&worldLights?.key),
   bloomEnabled:Boolean(neonPipeline?.bloom?.enabled),
   trackDistance:flight?.s??null
  });
 // 0.21.2.5 QA ONLY — physically identify the overbright white rail
 // source by isolating body PBR vs colored inlay vs bloom on the SAME frame.
 if(new URLSearchParams(location.search).get("railSourceSmoke")==="1"){
  const body=world.getObjectByName("Angular integrated aero-barrier body");
  const inlay=world.getObjectByName("Thin inset zone accents and curve chevrons");
  const groove=world.getObjectByName("Recessed graphite cap channels and modular panel seams");
  const saved={
   bodyVisible:body?.visible,inlayVisible:inlay?.visible,grooveVisible:groove?.visible,
   metalness:body?.material?.metalness,roughness:body?.material?.roughness,
   color:body?.material?.color?.clone(),
   bloomEnabled:neonPipeline?.bloom?.enabled,
   ambient:worldLights?.ambient?.intensity,key:worldLights?.key?.intensity,
   fill:worldLights?.fill?.intensity
  };
  window.__skyshiftRailSourceSmoke=(mode="baseline")=>{
   if(!body||!inlay||!groove)throw Error("Missing named rail meshes");
   body.visible=saved.bodyVisible;inlay.visible=saved.inlayVisible;
   groove.visible=saved.grooveVisible;
   body.material.metalness=saved.metalness;body.material.roughness=saved.roughness;
   body.material.color.copy(saved.color);
   neonPipeline.bloom.enabled=saved.bloomEnabled;
   worldLights.ambient.intensity=saved.ambient;
   worldLights.key.intensity=saved.key;
   worldLights.fill.intensity=saved.fill;
   if(mode==="noBody")body.visible=false;
   else if(mode==="noInlay")inlay.visible=false;
   else if(mode==="noRails")body.visible=inlay.visible=groove.visible=false;
   else if(mode==="noBloom")neonPipeline.bloom.enabled=false;
   else if(mode==="noWorldKey"){
    worldLights.key.intensity=0;worldLights.fill.intensity=0;
    worldLights.ambient.intensity=0;
   }else if(mode==="bodyMatte"){
    body.material.metalness=0;body.material.roughness=1;
    body.material.color.setHex(0x263746);
   }else if(mode!=="baseline")throw Error("Bad diagnostic "+mode);
   return {mode,bodyVisible:body.visible,inlayVisible:inlay.visible,
    bodyMetalness:body.material.metalness,bodyRoughness:body.material.roughness,
    bloomEnabled:neonPipeline.bloom.enabled,
    keyIntensity:worldLights.key.intensity};
  };
 }
 // Exact-frame optical proof: render the SAME scene/camera twice, before
 // and after the new rail metal treatment, without advancing physics,
 // camera or colors even one tick. Testing only; no user-facing controls.
 if(new URLSearchParams(location.search).get("railFrameProof")==="1")
  window.__skyshiftRailFrameProof=()=>{
   const original=identitySurface.getRailBodyContainment();
   if(!neonPipeline?.render)throw Error("Missing WebGL pipeline");
   const render=(level)=>{
    identitySurface.setRailBodyContainment(level);
    neonPipeline.render(0);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
   };
   try {
    return {original:render(0),contained:render(1),
     railBodyBefore:0,railBodyAfter:1};
   }finally{identitySurface.setRailBodyContainment(original)}
  };
 // QA-only: prove every interior mesh has fog disabled while the
 // global exterior fog and ship lighting remain active and unmodified.
 if(new URLSearchParams(location.search).get("sealSmoke")==="1")
  window.__skyshiftExteriorSealProbe=()=>({
   enabled:exteriorSealEnabled,
   railGlareScale:identitySurface?.getTunnelGlareScale?.()??1,
   sceneFogDensity:scene.fog?.density??null,
   sceneFogPresent:Boolean(scene.fog),
   globalLightingPresent:Boolean(worldLights?.ambient&&worldLights?.key),
   materials:(world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1")?.children??[])
    .map(m=>({name:m.name,fog:m.material?.fog??null,
     trackS:m.geometry?.getAttribute("trackS")?.count??0}))
  });
 // Pass 2 hero-only art diagnostics. No simulation changes or test shortcuts.
 if(new URLSearchParams(location.search).get("heroSmoke")==="1")
  window.__skyshiftHeroProbe=()=>({
   enabled:architectureEnabled,track:TRACK_ID_0160,
   ...(orbitalHero?.stats?.()??{active:false,maskedPrimitiveBeams:0,
    addedDrawMeshes:0,additionalLights:0}),
   worldActive:cinematicWorld?.stats?.().active??false,
   legacyVaultsActive:signatureEnvironment?.stats?.().active??false,
   heroGroup:world.getObjectByName("Orbital Hero 0.19.2 · Asterion")?.children
    .map(x=>({name:x.name,mesh:x.isMesh??false,light:x.isPointLight??false}))??[]
  });
 // Dedicated 0.19 visual QA, available only to browser regression tests.
 if(new URLSearchParams(location.search).get("worldSmoke")==="1")
  window.__skyshiftWorldProbe=()=>({
   enabled:worldEnabled,track:TRACK_ID_0160,
   ...(cinematicWorld?.stats?.()??{active:false,beams:0,drawBatches:0}),
   worldMesh:world.getObjectByName("Cinematic World Rebuild 0.19.0")?.children
    .map(x=>({name:x.name,count:x.count,isInstanced:x.isInstancedMesh}))??[],
   legacyConduit:signatureEnvironment?.stats?.()??{active:false}
  });
 // Real WebGL inspection hook, only exposed with explicit QA URL flag.
 if(new URLSearchParams(location.search).get("envSmoke")==="1")
  window.__skyshiftEnvironmentProbe=()=>({
   enabled:envEnabled,track:TRACK_ID_0160,
   ...(signatureEnvironment?.stats?.()??{active:false,beams:0,extraDrawCalls:0}),
   worldMesh:world.getObjectByName("Signature Environment · Celestial Conduit 0.18.0")?.children
    .map(x=>({name:x.name,count:x.count,isInstanced:x.isInstancedMesh}))??[]
  });
 UI.hangarBtn.disabled=false;
 UI.trackPicker.value=TRACK_ID_0160;
 UI.trackName.textContent=ACTIVE_TRACK_0160.name;
 UI.topbarTrack.textContent=ACTIVE_TRACK_0160.name+" · "+SKYSHIFT_BUILD_VERSION;
 // Original Skyline boot version remains 0.26.5; show VAULT's actual
 // independent release in the HUD, never misleading 0.26.5.
 if(isVault()&&sharedOpticsEnabled)
  UI.topbarTrack.textContent=ACTIVE_TRACK_0160.name+
   (vaultPolish02899?" · "+PRODUCTION_TRACK.version:surfaceFinish02898?" · 0.28.9.8":curveContinuityReleaseEnabled?" · 0.28.9.7":
    roadSpillReleaseEnabled||coveWaveReleaseEnabled?" · 0.28.9.5":
     unifiedSourcesReleaseEnabled?" · 0.28.9.4":
  archOpticsReleaseEnabled?" · 0.28.9.3":
     ceilingFixtureReleaseEnabled?" · 0.28.9.2":
     straightParityReleaseEnabled?" · 0.28.9.1":
    cinematicMetalReleaseEnabled?" · 0.28.9":
    precisionNeonReleaseEnabled?" · 0.28.8":
    archFootAssemblyEnabled?" · 0.28.7":
    stabilityReleaseEnabled?" · 0.28.6":
    sharedWaveParityEnabled?" · 0.28.5":
    pmremReleaseEnabled?" · 0.28.4":
    VAULT_BOOST_0283_ACTIVE?" · 0.28.3":" · 0.28.2");
 UI.trackTagline.textContent=isVault()?
  "CONTINUOUS 3D TUNNEL · FAST C2 CORNERS · THREE LAPS.":isAurora()?
  "WIDE SWITCHBACKS · ROLLING HILLS · THREE FAST LAPS.":
  "WIDE ARCS · SMART LINES · THREE FASTER LAPS.";
 UI.trackFeatures.textContent=isVault()?
  (VAULT_BOOST_0283_ACTIVE?
   "3 × 3,400 M · FULL TUNNEL · MAIN BOOST · GRIP · NO RISK LANES":
   "3 × 3,400 M · FULL TUNNEL · GRIP · S-LINKS · NO JUMPS"):isAurora()?
  "3 × 3,400 M · GRIP · OPEN SWEEPS · LUMEN PASS · NO RISK LINES":
  "3 × 3,400 M · GRIP · WALL · CORKSCREW · SHADOW TUNNEL";
 if(VAULT_MEGA_JUMP_ACTIVE){
  UI.trackName.textContent="NEON VAULT · MEGA JUMP · "+VAULT_JUMP_VERSION;
  UI.topbarTrack.textContent="NEON VAULT · MEGA JUMP · "+VAULT_JUMP_VERSION;
  UI.trackTagline.textContent="EXPANSION CHAMBER · 54.4 M LEAP · AIR TRICKS";
  UI.trackFeatures.textContent="3 × 3,400 M · MEGA JUMP · GRIP + STEER IN AIR";
  document.title="SKYSHIFT · Vault Mega Jump · "+VAULT_JUMP_VERSION;
  if(VAULT_COMPACT_ACTIVE)UI.hud.classList.add('hud-compact-0292');
  if(VAULT_JUMP_POLISH_ACTIVE){
   UI.speed.closest(".hud-module").querySelector(".hud-module-heading").textContent="HASTIGHET";
   UI.flight.parentElement.style.display="none";
   UI.gripCue.classList.add("hidden");UI.riskCue.classList.add("hidden");
   UI.toast.classList.add("hidden");UI.banner.classList.add("hidden");
  }
 }
 UI.challengeButton.classList.toggle("hidden",!ACTIVE_TRACK_0160.hasSkylineChallenges);
 UI.riskCue.classList.add("hidden");
 refreshHangar();refreshChallenges();
 refreshTrialMenu();
}
function resize(){
 if(runtimeLifetime.disposed||runtimeLifetime.contextLost||!renderer)return;
 const rect=UI.canvas.getBoundingClientRect();
 const width=Math.max(1,Math.round(rect.width||innerWidth));
 const height=Math.max(1,Math.round(rect.height||innerHeight));
 camera.aspect=width/height;camera.updateProjectionMatrix();
 renderer.setSize(width,height,false);
 neonPipeline?.resize(width,height);
 velocityCinematography?.resize?.(width,height,neonPipeline?.internalPixelRatio??1);
 unifiedCinematicGrade?.resize?.(width,height,neonPipeline?.internalPixelRatio??1);
 finalCohesion?.resize?.(width,height,neonPipeline?.internalPixelRatio??1);
}
function syncFullscreenUi(active){
 UI.fullscreen.setAttribute("aria-label",active?"Exit fullscreen":"Enter fullscreen");
 UI.fullscreen.setAttribute("aria-pressed",String(active));
 UI.fullscreen.title=active?"Exit fullscreen":"Fullscreen";
 UI.fullscreen.classList.toggle("active",active);
 UI.menuFullscreen.textContent=active?"⛶ EXIT FULLSCREEN":"⛶ FULLSCREEN";
 UI.menuFullscreen.setAttribute("aria-pressed",String(active));
 if(active)UI.fullscreenHelp.classList.add("hidden");
}
function fullscreenBlocked(error){
 UI.fullscreenHelp.classList.remove("hidden");
 UI.fullscreenHelp.textContent="Fullscreen kunde inte aktiveras ("+(error?.name||"Error")+": "+(error?.message||"okänd orsak")+"). Prova fullscreen-knappen igen i en vanlig webbläsarflik.";
 if(uiState.mode==="playing")flashToast("FULLSCREEN BLOCKED · TAP FULLSCREEN TO RETRY",3200);
}
function installFullscreen(){
 fullscreenController=makeFullscreenController({
   doc:document,root:$("app"),deviceScreen:screen,
   onChange:syncFullscreenUi,
   onBlocked:fullscreenBlocked,
   userActivation:()=>navigator.userActivation?.isActive??null,
   viewport:()=>({width:innerWidth,height:innerHeight,screenWidth:screen.width,screenHeight:screen.height,
    visualWidth:window.visualViewport?.width??null,visualHeight:window.visualViewport?.height??null,
    canvasWidth:UI.canvas.width,canvasHeight:UI.canvas.height,
    standalone:matchMedia("(display-mode: standalone)").matches,embedded:window.top!==window}),
   onResize:()=>{resize();runtimeLifetime.once(resize);}
 });
 fullscreenController.sync();
 if(window.visualViewport)runtimeLifetime.listen(window.visualViewport,"resize",resize);
}
function openSettings(){
 if(uiState.mode!=="menu")return;
 if(smartPerformance)syncSmartSettings();
 uiState.mode="settings";
 UI.menu.classList.add("hidden");
 UI.settings.classList.remove("hidden");
 UI.settingsOpen.classList.add("hidden");
}
function closeSettings(){
 if(uiState.mode!=="settings")return;
 uiState.mode="menu";
 UI.settings.classList.add("hidden");
 UI.menu.classList.remove("hidden");
 UI.settingsOpen.classList.remove("hidden");
 refreshTrialMenu();
}
function startImmersiveTrial(challenge=null){
 if(!fullscreenController.active())fullscreenController.request(false,"start-run");
 enterPlaying(challenge);
}
function clearInput(){clearRaceInput(UI,uiState);}
function resetFlight(){
 wakeSmokePath=null;completedSparkStats=null;
 hudBudget.reset();domWrites.reset();
 flight=newFlightState();previousSector=0;lastRailLog=0;
 if(currentChallenge)seedChallengeFlight(currentChallenge);
 raceSession.start(activeShipId||fleetProgress.selected);
 recordRealGhostPose(true);
 ghostVisual?.hide();
 railFeedback=createRailFeedbackState();
 raceHud.reset();
 previousHudShield=flight.shield;
 reactiveHud.reset({shield:flight.shield});
 tunnelInside=false;tunnelEntries=0;tunnelExits=0;
 tunnelSeconds=0;tunnelMaxIntensity=0;
 zoneWave=newZoneWaveState();stationWorld?.updateWave?.(zoneWave);
 sharedTunnelRuntime?.updateWave?.(zoneWave);
 archRoadReflections?.updateWave?.(zoneWave);
 unifiedCeilingRoad?.updateWave?.(zoneWave);
 roadSpill02895?.updateWave?.(zoneWave);
 premiumSurface?.setWaveState(zoneWave);
 identitySurface?.setWaveState(zoneWave);
 scene?.background?.copy(themes[0].skyColor);
 scene?.fog?.color.copy(themes[0].fogColor);
 neonKit?.updateAccent(COLOR[0].color,1);
 if(neonKit)shadowTunnel?.setAccent(neonKit.worldAccent);
 motionState=createFlightMotionState(flight.heading);
 cinematicState=createCinematicState();
 kineticCamera=createKineticCameraState();
 signatureFlight=createSignatureFlightState();
 resetUnifiedFlightRig(motionRig);
 resetFidelityDirector(fidelityDirector);
 resetRacingExperience(racingExperience);
 chaseCameraController.resetPeak(KINETIC_CAMERA.fovStartDegrees);
 boostSpring=createBoostSpringState();
 velocityState=createVelocityState();
 velocityPresence=createVelocityPresenceState();
 reactiveWingFlaps?.reset();livingWake?.reset();railSparks?.reset();
 premiumSurface?.setVelocityFlow(0,0);
 stationWorld?.updateMotion?.({flow:0,phaseMeters:0,boost:0,playing:false});
 velocityCinematography?.update?.({playing:false});
 if(velocityExperience)velocityCinematography.reset();
 unifiedCinematicGrade?.update?.({playing:false});
 identitySurface?.setVelocityFlow(0,0);
 spaceBackdrop?.setVelocityFlow(0);
 tunnelBlackout?.reset();
 premiumFX?.reset();
 activeCraft?.resetTail?.();
 activeCraft?.resetPolish?.();
 sideThrusters?.reset();
 perfFrames=0;perfTotal=0;perfMin=200;
 renderSamples=0;renderCallTotal=0;renderCallPeak=0;triangleTotal=0;
 resetRaceSimulation(raceSimulation,flight);frameMonitor=createFrameMonitor();
 resetPerfMonitor(frameProfiler);gpuClock?.reset();lastPerfPanelUpdate=0;endurance?.reset();presentationGate.reset();
 document.documentElement.style.setProperty("--neon","#43dff3");
 raceTelemetry.reset();uiState.trackHint=-1;clearInput();
 event("trial_start",{trial:TRIAL.id});
 UI.banner.classList.add("hidden");
 UI.flash.classList.remove("active");
 UI.toast.classList.add("hidden");
 UI.riskCue.classList.add("hidden");
 UI.finalTitle.textContent="FLIGHT ENDED";
 // Place the camera at its new orbit at spawn to prevent startup swooping.
 chaseCameraController.spawn(camera,flight,motionState,cinematicState);
 worldClock.last=performance.now();worldClock.accum=0;
}
function showRaceCountdown(label){
 const overlay=$("race-countdown");
 overlay.classList.toggle("hidden",!label);
 $("race-countdown-label").textContent=label||"";
 overlay.classList.toggle("race-countdown-go",label==="GO!");
}
function enterPlaying(challenge=null){
 if(!countdownEnabled){raceLifecycle.enterPlaying(challenge);return;}
 if(uiState.mode==="countdown"||!sceneReady||runtimeLifetime.disposed||runtimeLifetime.contextLost||
  (window.__skyshiftBoot?.deferred&&window.__skyshiftBoot.phase!=="ready"))return;
 raceLifecycle.enterPlaying(challenge,{countdown:true});
 if(uiState.mode!=="countdown")return;
 raceCountdown.start();showRaceCountdown("3");
}
function tickRaceCountdown(dt){
 if(!countdownEnabled||!raceCountdown.label)return;
 if(uiState.mode!=="countdown"&&uiState.mode!=="playing"){
  raceCountdown.cancel();showRaceCountdown("");return;
 }
 const previous=raceCountdown.label;
 const next=raceCountdown.advance(dt,!document.hidden);
 if(previous===next)return;
 showRaceCountdown(next);
 if(next==="GO!"){
  // This executes AFTER the current frame's physics gate. The first
  // authoritative simulation step can only run on the next frame.
  raceLifecycle.finishCountdown();
  presentationGate.reset();
 }
}
function returnToMainMenu(){raceLifecycle.returnToMainMenu();}
function pause(){raceLifecycle.pause();if(countdownEnabled&&uiState.mode==="paused"){raceCountdown.cancel();showRaceCountdown("");}}
function resume(){raceLifecycle.resume();}
function endRun(won){
 if(currentChallenge){endChallengeRun(won);return;}
 completedSparkStats=railSparks?.stats()??null;
 recordRealGhostPose(true);
 const ttResult=raceSession.finish(won,flight);
 if(timeTrialState.mode==="time-trial")
  event("time_trial_finish",{saved:ttResult?.saved??false,
   newPersonalBest:ttResult?.improved??false,
   previousBestSeconds:timeTrialState.previousBest?.duration??null,
   timeSeconds:+flight.elapsed.toFixed(3)});
 ghostVisual?.hide();
 uiState.mode="ended";clearInput();
 UI.finalTitle.textContent=won?ACTIVE_TRACK_0160.name+" COMPLETE":"FLIGHT ENDED";
 UI.finalTitle.classList.toggle("success",won);
 UI.finalDistance.textContent=Math.floor(flight.s)+" M";
 if(UI.finalLaps)UI.finalLaps.textContent=flight.lapsCompleted+" / "+CIRCUIT.laps;
 UI.finalSector.textContent=String(zoneWave.playerStage+1).padStart(2,"0");
 UI.finalTime.textContent=timeTrialState.mode==="time-trial"?
  formatTrialTime(flight.elapsed):
  Math.floor(flight.elapsed/60)+":"+
   String(Math.floor(flight.elapsed%60)).padStart(2,"0");
 UI.finalJumps.textContent=flight.peakYawRateDeg.toFixed(1)+"°/S";
 UI.finalStyle.textContent=flight.offRoadSeconds.toFixed(1)+" S";
 const best=updateLegacyRaceBest(fleetStorage(),won,flight.elapsed,raceBestKey);
 const reward=recordFleetClear(fleetProgress,won);
 fleetProgress=saveFleet(fleetStorage(),reward.state);
 UI.unlockToast.classList.toggle("hidden",
  !reward.newlyUnlocked.includes("stingray"));
 refreshHangar();
 if(reward.newlyUnlocked.includes("stingray"))
  event("fleet_unlock",{ship:"stingray",condition:"first_three_lap_clear"});
 UI.finalBest.textContent=timeTrialState.mode==="time-trial"?
  (ttResult?.bestSeconds?formatTrialTime(ttResult.bestSeconds):"—"):
  (best?best.toFixed(1)+" S":"—");
 UI.trialResult.classList.toggle("hidden",timeTrialState.mode!=="time-trial");
 UI.challengeResult.classList.add("hidden");
 UI.challengeEndBack.classList.add("hidden");
 UI.trialResult.classList.toggle("new-best",!!ttResult?.improved);
 if(timeTrialState.mode==="time-trial"){
  UI.trialResult.textContent=ttResult?.improved?
   "NEW PERSONAL BEST · "+formatTrialTime(flight.elapsed)+" · GHOST SAVED":
   ttResult?.reason==="slower"?
    "KEEP PUSHING · "+formatTrialDelta(
      flight.elapsed-(ttResult.bestSeconds??flight.elapsed))+" VS PERSONAL BEST":
   ttResult?.reason==="storage-unavailable"?
    "TIME COMPLETE · LOCAL STORAGE UNAVAILABLE":
    "NO GHOST SAVED · FINISH THREE CLEAN LAPS";
 }
 refreshTrialMenu();
 event(won?"trial_clear":"trial_failed",{shield:flight.shield});
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.fullscreen.classList.add("hidden");
 UI.end.classList.remove("hidden");
}
function announceSector(index){
 const palette=ZONE_PALETTES[index],color=palette.light;
 document.documentElement.style.setProperty("--neon","#"+color.toString(16).padStart(6,"0"));
 premiumFX?.onZone();
 if(index===0)return;
 reactiveHud.onZone();
 if(!VAULT_JUMP_POLISH_ACTIVE){
 UI.bannerNum.textContent=String(index+1).padStart(2,"0");
 UI.bannerName.textContent=palette.name;
 UI.banner.classList.remove("hidden");
 UI.banner.style.animation="none";void UI.banner.offsetWidth;UI.banner.style.animation="";
 // No screen flash: the physical wave already provides visual spectacle.
 UI.flash.classList.remove("active");
 clearTimeout(uiState.bannerTimeout);
 uiState.bannerTimeout=setTimeout(()=>UI.banner.classList.add("hidden"),1300);
 }
 event("zone_passed",{stage:index,palette:palette.id,
  atMeters:+flight.s.toFixed(1)});
}
function refreshHud(){raceHud.refreshHud(flight,zoneWave,currentChallenge,timeTrialState,railFeedback,racingExperience);}
function maybeShowCue(){raceHud.maybeShowCue(flight);}
function integrate(dt){
 // A finish can occur midway through a multi-step 120Hz render frame.
 // Never award the same medal multiple times in that remaining frame.
 if(uiState.mode!=="playing")return;
 const input=readRaceInput(uiState);
 const {steer,grip:gripHeld}=input;
 const result=stepFlight(flight,dt,input);
 recordRealGhostPose();
 // One real 120Hz step. Read steering/GRIP/contact, never rewrite physics.
 const cleanFlow=observeRacingStep(racingExperience,flight,dt,result);
 if(cleanFlow){
  event("precision_flow",{...cleanFlow,physicalBoost:false});
  flashToast("PRECISION FLOW · "+cleanFlow.name+
   (cleanFlow.chain>1?" · CHAIN ×"+cleanFlow.chain:""),1050);
 }
 UI.grip.classList.toggle("armed",gripHeld);
 const airGrip=gripHeld&&!flight.grounded&&flight.lastJumpLap===flight.lap;
 UI.grip.classList.toggle("active",flight.gripActive||airGrip);
 UI.grip.classList.toggle("air-trick",airGrip);
 UI.grip.setAttribute("aria-pressed",flight.gripActive||airGrip?"true":"false");
 UI.controls.classList.toggle("grip-pressed",gripHeld);
 if(result.gripActivated)
  event("grip_activated",{steer:+steer.toFixed(2),
   previousFullGripReferenceFactor:GRIP_SPEC.yawMultiplier,
    actualFullGripFactorAtSpeed:+steeringBalanceAt(flight.currentSpeed).grip.toFixed(3),
   normalFactor:+normalYawFactorAt(flight.currentSpeed).toFixed(3),
   actualRelativeGain:+steeringBalanceAt(flight.currentSpeed).relativeGripGain.toFixed(2),
   maxSpeedPenaltyPercent:GRIP_SPEC.maxSpeedPenalty*100});
 if(result.boostActivated){
  // The real 120Hz pad contact selects either SAFE or RISK once per lap.
  // Trigger the existing camera/engine reaction from the ACTUAL reward.
  const choice=result.boostChoice;
  const multiplier=choice?.multiplier??BOOST_CONFIG.multiplier;
  event("boost_activated",{pad:result.boostActivated,multiplier,
   kind:choice?.kind??"launch",group:choice?.group??null});
  triggerBoostSpring(boostSpring,flight.zoneCruiseSpeed,multiplier);
  igniteVelocity(velocityState);triggerSignatureBoost(signatureFlight);
  reactiveHud.onBoost();
  const percent=Math.round((multiplier-1)*100);
  flashToast(choice?.kind==="risk"?
   "RISK LINE CLEAR · +"+percent+"% SPEED":
   choice?.kind==="safe"?
   "SAFE LINE · +"+percent+"% SPEED":
   "BOOST ENGAGED · +"+percent+"% SPEED",900);
 }
 if(flight.shield<previousHudShield)reactiveHud.onImpact();
 previousHudShield=flight.shield;
 if(VAULT_JUMP_POLISH_ACTIVE&&result.railContact&&flight.railShieldLost>0&&flight.railDamageCooldown===TRIAL.railShieldDamage.intervalSeconds)
  event("rail_shield_damage",{shield:flight.shield,totalLost:flight.railShieldLost});
 if(result.railContactStarted){
  startRailFeedback(railFeedback,flight.lastRailSide);
  event("rail_scrub_started",{side:flight.lastRailSide,
   at:+flight.lateral.toFixed(2),
   scrubIntensity:+flight.railScrubIntensity.toFixed(3)});
 }
 if(flight.railContacts>lastRailLog){
   lastRailLog=flight.railContacts;
   event("guardrail_contact",{side:flight.lastRailSide,at:+flight.lateral.toFixed(2)});
 }
 uiState.jumpPressed=false;
 if(result.jumped){
   premiumFX?.onJump();triggerSignatureJump(signatureFlight);
   event("skyline_leap_launch",{lap:flight.lap,
    velocity:+flight.vy.toFixed(2),speed:+flight.currentSpeed.toFixed(2)});
   flashToast("SKYLINE LEAP · GRIP + STEER TO ROLL",1150);
 }
 if(result.trickStarted)
  event("air_trick_started",{lap:flight.lap,
   direction:flight.trickDirection<0?"LEFT":"RIGHT"});
 if(result.trickCompleted){
  event("air_trick_full_rotation",{lap:flight.lap,
   direction:flight.trickDirection<0?"LEFT":"RIGHT",
   degrees:+flight.trickPeakDegrees.toFixed(1)});
  flashToast("360° AIR ROLL · NAIL THE LANDING",740);
 }
 if(result.landed){
   // Camera-only short landing compress/recover impulse. Authoritative
   // flight physics and the actual landing impact remain untouched.
   if(CAMERA_GAIN>0)triggerKineticLanding(kineticCamera,result.landImpact);
   triggerSignatureLanding(signatureFlight,result.landImpact);
   const p=positionAt(flight.s,flight.lateral,0);
   premiumFX?.onLand({...p,heading:flight.heading});
   event("landing",{impact:+result.landImpact.toFixed(2),
    cleanLeaps:flight.cleanLeapLandings});
   if(result.landingBoostAwarded){
    event("landing_boost_awarded",{lap:flight.lap,
     bonusPercent:AIR_TRICKS.landingBoostPercent,
     durationSeconds:AIR_TRICKS.landingBoostDurationSeconds});
    triggerBoostSpring(boostSpring,flight.zoneCruiseSpeed,
      1+AIR_TRICKS.landingBoostPercent/100);
    igniteVelocity(velocityState);triggerSignatureBoost(signatureFlight);
    reactiveHud.onBoost();
    flashToast("PERFECT LANDING · +22% BOOST",1150);
   }else if(result.landingBoostRejected){
    event("air_trick_missed",{lap:flight.lap,
      reason:result.landingBoostReason,
      achievedDegrees:+flight.trickPeakDegrees.toFixed(1)});
    flashToast("TRICK NOT LANDED · NO BOOST",890);
   }else if(flight.cleanLeapLandings>0)
    flashToast("CLEAN LANDING",770);
 }
 if(result.cleared)event("gap_cleared",{count:flight.clearedGaps.length});
 if(result.routeChoice)event("route_choice",{route:result.routeChoice});
 if(result.routeReward){
   event("risk_route_clear",{styleBonus:500});
   flashToast("RISK ROUTE CLEAR · +500 STYLE",1700);
 }
 if(result.gripApexEntered){
  event("grip_apex_enter",{lap:flight.lap,
   widthMeters:GRIP_APEX.minWidthMeters,
   peakCurvature:GRIP_APEX.peakCurvature});
 }
 if(result.gripApexExited){
  event("grip_apex_exit",{lap:flight.lap,clean:result.cleanGripApexExit,
    gripSeconds:+flight.gripApexGripSeconds.toFixed(2)});
  if(result.cleanGripApexExit)flashToast("GRIP APEX · CLEAN LINE",820);
 }
 if(result.corkscrewEntered){
   event("corkscrew_enter",{lap:flight.lap,
     start:CORKSCREW.start,lengthMeters:CORKSCREW.lengthMeters});
   flashToast("CORKSCREW ENGAGED · 360° ROLL",1350);
 }
 if(result.corkscrewExited){
   event("corkscrew_exit",{lap:flight.lap,clean:result.cleanCorkscrewExit,
     peakDegrees:+flight.corkscrewPeakDegrees.toFixed(1),
     ceilingSeconds:+flight.corkscrewCeilingSeconds.toFixed(2)});
   flashToast(result.cleanCorkscrewExit?
     "CORKSCREW CLEAR · PERFECT LINE":"CORKSCREW COMPLETE",950);
 }
 if(result.wallEntered){
   event("magnetic_wall_enter",{lap:flight.lap,
     bankDegrees:+bankDegreesAt(flight.s).toFixed(1)});
   flashToast("MAGNETIC GRIP ENGAGED · WALL RIDE",1150);
 }
 if(result.wallExited){
   event("magnetic_wall_exit",{lap:flight.lap,
     clean:result.cleanWallExit,
     peakDegrees:+flight.magneticPeakDegrees.toFixed(1)});
   if(result.cleanWallExit)flashToast("MAGNETIC WALL CLEAR",850);
 }
 if(result.crashed){
   event("fall",{at:Math.round(flight.lastCrashS),shield:flight.shield});
   flashToast("OFF TRACK · RETRY FROM CHECKPOINT",1350);
 }
 if(result.lapCompleted){
  const completed=result.lapCompleted,lapTime=flight.lapTimes.at(-1);
  event("lap_completed",{completed,lapSeconds:lapTime,upcomingLap:flight.lap});
  if(completed<CIRCUIT.laps)
   flashToast("LAP "+(completed+1)+" / "+CIRCUIT.laps+
    " · "+lapTime.toFixed(1)+"S · KEEP PUSHING",1550);
 }
 const wave=updateZoneWave(zoneWave,flight.elapsed,flight.s);
 for(const stage of wave.started)
  event("zone_wave_emitted",{stage,originMeters:+zoneWave.waves[stage-1].startS.toFixed(1)});
 if(wave.changed){
  previousSector=wave.stage;
  const priorCruiseTarget=speedAt(flight.s,flight.zoneSpeedStage);
  setZoneSpeedStage(flight,wave.stage);
  event("zone_speed_increase",{
   stage:wave.stage,cruiseTargetMetersPerSecond:+speedAt(flight.s,wave.stage).toFixed(2),
   speedStepPercent:+((speedAt(flight.s,wave.stage)/priorCruiseTarget-1)*100).toFixed(1)});
  announceSector(wave.stage);
 }
 const insideNow=!isVault()&&inShadowTunnel(flight.s);
 if(insideNow&&!tunnelInside){
  tunnelEntries++;event("shadow_tunnel_enter",{lap:flight.lap});
 }else if(!insideNow&&tunnelInside){
  tunnelExits++;event("shadow_tunnel_exit",{lap:flight.lap});
 }
 tunnelInside=insideNow;
 if(insideNow)tunnelSeconds+=dt;
 maybeShowCue();
 const outcome=raceOutcome(flight,result,currentChallenge);
 if(outcome!==null)endRun(outcome);
}
function updatePalette(dt){
 // Every visual material receives the same single-pass presentation view.
 const visualWave=vaultPolish02899?visualWaveView02899(zoneWave,flight.s):zoneWave;
 stationWorld?.updateWave?.(visualWave);
 sharedTunnelRuntime?.updateWave?.(visualWave);
 archRoadReflections?.updateWave?.(visualWave);
 unifiedCeilingRoad?.updateWave?.(visualWave);
 roadSpill02895?.updateWave?.(visualWave);
 premiumSurface?.setWaveState(visualWave);
 identitySurface?.setWaveState(visualWave);
 // The atmosphere follows the physical front spatially, not the HUD switch.
 const blend=frontPaletteBlend(zoneWave,flight.s);
 const before=themes[blend.from],after=themes[blend.to];
 targetSky.copy(before.skyColor).lerp(after.skyColor,blend.mix);
 targetFog.copy(before.fogColor).lerp(after.fogColor,blend.mix);
 targetAccent.copy(before.accent).lerp(after.accent,blend.mix);
 // World-light echo: restrained fog tint only, never a HUD-wide flash.
 const nearHorizon=horizonWaveCue(zoneWave,flight.s);
 const resonance=waveResonanceStrength(zoneWave,flight.elapsed);
 targetFog.lerp(SPECTRAL_WHITE,nearHorizon*.038+resonance*.018);
 // Spatial darkness reduces atmosphere wash while leaving track HDR intact.
 const shadow=isVault()?0:tunnelIntensityAt(flight.s);
 targetSky.lerp(SHADOW_VOID,shadow*.95);
 targetFog.lerp(SHADOW_VOID,shadow*.94);
 if(CINEMATIC_ENABLED){
  targetSky.multiplyScalar(CINEMATIC_SPACE_0170.skyScale);
  targetFog.multiplyScalar(CINEMATIC_SPACE_0170.fogScale);
 }
 tunnelMaxIntensity=Math.max(tunnelMaxIntensity,shadow);
 const k=1-Math.exp(-dt*4.2);
 scene.background.lerp(targetSky,k);
 scene.fog.color.lerp(targetFog,k);
 cinematicLighting?.update({accent:targetAccent,sky:scene.background,
  fog:scene.fog.color,resonance,darkness:shadow});
 neonKit.updateAccent(targetAccent,k);
 shadowTunnel?.setAccent(neonKit.worldAccent);
 // Rail lighting samples its own track coordinate inside its shader.
 for(const light of engineLights)light.color.copy(neonKit.worldAccent);
}
function placeShip(time,dt,view=flight,motion=motionState,cinematic=cinematicState){
 shipPresentation.frame(time,view,flight,motion,cinematic,motionRig,signatureFlight,
  velocityState,velocityPresence,racingExperience,zoneWave,ship,sideThrusters,
  engineLights,engineCore,enginePlumes,shadowMesh);
 chaseCameraController.apply(camera,dt,view,flight,motion,cinematic,motionRig,
  kineticCamera,racingExperience,velocityPresence,boostSpring,uiState.mode==="playing");
}
function loop(now){
 // Keep worldClock.last at the last actual presentation, so skipped RAFs
 // accumulate real time and the fixed-step simulation advances all due ticks.
 if(smartPerformance&&!presentationGate.allow(now,uiState.mode==='playing'?smartPerformance.fps:30))return;
 let physicsMs=0,hudMs=0,physicsSteps=0;
 const presentationBegin=performance.now();
 const rawDt=Math.max(0,(now-worldClock.last)/1000);
 const dt=Math.min(.095,rawDt);
 worldClock.last=now;
 if(uiState.mode==="playing"&&!waveSmokeHold){
   const physicsBegin=performance.now();
   const tick=advanceRaceSimulation(raceSimulation,rawDt,flight,integrate);
   physicsSteps=tick.steps;
   physicsMs=performance.now()-physicsBegin;
   const hudBegin=performance.now();
   if(hudBudget.shouldUpdate(now))refreshHud();
   hudMs=performance.now()-hudBegin;
 }
 tickRaceCountdown(dt);
 if(flight){
   const presentationDt=uiState.mode==="playing"?dt:0;
   if(uiState.mode==="playing"){
    stepRailFeedback(railFeedback,dt,flight.railContacting);
    raceHud.advance(dt);
   }
   stepVelocityState(velocityState,presentationDt,flight.currentSpeed,
    flight.zoneCruiseSpeed,flight.boostMultiplier);
   stepVelocityPresence(velocityPresence,presentationDt,{
    speed:flight.currentSpeed,boostMultiplier:Math.max(flight.boostMultiplier,
      flight.landingBoostMultiplier),
    grounded:flight.grounded,verticalSpeed:flight.vy,steering:flight.steering,
    yawRate:flight.yawRate,trickActive:flight.trickActive
   });
   // Every zone increases environmental flow even without hitting a boost pad.
   const worldFlow=Math.max(velocityState.worldFlow,velocityPresence.trackFlow);
   premiumSurface?.setVelocityFlow(worldFlow,velocityState.flowPhaseMeters);
   stationWorld?.updateMotion?.({
    flow:worldFlow,phaseMeters:velocityState.flowPhaseMeters,
    boost:Math.max(0,Math.min(1,(Math.max(flight.boostMultiplier,
     flight.landingBoostMultiplier)-1)/0.40)),
    playing:uiState.mode==="playing"
   });
   identitySurface?.setVelocityFlow(worldFlow,velocityState.flowPhaseMeters);
   spaceBackdrop?.setVelocityFlow(Math.max(velocityState.worldFlow*.66,
    velocityPresence.starFlow));
   tunnelBlackout?.apply(uiState.mode==="hangar"?0:flight.s);
   updatePalette(dt);
   // CI-only moving flight-path probe; normal players never take this path.
   if(wakeSmokePath&&uiState.mode==="playing"){
    const k=wakeSmokePath.frames++;
    flight.s+=.86;
    const testPose=positionAt(flight.s,flight.lateral);
    flight.worldX=testPose.x;
    flight.worldZ=testPose.z;
    flight.heading=headingAt(flight.s)+
     (wakeSmokePath.load==="grip"?.15*Math.sin(k*.075):0);
    flight.y=surfaceHeightAt(flight.s)+TRIAL.hoverHeight+
      (wakeSmokePath.load==="air"?4:0);
    snapRacePose(raceSimulation,flight);
   }
   const view=raceRenderPose(raceSimulation,flight,uiState.mode==="playing");
   whiteCoreContainment?.update(view.s,uiState.mode==="playing");
   shipWhiteSpill?.update(view.s,targetAccent,uiState.mode==="playing");
   sharedShipLight?.update(view.s,COLOR_WAVE_ACTIVE?visualWaveView02899(zoneWave,flight.s):null);
   pmremPipeline?.updateStation(view.s);
   // Flight motion sees the same interpolated 120Hz simulation pose as FX.
   // Ship bank, signature effects, preview and kinetic camera share
   // stable read-only signals. All original springs and handling are kept.
   advanceUnifiedFlightRig(motionRig,view,flight,presentationDt,now/1000,
    uiState.mode==="playing",motionState,signatureFlight,cinematicState,
    kineticCamera);
   stepRacingExperience(racingExperience,presentationDt,{
    s:view.s,steering:view.steering,yawRate:view.yawRate,
    gripIntensity:flight.gripIntensity,
    speed:flight.currentSpeed,grounded:view.grounded,
    wall:motionRig.wall,corkscrew:motionRig.corkscrew,
    playing:uiState.mode==="playing"
   });
   // 0.11.4 optimized near-field PBR remains vertex-calculated even on
   // 4GB devices by default. The classic low-memory shader is opt-out only.
   // A51 still gets its ordinary adaptive DPR and optimized bloom pass.
   fidelitySignals.s=view.s;
   fidelitySignals.speed=flight.currentSpeed;
   fidelitySignals.boostMultiplier=Math.max(flight.boostMultiplier,
    flight.landingBoostMultiplier);
   fidelitySignals.wave=waveResonanceStrength(zoneWave,flight.elapsed);
   fidelitySignals.playing=uiState.mode==="playing";
   advanceFidelityDirector(fidelityDirector,presentationDt,fidelitySignals);
   premiumSurface?.setFidelitySignal(fidelityDirector);
   // Original on-track Hangar preview. The game physics remains frozen
   // while the procedural ship and scenery are rendered normally.
   placeShip(now/1000,dt,view,motionState,cinematicState);
   // Playback uses elapsed race time and *recorded real coordinates*,
   // never an AI driver or automatic road centerline. Hidden in normal runs.
   if(uiState.mode==="playing"&&timeTrialState.mode==="time-trial"){
    const visible=ghostVisual?.frame({active:true,enabled:raceSession.ghostEnabled,
     best:timeTrialState.previousBest,
     elapsed:view.elapsed??flight.elapsed});
    raceSession.playbackFrame(visible,flight.elapsed);
   }else ghostVisual?.hide();
   // Tail articulation is presentation only: camera and 120Hz physics
   // continue to follow the pilot rather than any segment positions.
   if(activeCraft?.frameTail){
    const demo=uiState.mode==="hangar";
    activeCraft.frameTail(demo?dt:uiState.mode==="playing"?dt:0,
     demo?{steering:Math.sin(now*.0012)*.93,
      yawRate:Math.sin(now*.0012-.29)*.86,
      gripIntensity:.48+.46*(.5+.5*Math.sin(now*.00063)),
      boostMultiplier:1.10+.13*(.5+.5*Math.cos(now*.00082)),
      speed:104,grounded:true}:
      {steering:view.steering,yawRate:view.yawRate,
       gripIntensity:flight.gripIntensity,
       boostMultiplier:flight.boostMultiplier,
       speed:flight.currentSpeed,grounded:view.grounded,
       verticalSpeed:view.vy??flight.vy});
   }
   // Four pre-batched premium surfaces only change material glow; neither
   // model influences the pilot physics, real camera or collisions.
   if(activeCraft?.framePolish){
    const demo=uiState.mode==="hangar";
    activeCraft.framePolish(demo?dt:uiState.mode==="playing"?dt:0,
      demo?{speed:104,
       gripIntensity:.30+.22*Math.sin(now*.00075),
       boostMultiplier:1.14}:
      {speed:flight.currentSpeed,gripIntensity:flight.gripIntensity,
       boostMultiplier:flight.boostMultiplier});
   }
   // Real steering -> sprung deployable metal plates, independent of flight.
   // Hangar previews show an authentic slow actuation on the original track.
   const showroom=uiState.mode==="hangar";
   reactiveWingFlaps?.frame(showroom?dt:presentationDt,
    showroom?{
     steering:Math.sin(now*.00135)*.85,
     yawRate:Math.cos(now*.00135)*.53,
     gripIntensity:.46+.30*Math.sin(now*.00067)
    }:{
     steering:view.steering,yawRate:view.yawRate,
     gripIntensity:flight.gripIntensity
    });
   // True ship-local three-quarter framing for the Stingray Hero.
   // The full original racing track remains visible behind the Hangar.
   // Switch off both temporary art lights before any real gameplay frame.
   if(uiState.mode==="hangar"&&activeShipId==="stingray"){
    hangarHeroRig?.frame({hangar:true,ship,camera,
     shipId:activeShipId,time:resourceSmoke?0:now*.001});
   }else{
    hangarHeroRig?.disable();
    // Manta Blade retains its established showroom presentation.
    if(uiState.mode==="hangar"){
     const t=resourceSmoke?0:now*.00023;
     camera.position.set(ship.position.x+5.9+Math.sin(t)*.65,
      ship.position.y+3.45,
      ship.position.z+11.8+Math.cos(t)*.55);
     camera.lookAt(ship.position.x-6.5,
      ship.position.y+.28,ship.position.z+1.7);
    }
   }
   if(premiumFX){
    // Stable context; active engine FX needs only forwardSpeed and boostMultiplier.
    engineFxFrame.dt=dt;
    engineFxFrame.playing=uiState.mode==="playing";
    engineFxFrame.flight.forwardSpeed=flight.currentSpeed;
    engineFxFrame.flight.boostMultiplier=flight.boostMultiplier;
    engineFxFrame.ship=ship;engineFxFrame.shipGlow=shipGlow;
    engineFxFrame.sectorColor=COLOR[zoneWave.playerStage].color;
    engineFxFrame.motionWeight=cinematicState;
    engineFxFrame.velocity=velocityState;
    engineFxFrame.presence=velocityPresence;
    premiumFX.frame(engineFxFrame);
   }
   // Physical WORLD history is sampled after the final ship scale and pose.
   // This wake lives in the scene, not parented to the moving/turning hull.
   if(perfSettings.preset!=="no-wake-sparks")livingWake?.frame(presentationDt,{
    playing:uiState.mode==="playing",
    camera,speed:flight.currentSpeed,
    steering:view.steering,yawRate:view.yawRate,
    gripIntensity:flight.gripIntensity,
    boostMultiplier:Math.max(flight.boostMultiplier,flight.landingBoostMultiplier),
    grounded:view.grounded
   });
   // Genuine physical rail contact ONLY. Ballistic sparks are independent
   // of the ship matrix and remain in world space after a scrape ends.
   const sparkSide=flight.railContacting?flight.lastRailSide:0;
   if(perfSettings.preset!=="no-wake-sparks")railSparks?.frame(presentationDt,{
    playing:uiState.mode==="playing",camera,
    railContact:sparkSide&&view.grounded?
      railContactPoint(view.s,sparkSide):null,
    contacting:flight.railContacting,side:sparkSide,
    grounded:view.grounded,speed:flight.currentSpeed,
    scrubIntensity:flight.railScrubIntensity,
    contactSerial:flight.railContactStarts
   });
   // Actual interpolated craft roll and simulated flight speed, not generic
   // looping animation: feedback stays in phase with physics and camera.
   reactiveHud.update(uiState.mode==="playing"?dt:0,{
    shield:flight.shield,
    boostMultiplier:flight.boostMultiplier,
    speedRatio:flight.currentSpeed/22,
    zoneStage:zoneWave.playerStage
   });
 }
 // 0.29.4: follow the actual projected craft; legacy releases retain P3.
 if(velocityExperience&&ship&&camera){camera.updateMatrixWorld(true);ship.getWorldPosition(blurCraftProjection).project(camera);}
 velocityCinematography?.update?.({
  dt,craftX:blurCraftProjection.x*.5+.5,craftY:blurCraftProjection.y*.5+.5,craftZ:blurCraftProjection.z,
  playing:uiState.mode==="playing",
  speedMultiplier:velocityPresentationRatio(flight?.currentSpeed??0),
  boostMultiplier:Math.max(flight?.boostMultiplier??1,
   flight?.landingBoostMultiplier??1)
 });
 // 0.22.0 P4 visual-only grade combines existing materials and speed.
 unifiedCinematicGrade?.update?.({
  playing:uiState.mode==="playing",
  speedMultiplier:velocityPresentationRatio(flight?.currentSpeed??0),
  boostMultiplier:Math.max(flight?.boostMultiplier??1,
   flight?.landingBoostMultiplier??1)
 });
 // World-anchored stellar glow follows camera position, never camera heading.
 cinematicLighting?.frame();
 signatureEnvironment?.frame?.(camera);
 // One renderer.info reset PER frame, preserving the sum of composer passes.
 const presentationMs=Math.max(0,performance.now()-presentationBegin-physicsMs-hudMs);
 renderer.info?.reset();
 gpuClock?.begin();
 const renderBegin=performance.now();
 try{
  const playing=uiState.mode==='playing';
  trackVisibility?.begin(camera,smartPerformance.sections&&playing,advancedGpu?.occlusion===true);
  if(advancedGpu){
   camera.updateMatrixWorld(true);
   detailLod.begin(camera,playing&&advancedGpu.detailLod);
   spaceBackdrop.setVisible(!playing||advancedGpu.exterior);
   lastAdvancedGpuFrame={bloom:neonPipeline.bloomResolution(),detail:detailLod.stats(),exterior:spaceBackdrop.visibilityStats()};
  }
  if(neonPipeline)neonPipeline.render(dt);
  else renderer.render(scene,camera);
 }finally{detailLod?.end();if(advancedGpu)spaceBackdrop.setVisible(true);trackVisibility?.end();gpuClock?.end()}
 if(startupMarks.firstFrame===undefined)markStartup("firstFrame");
 if(resourceSmoke)resourceFrame++;
 const renderCpuMs=performance.now()-renderBegin;
 if(uiState.mode==="playing"&&renderer.info){
   const work=renderer.info.render;
   renderSamples++;
   renderCallTotal+=work.calls;renderCallPeak=Math.max(renderCallPeak,work.calls);
   triangleTotal+=work.triangles;
   observeFrame(frameMonitor,rawDt,renderCpuMs);
   recordPerfFrame(frameProfiler,{frameMs:rawDt*1000,physicsMs,hudMs,presentationMs,
    renderCpuMs,steps:physicsSteps,drawCalls:work.calls,triangles:work.triangles,
    droppedSimulationMs:raceSimulation.clock.droppedSeconds*1000});
   endurance?.sample(frameProfiler,readEnduranceSnapshot);
   if(perfPanel&&now-lastPerfPanelUpdate>=1000){
    lastPerfPanelUpdate=now;
    const s=perfSummary(frameProfiler),m=s.breakdown,g=gpuClock.summary();
    perfPanel.textContent="SKYSHIFT PERF / "+perfSettings.preset+
     "\nFPS "+(s.observedFps??0).toFixed(1)+" · frame p95 "+(m.frameMs.p95??0).toFixed(1)+"ms"+
     "\nPhysics "+(m.physicsMs.p95??0).toFixed(2)+" · UI "+(m.hudMs.p95??0).toFixed(2)+
     "\nVisual "+(m.presentationMs.p95??0).toFixed(2)+" · Render CPU "+(m.renderCpuMs.p95??0).toFixed(2)+
     "\nGPU p95 "+(g.available?(g.p95Ms===null?"sampling":g.p95Ms+"ms"):"unavailable")+
     " · spikes "+s.spikesOver33ms;
   }
   // The existing hysteretic frame-pacing director chooses the level.
   // Our new device-specific cap makes LOW-MEMORY tiers actually work;
   // previously 2.0/1.75/1.5 never reduced a 1.35x Samsung buffer.
   const tierChanged=perfSettings.fixedQuality?null:nextAdaptiveRatio(
     adaptiveQuality,rawDt*1000,now,NEON_TUNING.maxPixelRatio
   );
   if(tierChanged!==null&&neonPipeline){
     const targetDpr=dprForAdaptiveLevel(claritySettings,adaptiveQuality.level);
     neonPipeline.setInternalPixelRatio(targetDpr,innerWidth,innerHeight);
     velocityCinematography?.setQualityLevel?.(adaptiveQuality.level);
     velocityCinematography?.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);
     unifiedCinematicGrade?.setQualityLevel?.(adaptiveQuality.level);
     unifiedCinematicGrade?.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);
     event("adaptive_render_resolution",{ratio:+targetDpr.toFixed(2),
       antiAliasing:CLARITY.antiAliasing,level:adaptiveQuality.level});
   }
 }
}
function readEnduranceSnapshot(){
 const p=perfSummary(frameProfiler),gpu=gpuClock?.summary()??{available:false};
 return {raceSeconds:flight.elapsed,lap:flight.lap,distanceMeters:Math.round(flight.s),
  rollingFrames:p.rollingFrames,frameMs:p.breakdown.frameMs,physicsMs:p.breakdown.physicsMs,hudMs:p.breakdown.hudMs,
  renderCpuMs:p.breakdown.renderCpuMs,presentationMs:p.breakdown.presentationMs,gpu,
  spikesOver33ms:p.spikesOver33ms,droppedSimulationMs:p.droppedSimulationMs,drawCalls:p.breakdown.drawCalls,triangles:p.breakdown.triangles,
  viewportCss:{width:innerWidth,height:innerHeight},canvas:{width:UI.canvas.width,height:UI.canvas.height},
  deviceDpr:devicePixelRatio||1,internalDpr:neonPipeline?.internalPixelRatio??null,
  jsHeapMB:performance.memory?.usedJSHeapSize?Math.round(performance.memory.usedJSHeapSize/1048576):null,
  rendererMemory:renderer?{...renderer.info.memory}:null,
  ...(smartPerformance?{settings:{...smartPerformance},visibility:trackVisibility?.stats(),pacing:presentationGate.stats()}: {}),
  ...(advancedGpu?{advancedGpu:{...advancedGpu,frame:lastAdvancedGpuFrame}}:{}),
  ...(velocityExperience?{velocityExperience:velocityExperienceAudit()}: {})};
}
function exportAudit(){
 if(endurance&&frameProfiler.total>0)endurance.sample(frameProfiler,readEnduranceSnapshot,true);
 const timing=monitorSummary(frameMonitor);
 const worstMs=frameMonitor.allFrameTimes.length?
    Math.max(...frameMonitor.allFrameTimes):null;
 const data={
   game:"SKYSHIFT",version:VAULT_COMPACT_ACTIVE?VAULT_JUMP_VERSION:SKYSHIFT_BUILD_VERSION,trial:TRIAL.id,exportedAt:new Date().toISOString(),
   ...(endurance?{enduranceAudit:endurance.report()}:{}),
   fullscreen:{...fullscreenController?.audit(),bootHistory:window.__skyshiftBoot?.fullscreenHistory??[]},
   ...(velocityExperience?{velocityExperience:velocityExperienceAudit()}:{}),
   ...(advancedGpu?{advancedGpu:{...advancedGpu,frame:lastAdvancedGpuFrame,originalBloomScale:neonPipeline.originalBloomResolutionScale}}:{}),
   ...(smartPerformance?{smartPerformance:{...smartPerformance,physicsHz:120,visibility:trackVisibility?.stats(),pacing:presentationGate.stats(),
    meanTrianglesPerRenderedFrame:renderSamples?triangleTotal/renderSamples:null,
    trianglesPerActiveSecond:frameMonitor.elapsedSeconds?triangleTotal/frameMonitor.elapsedSeconds:null}}:{}),
   timeTrial:{...ghostAudit(timeTrialState),visual:ghostVisual?.stats()??null},
    performanceAudit:{...perfSummary(frameProfiler),preset:perfSettings,
     gpu:gpuClock?.summary()??{available:false,reason:"uninitialized"},
     rendererDpr:renderer.getPixelRatio(),internalDpr:neonPipeline?.internalPixelRatio,
     bloomEnabled:neonPipeline?.bloom?.enabled,
     smaaEnabled:neonPipeline?.smaa?.enabled,
     bloomResolutionScale:neonPipeline?.bloomResolutionScale,
     deviceMemoryGB:navigator.deviceMemory??null,
     devicePixelRatio:devicePixelRatio||1},
   visual:{pipeline:"HDR UnrealBloom",tier:"Tunnel Megastructure",buildVersion:SKYSHIFT_BUILD_VERSION,
     renderDpr:renderer.getPixelRatio(),
     internalHdrPixelRatio:neonPipeline?.internalPixelRatio,
     imageClarity:clarityAudit(claritySettings,neonPipeline),
     reactiveHud:reactiveHud.stats(),
     adaptiveQualityChanges:adaptiveQuality.changes,
     unifiedFlightMotion:unifiedFlightAudit(motionRig),
     smartVisualFidelity:{...fidelityAudit(fidelityDirector),
      shaderVariant:premiumSurface?.fidelityShaderVariant,
      modeSelection:fidelityProfile.modeSelection,
      shaderChangesOnLowMemory:fidelityProfile.lowMemory&&fidelityProfile.premium,
      premiumDefaultOnLowMemory:fidelityProfile.defaultPremiumOnLowMemory,
      userRequestedOff:fidelityProfile.userRequestedOff,
      adaptiveResolutionEnabled:!perfSettings.fixedQuality},
     racingExperience:{...RACING_0121,...racingExperienceAudit(racingExperience),
      currentRhythm:raceRhythmAt(flight.s)},
     sectorLandmarks:sectorLandmarks?.stats()??null,
     renderOptimization:{...OPT_0111,bloom:neonPipeline?.bloomResolution(),
      hud:hudBudget.stats(),domWrites:domWrites.stats(),
      profilerUsesTypedArray:true,engineFxReusesContext:true,
      railSparkStatsPreservedAtFinish:Boolean(completedSparkStats)},
     roadMeshType:"Single indexed top deck with shared vertex normals",
     roadLongitudinalStepMeters:MESH_SPEC.sampleStep,
     guardrails:{heightMeters:AERO_BARRIER.height,
       design:"Elevated continuous armor and bright directional chevrons",
       elevatedStraightHeightMeters:AERO_BARRIER.height,
       elevatedBendHeightMeters:AERO_BARRIER.bendHeightMeters,
       physicalColliderUnchanged:AERO_BARRIER.colliderUnchanged,
       physicsColliderHeightMeters:AERO_BARRIER.physicalColliderHeightMeters,
       arrowSpacingMeters:AERO_BARRIER.curveArrowPitchMeters,
       arrowCurvatureThreshold:AERO_BARRIER.arrowCurvatureThreshold,
       removedRoadsidePillars:true,
       roadsidePillarInstances:0,
       innerSweepMeters:AERO_BARRIER.innerSweepMeters,
       lightWidthMeters:identitySurface.accentWidthMeters,
       panelSeams:identitySurface.panelSeams,
       paletteReactive:true,
       railTriangles:identitySurface.railTriangles,
       surfaceTriangles:identitySurface.paintTriangles,
       batchCount:identitySurface.drawBatches,
       chevrons:identitySurface.chevrons,
       chevronAccentOnWave:true,
       shoulderMarks:identitySurface.shoulderMarks,
       accentAnchors:identitySurface.accentAnchors},
     worldArtRebirth:{enabled:rebirthEnabled,
      ...(stationWorld?.stats?.()??{active:false,status:"classic"}),
      artAsset:(neonInteriorEnabled?NEON_INTERIOR_0212:
       tunnelMegaEnabled?TUNNEL_MEGA_0211:
       cinematicHeroEnabled?HERO_0210:
       architecturalRebirthEnabled?WORLD_ART_0205:
       sculptedNeonEnabled?WORLD_ART_02041:
       premiumNeonEnabled?WORLD_ART_0204:
       graphiteGradeEnabled?WORLD_ART_0203:
       ribbonWindowsEnabled?WORLD_ART_02021:
       observationWindowsEnabled?WORLD_ART_0202:
       enclosedStationEnabled?WORLD_ART_0201:WORLD_ART_0200).assetPath,
      enclosedStationEnabled,observationWindowsEnabled,ribbonWindowsEnabled,
      graphiteGradeEnabled,premiumNeonEnabled,sculptedNeonEnabled,
      architecturalRebirthEnabled,cinematicHeroEnabled,cinematicGradeEnabled,
      tunnelMegaEnabled,neonInteriorEnabled,tunnelSpectrumEnabled,
      exteriorSealEnabled,exteriorSealProfile:exteriorSealEnabled?EXTERIOR_SEAL_02122:null,
       structuralTunnelEnabled,structuralProfile:structuralTunnelEnabled?STRUCTURAL_TUNNEL_0213:null,
       compareBeforeStructure:"?tunnelStructure=classic",
       integratedNeonFlowEnabled,
       integratedNeonFlowProfile:integratedNeonFlowEnabled?INTEGRATED_NEON_FLOW_0214:null,
       compareBeforeIntegratedFlow:"?tunnelFlow=classic",
      whiteCoreEnabled,whiteCoreProfile:whiteCoreEnabled?WHITE_CORE_02123:null,
      roadSolarEnabled,roadSolarProfile:roadSolarEnabled?ROAD_SOLAR_SPILL_02126:null,
      roadSolarAudit:roadSolarSpill?.stats()??null,
      compareBeforeRoadSolar:"?roadSolar=classic",
      premiumRoadEnabled,premiumRoadProfile:premiumRoadEnabled?PREMIUM_ROAD_SURFACE_0215:null,
      premiumRoadAudit:premiumRoadSurface?.stats()??null,
      compareBeforePremiumRoad:"?premiumRoad=classic",
      cinematicRoadEnabled,
      cinematicRoadProfile:cinematicRoadEnabled?CINEMATIC_ROAD_0242:null,
      cinematicRoadAudit:cinematicRoadReflections?.stats()??null,
      compareBeforeCinematicRoad:"?cinematicRoad=classic",
      cinematicMotionEnabled,cinematicMotionProfile:cinematicMotionEnabled?CINEMATIC_ENERGY_0216:null,
      cinematicMotionAudit:cinematicMotionEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeCinematicMotion:"?cinematicMotion=classic",
      premiumMaterialRebirthEnabled,
      premiumMaterialRebirthProfile:premiumMaterialRebirthEnabled?MATERIAL_REBIRTH_0220:null,
      premiumMaterialAudit:premiumMaterialRebirthEnabled?stationWorld?.stats?.()??null:null,
      compareBeforePremiumMaterial:"?rebirthMaterial=classic",
      cinematicNeonEnabled,
      cinematicNeonProfile:cinematicNeonEnabled?CINEMATIC_NEON_0220_P2:null,
      cinematicNeonAudit:cinematicNeonEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeCinematicNeon:"?cinematicNeon=classic",
      physicalMaterialEnabled,
      physicalMaterialProfile:physicalMaterialEnabled?PHYSICAL_MATERIAL_0230:null,
      physicalMaterialAudit:physicalMaterialEnabled?stationWorld?.stats?.()??null:null,
      compareBeforePhysicalMaterial:"?physicalMaterial=classic",
      trueMaterialDepthEnabled,
      trueMaterialDepthProfile:trueMaterialDepthEnabled?TRUE_MATERIAL_0231:null,
      trueMaterialDepthAudit:trueMaterialDepthEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeTrueDepth:"?trueDepth=classic",
      lightArchitectureEnabled,
      lightArchitectureProfile:lightArchitectureEnabled?LIGHT_ARCHITECTURE_0232:null,
      lightArchitectureAudit:lightArchitectureEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeLightArchitecture:"?lightArchitecture=classic",
      unifiedTunnelEnabled,
      unifiedTunnelProfile:unifiedTunnelEnabled?UNIFIED_TUNNEL_0233:null,
      unifiedTunnelAudit:unifiedTunnelEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeUnifiedTunnel:"?unifiedTunnel=classic",
      architecturalNeonEnabled,
      architecturalNeonProfile:architecturalNeonEnabled?ARCHITECTURAL_NEON_0240:null,
      architecturalNeonAudit:architecturalNeonEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeArchitecturalNeon:"?architecturalNeon=classic",
      surfaceCraftEnabled,
      surfaceCraftProfile:surfaceCraftEnabled?PREMIUM_SURFACE_0241:null,
      surfaceCraftAudit:surfaceCraftEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeSurfaceCraft:"?surfaceCraft=classic",
      darkMetalEnabled,
      darkMetalProfile:darkMetalEnabled?DARK_METALLIC_FOUNDATION_0250:null,
      darkMetalAudit:darkMetalEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeDarkMetal:"?darkMetal=classic",
      microMetalEnabled,
      microMetalProfile:microMetalEnabled?MICRO_SURFACE_METAL_0251:null,
      microMetalAudit:microMetalEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeMicroMetal:"?microMetal=classic",
      dualToneEnabled,
      unifiedTunnelLightingEnabled,
      unifiedTunnelLightingProfile:unifiedTunnelLightingEnabled?
       UNIFIED_TUNNEL_LIGHTING_1:null,
      unifiedTunnelLightingAudit:tunnelBlackout?.audit?.()??null,
      unifiedTunnelLightingComparison:"?unifiedLighting=classic",
      dualToneProfile:dualToneEnabled?DUAL_TONE_LIGHTING_0260:null,
      dualToneAudit:dualToneEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeDualTone:"?dualTone=classic",
      trueMetalEnabled,
      localReflectionsEnabled,
      localReflectionsProfile:localReflectionsEnabled?LOCAL_REFLECTIONS_0261:null,
      localReflectionsAudit:localReflectionsEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeLocalReflections:"?localReflections=classic",
       fullTunnelFoundationEnabled,
       fullTunnelProfile:isVault()?FULL_TUNNEL_0270:null,
       vaultLightSealProfile:isVault()?VAULT_LIGHT_SEAL_0270:null,
       fullTunnelAudit:fullTunnelCircuit?.stats?.()??null,
       fullTunnelComparison:"?fullTunnel=classic",
       vaultMaterialParityEnabled,
       vaultMaterialProfile:isVault()?VAULT_MATERIAL_PARITY_0271:null,
       vaultMaterialAudit:vaultMaterialParity?.stats?.()??null,
       vaultMaterialComparison:"?vaultMaterial=classic",
       vaultArchitectureEnabled,
       vaultArchitectureProfile:isVault()?VAULT_ARCHITECTURE_0272:null,
       vaultArchitectureAudit:vaultArchitecture?.stats?.()??null,
       vaultArchitectureComparison:"?vaultArchitecture=classic",
       vaultFullLightingEnabled,
       vaultFullLightingProfile:isVault()?VAULT_LIGHTING_0273:null,
       vaultFullLightingAudit:vaultFullLighting?.stats?.()??null,
       vaultFullLightingComparison:"?vaultLighting=classic",
        vaultPremiumFinishEnabled,
        vaultPremiumFinishProfile:isVault()?VAULT_PREMIUM_FINISH_0274:null,
        vaultPremiumFinishAudit:vaultFullLighting?.stats?.().premiumFinish??null,
        vaultPremiumFinishComparison:"?vaultFinish=classic",
      railWallResponseEnabled,
      railWallResponseProfile:railWallResponseEnabled?TRUE_RAIL_WALL_0265:null,
      railWallResponseAudit:trueRailWall?.stats?.()??null,
      compareBeforeRailWallResponse:"?railWallResponse=classic",
      trueMetalProfile:trueMetalEnabled?TRUE_METAL_0260_P2:null,
      trueMetalAudit:trueMetalEnabled?stationWorld?.stats?.()??null:null,
      compareBeforeTrueMetal:"?trueMetal=classic",
      velocityCinemaRequested:velocityCinemaEnabled,
      velocityCinemaProfile:velocityCinemaEnabled?VELOCITY_CINEMA_0220_P3:null,
      velocityCinemaAudit:velocityCinematography?.stats?.()??null,
      compareBeforeVelocityCinema:"?velocityCinema=classic",
      unifiedGradeRequested:unifiedGradeEnabled,
      unifiedGradeProfile:unifiedGradeEnabled?UNIFIED_GRADE_0220_P4:null,
      unifiedGradeAudit:unifiedCinematicGrade?.stats?.()??null,
      compareBeforeUnifiedGrade:"?unifiedGrade=classic",
      shipWhiteSpillEnabled,shipWhiteSpillAudit:shipWhiteSpill?.stats()??null,
      compareBeforeShipWhite:"?shipWhite=classic",
      railBodyContainmentEnabled,
      railBodyContainment:identitySurface?.getRailBodyContainment?.()??null,
      compareBeforeRailBody:"?railBody=classic",
      whiteCoreAudit:whiteCoreContainment?.stats()??null,
      compareBeforeWhiteCore:"?whiteCore=classic",
      compareBeforeExteriorSeal:"?exteriorSeal=classic",
      railTunnelGlareScale:identitySurface?.getTunnelGlareScale?.()??1,
      spectrumProfile:tunnelSpectrumEnabled?TUNNEL_SPECTRUM_02121:null,
      compareBeforeSpectrum:"?tunnelSpectrum=classic",
      compareBeforeNeonInterior:"?interiorLight=classic",
      compareBeforeTunnel:"?tunnelMega=classic",
      materialGradeProfile:cinematicGradeEnabled?CINEMATIC_GRADE_0210B:null,
      compareBeforeCinematicGrade:"?cinematicGrade=classic",
      compareBeforeCinematicHero:"?cinematicHero=classic",
      roadWidthUnchanged:true,roadMaterialStillOriginal:true,
      extraReflectionPasses:0,geometryOnlyRoadGlints:true,
      originalRoomLightingUnchanged:true,
      originalRaceTrackMaterialUnchanged:true,
      retainedGraphiteMaterials0203:true,
      premiumIntegratedLightingOnly:true,
      compareBeforeArchitecture:"?architecturePass=classic",
      compareBeforeSculptedNeon:"?neonPolish=classic",
      compareBeforeNeon:"?neon=classic",
      compareBeforeMaterial:"?materialGrade=classic",
      compareBeforeCleanup:"?windowCleanup=classic",
      compareBeforeWindows:"?windows=classic",
      comparisonWithOpenStation:"?stationStyle=classic",
      physicsUnchanged:true,railAndCameraUnchanged:true,
      oldRandomArchitectureHidden:rebirthEnabled,
      comparison:"?worldArt=classic"},
     architecturalHero:{enabled:architectureEnabled,
      ...(orbitalHero?.stats?.()??{active:false}),
      comparison:"?architecture=classic",
      pass1MaterialsReverted:true,physicsUnchanged:true,
      globalLightingUnchanged:true},
     cinematicWorldRebuild:{enabled:worldEnabled,
      ...(cinematicWorld?.stats?.()??{active:false,beams:0}),
      physicsUnchanged:true,cameraUnchanged:true,
      classicComparison:"?world=classic"},
     signatureArchitecture:{enabled:envEnabled,
      ...(signatureEnvironment?.stats?.()??{active:false,beams:0}),
      originalBannersPreserved:true,unchangedSteering:true,
      inactiveOnAurora:isAurora(),classicComparison:"?env=classic"},
     cinematicAtmosphere:{enabled:CINEMATIC_ENABLED,
      ...(cinematicLighting?.stats()??{mode:"classic"}),
      unchangedFlightPhysics:true,classicComparison:"?lighting=classic"},
     shadowTunnel:{...shadowTunnel?.getStats(),
      blackout:{...TUNNEL_BLACKOUT,...tunnelBlackout?.audit()},
      entryCount:tunnelEntries,exitCount:tunnelExits,
      secondsInside:+tunnelSeconds.toFixed(2),
      peakAtmosphereDarkness:+tunnelMaxIntensity.toFixed(3),
      roadGlowPreserved:true,railGlowPreserved:true,
      whiteCoreWaveVisible:true,threeLapCircuitUnchanged:true},
     sharedDeckNormals:true,
     fleet:{...fleetStatus(fleetProgress),activeModel:activeShipId,
        previewModel:previewShipId,tail:activeCraft?.tailStats?.()??null,
        surfacePolish:activeCraft?.polishStats?.()??null,
        reactiveWingFlaps:reactiveWingFlaps?.stats?.()??null,
        flightPhysicsUnchanged:true},
      shipIdentity:{name:activeCraft?.spec?.name??MANTA_IDENTITY.name,
        hardEdgeProfile:MANTA_IDENTITY.hardEdgeProfile,
        twinThrustSockets:ENGINE_SOCKETS.map(s=>[s.x,s.y,s.z]),
        signatureSilhouette:MANTA_IDENTITY.type,
        wingLobes:MANTA_IDENTITY.wingLobes,
        aftThrusters:MANTA_IDENTITY.thrusters,
        openTrailingCenter:MANTA_IDENTITY.openTrailingCenter,
        visualBeamMeters:MANTA_IDENTITY.visualBeamMeters,
        extraDynamicLights:engineLights.length-1,
        geometryBudgetTriangles:activeCraft?.spec?.maxGeometryTriangles??MANTA_IDENTITY.maxGeometryTriangles,
        visualVersion:activeCraft?.spec?.version??MANTA_IDENTITY.version,
        unchangedHandling:!MANTA_IDENTITY.changesFlightPhysics},
      livingWake:{...LIVING_WAKE,...livingWake?.stats()},
      reactiveWingFlaps:{...REACTIVE_FLAPS,...reactiveWingFlaps?.stats()},
      shipArt:shipArtController.audit(),
      stingrayPresentation:STINGRAY_PRESENTATION_01347,
      heroShowroom:hangarHeroRig?.stats(),
      railScrapeSparks:{...RAIL_SPARKS,...(completedSparkStats??railSparks?.stats())},
      velocityPresence:{...velocityPresenceAudit(velocityPresence),
        sharedVisualOnly:true,zoneDrivenFlow:true,airborneFeedback:true},
      engineTrails:{emitters:ENGINE_TRAIL_SPEC.emitters,
        geometryAttachedToShip:ENGINE_TRAIL_SPEC.attachedToShip,
        baseLengthMeters:ENGINE_TRAIL_SPEC.baseLengthMeters,
        maxBoostLengthMeters:ENGINE_TRAIL_SPEC.maxBoostLengthMeters,
        ...premiumFX?.stats()},
      trackSpine:{segmented:PREMIUM_TRACK.centerSpineEnabled,
        periodMeters:PREMIUM_TRACK.spinePeriodMeters,
        segmentMeters:PREMIUM_TRACK.spineDashMeters,
        widthMeters:PREMIUM_TRACK.spineWidthMeters,
        contrast:PREMIUM_TRACK.spineContrast,
        emissive:PREMIUM_TRACK.spineEmissive},
      zoneSurface:{version:PREMIUM_TRACK.version,material:PREMIUM_TRACK.material,
        waveDirection:ZONE_WAVE.direction,
        waveLaunchSeconds:[...ZONE_WAVE.triggers],
        waveFrontsMeters:zoneWave.fronts.map(f=>+f.toFixed(2)),
        presentationSinglePass:vaultPolish02899,
        activatedStages:[...zoneWave.activatedStages],
        passedStages:[...zoneWave.passedStages],
        stageTransitionSeconds:[...zoneWave.stageTransitionSeconds],
        paletteNames:ZONE_PALETTES.map(p=>p.name),
        colorWaveVersion:COLOR_WAVE_ACTIVE?"1.0":"classic",
        speedProfile:{...SPEED_PROFILE,cruiseTargets:Array.from({length:9},(_,i)=>speedAt(0,i)),presentationRatio:velocityPresentationRatio(flight.currentSpeed)},
        rolePalettes:COLOR_WAVE_ACTIVE?COLOR_WAVE_PALETTES.map(({name,primary,secondary,highlight})=>({name,primary,secondary,highlight})):null,
        edgeAndFootWave: sharedTunnelRuntime?.colorWaveStats?.()??[],
        waveFeatherMeters:ZONE_WAVE.featherMeters,
        waveCrestMeters:ZONE_WAVE.crestMeters,
        whiteCoreMeters:ZONE_WAVE.whiteCoreMeters,
        whiteBloomMeters:ZONE_WAVE.whiteBloomMeters,
        whiteCoreEnergy:ZONE_WAVE.whiteCoreEnergy,
         whiteBloomEnergy:ZONE_WAVE.whiteBloomEnergy,
        filamentRangeMeters:ZONE_WAVE.filamentRangeMeters,
        lowTierFilamentsDisabled:PREMIUM_TRACK.lowGraphicsFilamentsDisabled,
        afterglowMeters:ZONE_WAVE.afterglowMeters,
        resonanceSeconds:ZONE_WAVE.resonanceSeconds,
        paletteSync:"Road and rail inlays use the same arc-length wave",
        spectralRenderPassesAdded:0,
        railDrawBatchesAdded:0,
       palette:PREMIUM_TRACK.palette,curveFollowingLines:PREMIUM_TRACK.curveFollowingLines,
       integratedBoostPads:PREMIUM_TRACK.boostPads,
       drawBatches:PREMIUM_TRACK.drawBatches,
       floatingDecalBatches:PREMIUM_TRACK.floatingDecalBatches,
       paletteReady:PREMIUM_TRACK.materialOnlyPalette,
       colorAnimation:PREMIUM_TRACK.colorAnimation,
       colors:{base:PREMIUM_TRACK.baseHex,band:PREMIUM_TRACK.sideBandHex,
        guides:PREMIUM_TRACK.guideHex,boost:PREMIUM_TRACK.boostHex}},
     surfaceAccents:identitySurface.plan.length,decorativePlates:0,
     worldFormations:0,worldLandmarks:0,
     spaceStars:spaceBackdrop.stars,spaceNebulae:spaceBackdrop.nebulae,
     rendererDrawCallsAverage:renderSamples?Math.round(renderCallTotal/renderSamples):null,
     rendererDrawCallsPeak:renderSamples?renderCallPeak:null,
     rendererTrianglesAverage:renderSamples?Math.round(triangleTotal/renderSamples):null,
     banking:"3D elevation, physical magnetic 70° wall and full 360° inverted corkscrew",
     flightMotion:"Real 3D hover, ballistic leap, wall grip and track-local 360° corkscrew steering",
     flightTuning:{...flightTuning},cameraTuning:{...cinematicTuning},
     kineticCamera:{...KINETIC_CAMERA,mode:CAMERA_MODE,
      gain:CAMERA_GAIN,...kineticCameraAudit(kineticCamera),
      maxObservedFovDegrees:+chaseCameraController.maxKineticFov.toFixed(2),
      comparesSamePhysics:true,unchangedThreeDimensionalTrack:true,
      realFlightSteeringOnly:true},
      signatureFlight:{...SIGNATURE_FLIGHT,...signatureFlightAudit(signatureFlight),
       underlyingHandlingVersion:STEERING_AUTHORITY.version,
       cameraMode:CAMERA_MODE,shipModel:activeCraft?.spec?.name??MANTA_IDENTITY.name},
     maxCameraPreviewDegrees:+cinematicState.maxPreviewDegrees.toFixed(2),
     maxCosmeticNoseYawDegrees:+cinematicState.maxNoseDegrees.toFixed(2),
     maxEngineResponse:+cinematicState.maxEngineEnergy.toFixed(3),
     maxCameraSideOffsetMeters:+cinematicState.maxCameraLateralMeters.toFixed(2),
      steeringAuthority:{...STEERING_AUTHORITY,
       handlingProfile:"GRIP-FIRST · WIDE ARC / POWER CARVE",
       fullGripFactor:STEERING_AUTHORITY.fullGripFactor,
       normalYawAtStart:STEERING_AUTHORITY.normalSlowFactor,
       normalYawAtLastZone:STEERING_AUTHORITY.normalFastFactor,
       gripUsagePercentOfRun:+(flight.elapsed>0?
        100*flight.gripActiveSeconds/flight.elapsed:0).toFixed(1),
       atStartSpeed:steeringBalanceAt(TRIAL.startSpeed),
       atLastZone:steeringBalanceAt(TRIAL.endSpeed),
       minNormalFactorObserved:+flight.minNormalYawFactor.toFixed(3),
       peakActualYawFactorObserved:+flight.maxActualYawFactor.toFixed(3),
       peakGripRelativeGainObserved:+flight.peakGripRelativeGain.toFixed(3),
       normalSteeringSeconds:+flight.normalSteeringSeconds.toFixed(2),
       referenceMaxYawDegreesPerSecond:+(TRIAL.maxYawRate*180/Math.PI).toFixed(1),
       gripMaxYawDegreesPerSecond:+(TRIAL.maxYawRate*
         steeringBalanceAt(TRIAL.startSpeed).grip*180/Math.PI).toFixed(1)},
      precisionGrip:{version:GRIP_SPEC.version,
        previousYawReferenceFactor:GRIP_SPEC.yawMultiplier,
        actualFullGripFactorAtSpeed:steeringBalanceAt(flight.currentSpeed).grip,
        bonusFraction:STEERING_AUTHORITY.gripBonusFraction,
       maxSpeedPenaltyPercent:GRIP_SPEC.maxSpeedPenalty*100,
       sideThrusters:sideThrusters?.stats(),
       extraDynamicLights:SIDE_THRUSTER_SPEC.newLights,
       newParticles:SIDE_THRUSTER_SPEC.newParticles},
      velocityLanguage:{boostActivations:velocityState.activations,
       peakRoadRailFlow:+velocityState.peakWorldFlow.toFixed(3),
       peakEngineFlow:+velocityState.peakEngineFlow.toFixed(3),
       peakHullRecoilMeters:+velocityState.peakRecoilMeters.toFixed(3),
       peakHullPitchDegrees:+velocityState.peakPitchDegrees.toFixed(3),
       flowPhaseMeters:+velocityState.flowPhaseMeters.toFixed(1),
       extraDrawCalls:VELOCITY_SPEC.extraDrawCalls,
       extraDynamicLights:VELOCITY_SPEC.extraDynamicLights,
       velocityReactiveRailAndRoad:true},
      cameraBoostSpring:{activations:boostSpring.activations,
       maxMeasuredLagMeters:+boostSpring.maxLagMeters.toFixed(2),
       springFrequencyPerSecond:BOOST_SPRING.frequencyPerSecond,
       lagEnvelopeMeters:BOOST_SPRING.maxVisualLagMeters,
       anticipatoryFraction:BOOST_SPRING.anticipatoryFraction,
       maxMeasuredFovBonusDegrees:+boostSpring.peakFovBonusDegrees.toFixed(2),
       targetFovBonusDegrees:BOOST_SPRING.extraFovDegrees,
       maxFovDegrees:BOOST_SPRING.maxFovDegrees},
     extraDrawCallsFromCameraAndEngine:0,
     maxVisualBankDegrees:+Math.max(motionState.maxVisualBankDegrees,flight.magneticPeakDegrees,flight.corkscrewPeakDegrees).toFixed(1),
     maxVisualPitchDegrees:+motionState.maxVisualPitchDegrees.toFixed(1),
     maxHoverMeters:+motionState.maxHoverMeters.toFixed(3),
     maxBankDegrees:Math.abs(CORKSCREW.peakUnwrappedDegrees),
     exposure:LUMINANCE.exposure,fogDensity:LUMINANCE.fogDensity,
     bloomStrength:NEON_TUNING.bloomStrength,
     bloomThreshold:NEON_TUNING.bloomThreshold},

   run:createRunAudit({flight,railFeedback,gripCueDisplays:raceHud.gripCueDisplays,gripCueSeconds:raceHud.gripCueSeconds,PROJECTION_083,RACING_FEEL,racingExperienceAudit,racingExperience,ghostAudit,timeTrialState,CHALLENGE_RULES_0140,challengeSummary,challengeProgress,currentChallenge,lastChallengeGrading,GRIP_APEX,CORKSCREW,MAGNETIC_WALL,TRIAL,BOOST_PADS,RISK_REWARD_0160,RHYTHM_GATES_0160,speedAt,elevationAudit,AIR_TRICKS,SKYLINE_LEAP,GAPS,circuitPlanSummary,CIRCUIT,STEERING_AUTHORITY,COURSE_SEGMENTS,timing,worstMs,raceSimulation}),
   events:raceTelemetry.events
 };
 downloadRaceAudit(data,perfSettings.preset,{Blob,URL,document,setTimeout});
}
function syncSmartSettings(){
 const root=$('smart-performance-settings');root.classList.remove('hidden');UI.settings.classList.add('smart-settings');
 $('frame-cap').value=String(smartPerformance.fps);$('graphics-quality').value=smartPerformance.quality;
 $('extended-diagnostics').checked=smartPerformance.diagnostics;$('section-culling').checked=smartPerformance.sections;
 if(advancedGpu){$('advanced-gpu-settings').classList.remove('hidden');$('bloom-resolution').value=advancedGpu.bloom;$('exterior-backdrop').checked=advancedGpu.exterior;$('distant-detail-lod').checked=advancedGpu.detailLod;$('tunnel-occlusion').checked=advancedGpu.occlusion;}
 if(velocityExperience){$('velocity-experience-settings').classList.remove('hidden');for(const option of $('motion-blur').options){if(option.value==='ultra'||option.value==='extreme'){option.hidden=!VAULT_EXTREME_BLUR_ACTIVE;option.disabled=!VAULT_EXTREME_BLUR_ACTIVE;}}$('motion-blur').value=velocityExperience.motionBlur;$('adaptive-velocity-camera').checked=velocityExperience.adaptiveCamera;$('motion-blur-hint').textContent='Depth-based camera motion blur. Zero at launch speed, progressively stronger at speed. Off bypasses the blur pass.';}
}
function installControls(){
 if(smartPerformance){
  syncSmartSettings();
  const apply=()=>{
   if(uiState.mode!=='settings')return;
   smartPerformance.fps=Number($('frame-cap').value);
   smartPerformance.quality=$('graphics-quality').value;
   smartPerformance.diagnostics=$('extended-diagnostics').checked;smartPerformance.sections=$('section-culling').checked;
   savePerformance(fleetStorage(),smartPerformance);presentationGate.reset();
   perfSettings.fixedQuality=smartPerformance.quality==='fixed';
   if(renderer){gpuClock?.reset();gpuClock=createGpuTimer(renderer.getContext(),smartPerformance.diagnostics||perfSettings.enabled);}
   adaptiveQuality=createAdaptiveQuality();
   if(neonPipeline){neonPipeline.setInternalPixelRatio(claritySettings.renderDpr,innerWidth,innerHeight);
    velocityCinematography?.setQualityLevel?.(0);velocityCinematography?.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);
    unifiedCinematicGrade?.setQualityLevel?.(0);unifiedCinematicGrade?.resize?.(innerWidth,innerHeight,neonPipeline.internalPixelRatio);}
  };
  for(const id of ['frame-cap','graphics-quality','extended-diagnostics','section-culling'])runtimeLifetime.listenActive($(id),'change',apply);
  if(advancedGpu){const applyGpu=()=>{
   if(uiState.mode!=='settings')return;
   advancedGpu.bloom=$('bloom-resolution').value;advancedGpu.exterior=$('exterior-backdrop').checked;
   advancedGpu.detailLod=$('distant-detail-lod').checked;advancedGpu.occlusion=$('tunnel-occlusion').checked;
   saveAdvancedGpu(fleetStorage(),advancedGpu);applyAdvancedBloom();
  };for(const id of ['bloom-resolution','exterior-backdrop','distant-detail-lod','tunnel-occlusion'])runtimeLifetime.listenActive($(id),'change',applyGpu);}
  if(velocityExperience){const applyVelocity=()=>{
   if(uiState.mode!=='settings')return;
   velocityExperience.motionBlur=$('motion-blur').value;velocityExperience.adaptiveCamera=$('adaptive-velocity-camera').checked;
   saveVelocityExperience(fleetStorage(),velocityExperience,VAULT_EXTREME_BLUR_ACTIVE);velocityCinematography?.setMode?.(velocityExperience.motionBlur);
  };for(const id of ['motion-blur','adaptive-velocity-camera'])runtimeLifetime.listenActive($(id),'change',applyVelocity);}
 }
 runtimeLifetime.listenActive(UI.trackPicker,"change",()=>{
  if(!["menu","ended"].includes(uiState.mode))return;
  const selected=UI.trackPicker.value;
  if(!TRACKS_0160.some(t=>t.id===selected))return;
  const uri=new URL(location.href);
  if(selected==="skyline")uri.searchParams.delete("track");
  else uri.searchParams.set("track",selected);
  uri.searchParams.set("v",selected==="vault"?PRODUCTION_TRACK.version:SKYSHIFT_BUILD_VERSION);
  if(smartPerformance&&selected==="vault")uri.searchParams.set("v",VAULT_JUMP_VERSION);
  location.assign(uri.toString());
 });
 runtimeLifetime.listenActive(UI.challengeButton,"click",openChallenges);
 runtimeLifetime.listenActive(UI.challengeBack,"click",closeChallenges);
 runtimeLifetime.listenActive(UI.challengeEndBack,"click",openChallenges);
 runtimeLifetime.listenActive(UI.challengeList,"click",e=>{
  const button=e.target.closest("[data-challenge-id]");
  if(!button||button.disabled||uiState.mode!=="challenges")return;
  const c=getChallenge(button.dataset.challengeId);
  if(c&&challengeUnlocked(challengeProgress,c.id))
   startImmersiveTrial(c);
 });
 runtimeLifetime.listenActive(UI.hangarBtn,"click",openHangar);
 runtimeLifetime.listenActive(UI.endHangar,"click",openHangar);
 runtimeLifetime.listenActive(UI.hangarBack,"click",closeHangar);
 document.querySelectorAll("[data-fleet-preview]").forEach(button=>
  runtimeLifetime.listenActive(button,"click",()=>previewFleetShip(button.dataset.fleetPreview)));
 document.querySelectorAll("[data-fleet-equip]").forEach(button=>
  runtimeLifetime.listenActive(button,"click",()=>equipFleetShip(button.dataset.fleetEquip)));
 runtimeLifetime.listenActive(UI.start,"click",()=>startImmersiveTrial(null));
 runtimeLifetime.listenActive(UI.pauseGhostToggle,"click",()=>{
  if(uiState.mode!=="paused")return;
  raceSession.toggleGhost();
  ghostVisual?.hide();
  refreshTrialMenu();
 });
 runtimeLifetime.listenActive(UI.pauseMenu,"click",returnToMainMenu);
 runtimeLifetime.listenActive(UI.settingsOpen,"click",openSettings);
 runtimeLifetime.listenActive(UI.settingsBack,"click",closeSettings);
 runtimeLifetime.listenActive(UI.retry,"click",()=>startImmersiveTrial(currentChallenge));
 runtimeLifetime.listenActive(UI.restart,"click",()=>enterPlaying(currentChallenge));
 runtimeLifetime.listenActive(UI.resume,"click",resume);
 runtimeLifetime.listenActive(UI.pauseBtn,"click",pause);
 runtimeLifetime.listenActive(UI.fullscreen,"click",()=>fullscreenController.toggle());
 runtimeLifetime.listenActive(UI.menuFullscreen,"click",()=>fullscreenController.toggle());
 runtimeLifetime.listenActive(UI.fidelityToggle,"click",()=>{
  if(FIDELITY_0121.overridePresets.includes(perfSettings.preset))return;
  const next=!fidelityProfile.premium;
  const saved=saveFidelityChoice(next,fleetStorage());
  const address=new URL(location.href);
  address.searchParams.delete("fidelity");
  // Private-mode storage can be unavailable: keep the OFF choice in URL.
  if(!saved)address.searchParams.set("fidelity",next?"on":"off");
  address.searchParams.set("v",SKYSHIFT_BUILD_VERSION);
  if(smartPerformance)address.searchParams.set("v",VAULT_JUMP_VERSION);
  location.assign(address.toString());
 });
 runtimeLifetime.listenActive(UI.export,"click",exportAudit);
 installRaceInput({UI,uiState,clamp,addEventListener:(...args)=>runtimeLifetime.listenActive(window,...args),
  document,pause,resume,closeSettings,enterPlaying,listen:runtimeLifetime.listenActive});
}
async function initializeGame(){
try{
 // Wire the buttons before costly WebGL scene construction.
 installFullscreen();
 installControls();
 if(isVault()&&["0.29.0","0.29.1","0.29.2","0.29.3","0.29.3.1","0.29.4","0.29.4.1","0.29.4.2","0.29.5","0.29.5.1","0.29.5.2","0.29.6","0.29.7","0.29.8","0.29.8.1"].includes(new URLSearchParams(location.search).get("v"))&&new URLSearchParams(location.search).get("vaultJump")!=="0"&&
  (!VAULT_MEGA_JUMP_ACTIVE||!trueSharedVaultEnabled||!authoritativeDeck028911||GAPS.length!==1))
  throw Error("0.29.0 requested but physical Mega Jump unavailable");
 runtimeLifetime.bind(window,UI.canvas);
 await initScene();
 assertStartupLifetime();
 installFlightTuningPanel({document,location,flightTuning,cinematicTuning});
 resetFlight();
 installRaceQa({window,document,location,performance,ctx:{get flight(){return flight},
  get reactiveHud(){return reactiveHud},
  get sideThrusters(){return sideThrusters},
  get zoneWave(){return zoneWave},
  get previousSector(){return previousSector},set previousSector(v){previousSector=v},
  get waveSmokeHold(){return waveSmokeHold},set waveSmokeHold(v){waveSmokeHold=v},
  get premiumSurface(){return premiumSurface},
  get identitySurface(){return identitySurface},
  get stationWorld(){return stationWorld},
  get sharedTunnelRuntime(){return sharedTunnelRuntime},
  get archRoadReflections(){return archRoadReflections},
  get unifiedCeilingRoad(){return unifiedCeilingRoad},
  get roadSpill02895(){return roadSpill02895},
  get tunnelBlackout(){return tunnelBlackout},
  get worldLights(){return worldLights},
  get engineLights(){return engineLights},
  get bladeTips(){return bladeTips},
  get shipGlow(){return shipGlow},
  get motionState(){return motionState},set motionState(v){motionState=v},
  get cinematicState(){return cinematicState},set cinematicState(v){cinematicState=v},
  get kineticCamera(){return kineticCamera},set kineticCamera(v){kineticCamera=v},
  get tunnelInside(){return tunnelInside},set tunnelInside(v){tunnelInside=v},
  get shadowTunnel(){return shadowTunnel},
  get livingWake(){return livingWake},
  get wakeSmokePath(){return wakeSmokePath},set wakeSmokePath(v){wakeSmokePath=v},
  get reactiveWingFlaps(){return reactiveWingFlaps},
  get railSparks(){return railSparks},
  get whiteCoreContainment(){return whiteCoreContainment},
  get shipWhiteSpill(){return shipWhiteSpill},
  get targetAccent(){return targetAccent},
  get fleetProgress(){return fleetProgress},set fleetProgress(v){fleetProgress=v},
  get world(){return world},
  get ship(){return ship},
  get camera(){return camera},
  get activeShipId(){return activeShipId},
  get previewShipId(){return previewShipId},
  get activeCraft(){return activeCraft},
  get shipArtController(){return shipArtController},
  get hangarHeroRig(){return hangarHeroRig},
  get currentChallenge(){return currentChallenge},
  get challengeProgress(){return challengeProgress},
  get lastChallengeGrading(){return lastChallengeGrading},
  get renderer(){return renderer},
  get signatureFlight(){return signatureFlight},
  get velocityPresence(){return velocityPresence},
  get racingExperience(){return racingExperience},
  get gpuClock(){return gpuClock},
  get fidelityDirector(){return fidelityDirector},
  get fidelityProfile(){return fidelityProfile},
  get ghostVisual(){return ghostVisual},
  get sectorLandmarks(){return sectorLandmarks},
  get neonPipeline(){return neonPipeline},
  get completedSparkStats(){return completedSparkStats}},
  UI,uiState,ZONE_WAVE,ZONE_PALETTES,updateZoneWave,setZoneSpeedStage,announceSector,refreshHud,waveResonanceStrength,clamp,SHADOW_TUNNEL,positionAt,surfaceHeightAt,TRIAL,headingAt,createFlightMotionState,createCinematicState,createKineticCameraState,snapRacePose,raceSimulation,chaseCameraController,inShadowTunnel,tunnelIntensityAt,bankAt,CAMERA_MODE,speedAt,widthAt,cameraBankAt,railContactPoint,ACTIVE_TRACK_0160,CIRCUIT,isVault,placeShip,saveFleet,fleetStorage,recordFleetClear,refreshHangar,fleetStatus,STINGRAY_PRESENTATION_01347,VAULT_BOOST_0283_ACTIVE,TRACK_ID_0160,BOOST_PADS,RHYTHM_GATES_0160,timeTrialState,challengeSummary,endRun,RISK_REWARD_0160,newFlightState,stepFlight,THREE,buildMantaWings,motionRig,perfSettings,perfSummary,frameProfiler,unifiedFlightAudit,fidelityAudit,racingExperienceAudit,ghostAudit,hudBudget,domWrites});
 // Verify the exact mounted deck and fly its real physics only on explicit QA URLs.
 if(new URLSearchParams(location.search).get("vaultJumpSmoke")==="1"){
  window.__skyshiftCountdownProbe=()=>({mode:uiState.mode,label:raceCountdown.label,elapsed:flight.elapsed,distance:flight.s,history:raceCountdown.history(),visible:!$("race-countdown").classList.contains("hidden")});
  if(endurance)window.__skyshiftEnduranceProbe=()=>{endurance.sample(frameProfiler,readEnduranceSnapshot,true);return endurance.report();};
  if(smartPerformance)window.__skyshiftSmartPerformanceProbe=()=>{
   const render=enabled=>{
    renderer.info.reset();
    try{trackVisibility.begin(camera,enabled);neonPipeline.render(0);return {work:{...renderer.info.render},visibility:trackVisibility.stats(),pixels:renderer.domElement.toDataURL()};}
    finally{trackVisibility.end();}
   };
   const full=render(false),culled=render(true);
   // Same camera, geometry, material uniforms and compositor; PNG equality
   // is strict, and compare actual submitted triangle counts, not estimates.
   return {settings:{...smartPerformance},full:full.work,culled:culled.work,visibility:culled.visibility,pixelsEqual:full.pixels===culled.pixels,
    physicsHz:120,pacing:presentationGate.stats()};
  };
  if(COLOR_WAVE_ACTIVE)window.__skyshiftColorWaveProof=()=>{
    if(!sharedTunnelRuntime?.colorWaveStats?.().length||uiState.mode!=="playing")throw Error("Color wave proof needs live Vault race and installed color emitters");
    const result=[];
    try{
     for(let stage=0;stage<9;stage++){
      const visual={activeCount:0,shaderBaseStage:stage,playerStage:stage,fronts:[-10000,-10000,-10000],lastStepSeconds:flight.elapsed};
      sharedTunnelRuntime.updateWave(visual);premiumSurface.setWaveState(visual);identitySurface.setWaveState(visual);
      archRoadReflections?.updateWave(visual);unifiedCeilingRoad?.updateWave(visual);roadSpill02895?.updateWave(visual);sharedShipLight?.update(flight.s,visual);
      neonPipeline.render(0);
      result.push({stage,palette:COLOR_WAVE_PALETTES[stage],emitters:sharedTunnelRuntime.colorWaveStats(),road:roadSpill02895.stats(),png:renderer.domElement.toDataURL("image/png")});
     }
     const front=flight.s+30;
     const moving={activeCount:1,shaderBaseStage:0,playerStage:1,fronts:[front,-10000,-10000],lastStepSeconds:flight.elapsed};
     sharedTunnelRuntime.updateWave(moving);premiumSurface.setWaveState(moving);identitySurface.setWaveState(moving);
     archRoadReflections?.updateWave(moving);unifiedCeilingRoad?.updateWave(moving);roadSpill02895?.updateWave(moving);sharedShipLight?.update(flight.s,moving);
     neonPipeline.render(0);
     return {zones:result,transition:{front,emitters:sharedTunnelRuntime.colorWaveStats(),road:roadSpill02895.stats(),png:renderer.domElement.toDataURL("image/png")}};
    }finally{updatePalette(0);sharedShipLight?.update(flight.s,visualWaveView02899(zoneWave,flight.s));}
   };
   if(VAULT_MANTA_REBIRTH_ACTIVE)window.__skyshiftMantaVisualProbe=()=>{
   if(activeShipId!=="manta")throw Error("Manta visual proof requires equipped Manta");
   const pose={position:ship.position.clone(),quaternion:ship.quaternion.clone(),scale:ship.scale.clone()};
   const lights=engineLights.map(l=>({color:l.color.clone(),intensity:l.intensity}));
   const oldOverride=mantaQaOverride,playing=uiState.mode==="playing",priorMode=velocityCinematography.stats().mode;
   const canvas=document.createElement("canvas");canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;
   const ctx=canvas.getContext("2d",{willReadFrequently:true});
   const mount=rebirth=>{
    mantaQaOverride=rebirth;makeShip("manta");
    ship.position.copy(pose.position);ship.quaternion.copy(pose.quaternion);ship.scale.copy(pose.scale);
    engineLights.forEach((l,i)=>{l.color.copy(lights[i].color);l.intensity=lights[i].intensity;});
    ship.updateMatrixWorld(true);tunnelBlackout?.apply(flight.s);
   };
   const capture=rebirth=>{
    mount(rebirth);
     if(playing){premiumFX.frame({dt:1/60,playing,flight:{forwardSpeed:flight.currentSpeed,boostMultiplier:flight.boostMultiplier},ship,sectorColor:COLOR[zoneWave.playerStage].color,motionWeight:cinematicState,velocity:velocityState,presence:velocityPresence});ship.scale.copy(pose.scale);ship.updateMatrixWorld(true);}
     renderer.info.reset();
    try{
     trackVisibility.begin(camera,playing);spaceBackdrop.setVisible(!playing||advancedGpu.exterior);neonPipeline.render(0);
     ctx.drawImage(renderer.domElement,0,0);
     let hullCalls=0,hullTriangles=0,pbr=0,pmrem=0;
     for(const m of activeCraft.polishSurfaces??[]){if(m.material?.isMeshPhysicalMaterial||m.material?.isMeshStandardMaterial){pbr++;if(m.material.envMap)pmrem++;}}
     for(const m of ship.children){if(!m.isMesh)continue;hullCalls++;hullTriangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}
     return {data:ctx.getImageData(0,0,canvas.width,canvas.height).data,png:canvas.toDataURL(),work:{...renderer.info.render},
      spec:activeCraft.spec,exhaust:premiumFX.stats(),polish:activeCraft.polishStats(),hullCalls,hullTriangles,pbr,pmrem,flaps:reactiveWingFlaps.stats(),sockets:activeCraft.engineSockets.map(s=>[s.x,s.y,s.z])};
    }finally{spaceBackdrop.setVisible(true);trackVisibility.end();}
   };
   try{
    velocityCinematography.setMode("off");
    const plumeRelease=["0.29.5.2","0.29.6","0.29.7","0.29.8","0.29.8.1"].includes(VAULT_JUMP_VERSION);
    const corrected=plumeRelease||VAULT_JUMP_VERSION==="0.29.5.1";
    const before=capture(corrected?"0.29.5":false);
    const exhaustBefore=plumeRelease&&playing?capture("0.29.5.1"):null;
    const after=capture(plumeRelease?"0.29.5.2":corrected?"0.29.5.1":"0.29.5");
    let changed=0;for(let i=0;i<before.data.length;i+=4)changed+=Number(Math.max(Math.abs(before.data[i]-after.data[i]),Math.abs(before.data[i+1]-after.data[i+1]),Math.abs(before.data[i+2]-after.data[i+2]))>2);
    const strip=({data,...row})=>row;
    let exhaustChanged=0;
    if(exhaustBefore)for(let i=0;i<after.data.length;i+=4)exhaustChanged+=Number(Math.max(Math.abs(exhaustBefore.data[i]-after.data[i]),Math.abs(exhaustBefore.data[i+1]-after.data[i+1]),Math.abs(exhaustBefore.data[i+2]-after.data[i+2]))>2);
    return {mode:uiState.mode,before:strip(before),after:strip(after),exhaustBefore:exhaustBefore?strip(exhaustBefore):null,exhaustChangedPixels:exhaustChanged,fractionOver2:changed/(before.data.length/4)};
   }finally{
    mantaQaOverride=oldOverride;
    velocityCinematography.reset();velocityCinematography.setMode(priorMode);
   }
  };
  if(VAULT_TRUE_BLUR_ACTIVE)window.__skyshiftTrueVelocityProbe=()=>{
   // QA only: advance real flight and camera by two physics ticks per
   // exposure. Reuse an actual prior camera transform for same-scene A/B.
   const ctrl=velocityCinematography,priorBloom=neonPipeline.bloomResolutionScale,original=neonPipeline.originalBloomResolutionScale;
   const priorMode=ctrl.stats().mode,priorBloomEnabled=neonPipeline.bloom.enabled,priorSmaa=neonPipeline.smaa.enabled;
   const canvas=document.createElement('canvas');canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const dt=1/60;
   const frame=()=>{
    camera.updateMatrixWorld(true);ship.getWorldPosition(blurCraftProjection).project(camera);
    return {dt,playing:true,speedMultiplier:velocityPresentationRatio(flight.currentSpeed),boostMultiplier:1,
     craftX:blurCraftProjection.x*.5+.5,craftY:blurCraftProjection.y*.5+.5,craftZ:blurCraftProjection.z,snap:true};
   };
   const advance=()=>{
    for(let i=0;i<2;i++)stepFlight(flight,1/120,{grip:false,steer:0});
    snapRacePose(raceSimulation,flight);
    placeShip(performance.now()/1000,dt,flight,motionState,cinematicState);
    camera.updateMatrixWorld(true);
   };
   const draw=(mode,f,scale=original,raw=false)=>{
    ctrl.setMode(mode);ctrl.update(f);
    neonPipeline.setBloomResolutionScale(scale);
    neonPipeline.bloom.enabled=raw?false:priorBloomEnabled;neonPipeline.smaa.enabled=raw?false:priorSmaa;
    renderer.info.reset();
    try{
     trackVisibility.begin(camera,true);spaceBackdrop.setVisible(false);neonPipeline.render(0);
     ctx.drawImage(renderer.domElement,0,0);
     return {data:ctx.getImageData(0,0,canvas.width,canvas.height).data,png:canvas.toDataURL(),work:{...renderer.info.render},blur:ctrl.stats(),bloom:neonPipeline.bloomResolution()};
    }finally{spaceBackdrop.setVisible(true);trackVisibility.end();}
   };
   const summarize=(base,next)=>{
    let changed=0,core=0,coreChanged=0,dark=0,darkChanged=0,sum=0;
    const c=next.blur.craft;
    for(let i=0;i<base.data.length;i+=4){
     const x=(i/4%canvas.width+.5)/canvas.width,y=1-(Math.floor(i/4/canvas.width)+.5)/canvas.height;
     const d=Math.max(Math.abs(base.data[i]-next.data[i]),Math.abs(base.data[i+1]-next.data[i+1]),Math.abs(base.data[i+2]-next.data[i+2]));
     const light=Math.max(base.data[i],base.data[i+1],base.data[i+2]);
     changed+=Number(d>2);sum+=d;
     if(Math.hypot((x-c.x)*next.blur.aspect,y-c.y)<Math.min(.075,c.radius*.5)){core++;coreChanged+=Number(d>2);}
     if(light>=8&&light<=110){dark++;darkChanged+=Number(d>2);}
    }
    const {data,...rest}=next;
    return {...rest,difference:{fractionOver2:changed/(base.data.length/4),craftCoreFractionOver2:coreChanged/Math.max(1,core),darkFractionOver2:darkChanged/Math.max(1,dark),darkPixels:dark,meanMaxChannel:sum/(base.data.length/4)}};
   };
   try{
    ctrl.reset();
    const previous=camera.matrixWorld.clone();ctrl.update(frame());
    advance();
    const f=frame(),actual=draw('high',f),fixture={...f,probePreviousWorld:previous};
    const base=draw('off',fixture),high=summarize(base,draw('high',fixture)),
     ultra=summarize(base,draw('ultra',fixture)),extreme=summarize(base,draw('extreme',fixture)),
     boost=summarize(base,draw('extreme',{...fixture,boostMultiplier:1.4})),
     stationary=summarize(base,draw('extreme',{...fixture,probePreviousWorld:camera.matrixWorld.clone()})),
     launch=summarize(base,draw('extreme',{...fixture,speedMultiplier:1,boostMultiplier:1.4})),
     bloom65Base=draw('off',fixture,.65),bloom65=summarize(bloom65Base,draw('extreme',{...fixture,boostMultiplier:1.4},.65)),
     rawBase=draw('off',fixture,original,true),rawExtreme=summarize(rawBase,draw('extreme',fixture,original,true));
    // Second real camera step: no synthetic history or motion magnitude.
    ctrl.reset();ctrl.setMode('high');ctrl.update(frame());advance();
    const next=draw('high',frame());
    const strip=({data,...row})=>row;
    return {off:strip(base),high,ultra,extreme,boost,stationary,launch,bloom65,rawExtreme,
     actual:strip(actual),next:strip(next),speedMultiplier:f.speedMultiplier,
     cameraTravel:Math.hypot(camera.matrixWorld.elements[12]-previous.elements[12],camera.matrixWorld.elements[13]-previous.elements[13],camera.matrixWorld.elements[14]-previous.elements[14]),
     settings:{...velocityExperience},referenceFov:{mobile:adaptiveVelocityFov(75,780/360,f.speedMultiplier),desktop:adaptiveVelocityFov(75,16/9,f.speedMultiplier)}};
   }finally{
    neonPipeline.setBloomResolutionScale(priorBloom);neonPipeline.bloom.enabled=priorBloomEnabled;neonPipeline.smaa.enabled=priorSmaa;
    ctrl.reset();ctrl.setMode(priorMode);
   }
  };
  if(advancedGpu)window.__skyshiftAdvancedGpuProbe=({capture=false}={})=>{
   // QA-only synchronous readback from the same real game camera. No
   // timing claim: SwiftShader and readback are NOT physical mobile GPU time.
   const canvas=document.createElement('canvas');canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const original=neonPipeline.originalBloomResolutionScale,prior=neonPipeline.bloomResolutionScale;
   const render=(options)=>{
    renderer.info.reset();
    try{
     trackVisibility.begin(camera,true,options.occlusion===true);
     detailLod.begin(camera,options.detailLod===true);
     spaceBackdrop.setVisible(options.exterior!==false);
     neonPipeline.setBloomResolutionScale(options.scale??original);
     neonPipeline.render(0);
     ctx.drawImage(renderer.domElement,0,0);
     const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     return {data,work:{...renderer.info.render},visibility:trackVisibility.stats(),detail:detailLod.stats(),exterior:spaceBackdrop.visibilityStats(),bloom:neonPipeline.bloomResolution(),png:capture?canvas.toDataURL():null};
    }finally{detailLod.end();spaceBackdrop.setVisible(true);trackVisibility.end();}
   };
   const summarize=(base,next)=>{
    let sum=0,changed=0,max=0;
    for(let i=0;i<base.data.length;i+=4){
     const d=Math.max(Math.abs(base.data[i]-next.data[i]),Math.abs(base.data[i+1]-next.data[i+1]),Math.abs(base.data[i+2]-next.data[i+2]));
     sum+=d;max=Math.max(max,d);if(d>2)changed++;
    }
    const {data,...rest}=next;return {...rest,difference:{meanMaxChannel:sum/(base.data.length/4),fractionOver2:changed/(base.data.length/4),maxChannel:max}};
   };
   try{
    const base=render({}),occlusion=summarize(base,render({occlusion:true})),
     exterior=summarize(base,render({exterior:false})),lod=summarize(base,render({detailLod:true})),
     bloom78=summarize(base,render({scale:Math.min(original,.78)})),bloom65=summarize(base,render({scale:Math.min(original,.65)})),
     bloom50=summarize(base,render({scale:.50}));
    const {data,...baseline}=base;
    return {baseline,occlusion,exterior,lod,bloom78,bloom65,bloom50,settings:{...advancedGpu},width:canvas.width,height:canvas.height};
   }finally{neonPipeline.setBloomResolutionScale(prior);}
  };
  window.__skyshiftVaultJumpProbe=()=>{
   const j=VAULT_MEGA_JUMP,g=world.getObjectByName("Zone Ribbon · integrated PBR racing deck")?.geometry;
   const c=g?.getAttribute("aTrackCoord"),idx=g?.getIndex();
   let inside=0,before=0,after=0;
   if(c&&idx)for(let k=0;k<idx.count;k+=3){
    const a=c.getX(idx.getX(k)),b=c.getX(idx.getX(k+1)),d=c.getX(idx.getX(k+2));
    const s=(Math.min(a,b,d)+Math.max(a,b,d))*.5;
    if(s>=j.start&&s<j.end)inside++;
    if(s>=j.start-5&&s<j.start)before++;
    if(s>=j.end&&s<j.end+5)after++;
   }
   return {active:VAULT_MEGA_JUMP_ACTIVE,query:location.search,version:window.__skyshiftStartupAudit().version,
    gaps:GAPS.map(g=>({id:g.id,start:g.start,end:g.end})),inside,before,after,
    mounted:Boolean(c&&idx),pmrem:pmremPipeline?.active??false,
    rampRise:j.rampRise,polish:VAULT_JUMP_POLISH_ACTIVE,
    speedProfile:{...SPEED_PROFILE,cruiseTargets:Array.from({length:9},(_,i)=>speedAt(0,i)),launchPresentationRatio:velocityPresentationRatio(TRIAL.startSpeed)},
    roadBefore:onRoad(j.start-2,0),roadGap:onRoad(j.start+2,0),roadAfter:onRoad(j.end+2,0)};
  };
  window.__skyshiftVaultJumpCapture=(phase,stage=0)=>{
   if(uiState.mode!=="playing"||!VAULT_MEGA_JUMP_ACTIVE)throw Error("Mega Jump QA needs live race");
   const j=VAULT_MEGA_JUMP,s=j.start-24,p=positionAt(s,0,0);
   waveSmokeHold=true;
   Object.assign(flight,newFlightState(),{s,worldX:p.x,worldZ:p.z,lateral:0,heading:headingAt(s),y:surfaceHeightAt(s)+TRIAL.hoverHeight,
    zoneSpeedStage:stage,zoneCruiseSpeed:speedAt(s,stage),currentSpeed:speedAt(s,stage),checkpoint:1020,checkpointsPassed:3});
   if(phase!=="approach")for(let i=0;i<1200;i++){
    const rolling=!flight.grounded&&!flight.trickReady;
    stepFlight(flight,1/120,{grip:rolling,steer:rolling?.65:0});
    if(flight.falls||flight.cleanLeapLandings||(phase==="air"&&!flight.grounded&&flight.s>=j.start+14))break;
   }
   motionState=createFlightMotionState(flight.heading);cinematicState=createCinematicState();kineticCamera=createKineticCameraState();
   snapRacePose(raceSimulation,flight);chaseCameraController.snap(flight,motionState,cinematicState,true);
   placeShip(performance.now()/1000,1/60,flight,motionState,cinematicState);
   tunnelBlackout?.apply(flight.s);whiteCoreContainment?.update(flight.s,true);shipWhiteSpill?.update(flight.s,targetAccent,true);
   refreshHud();
   return {s:flight.s,grounded:flight.grounded,launches:flight.autoLaunches,landings:flight.cleanLeapLandings,
    rolls:flight.trickFullRotations,boosts:flight.landingBoostActivations,falls:flight.falls,peak:flight.peakAirHeightMeters};
  };
 }
 if(window.__skyshiftBoot?.deferred){
  await raceLoadingStage("PREPARING SHADERS AND FIRST FRAME",5);
  // Real composer warm-up before the race clock starts; retain normal render ownership.
  camera.updateMatrixWorld(true);
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
  assertStartupLifetime();
  if(neonPipeline)neonPipeline.render(0);else renderer.render(scene,camera);
  markStartup("raceWarmFrame");
  await raceLoadingStage("RACE READY",6);
 }
 // Pre-boot START queues a legacy "time-trial" mode string.
 // Only actual selected catalog objects may enter Challenge mode.
 assertStartupLifetime();
 markStartup("bootReady");
 window.__skyshiftBootReady?.(()=>enterPlaying(null));
 runtimeLifetime.start();
}catch(error){
 if(runtimeLifetime.disposed)return; // Permanent page exit already owns cleanup.
 runtimeLifetime.dispose();
 console.error("SKYSHIFT startup failed",error);
 window.__skyshiftBootFail?.(error);
 UI.error.classList.remove("hidden");
 UI.error.textContent="SKYSHIFT could not start: "+(error?.message||"Unknown startup error");
}
}
void initializeGame();
