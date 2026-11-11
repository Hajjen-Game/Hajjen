# CHROMA RUSH - Neon Circuit 1.2: Course Variety & Track Tide

Date: 2026-11-11

## Evidence from user playtest
Two uploaded Neon Circuit 1.1 logs show wins in 34.083s and 34.733s, with exactly 13 physical gate passes per race (start + four per completed lap), 2 and 0 edge scrapes, 11 and 24 contacts, 4 and 5 Dash uses and zero falls. Brake was not used. Their maximum render frame times were 6.6ms and 7.5ms, respectively; the second log had three frames >50ms, including a one-off worst 199.7ms.

The user found the mostly oval course boring and asked for more track variety while keeping readable straights/soft corners. The requested Wipeout HD Zone-style transition should repaint ONLY the circuit and advance rapidly in the direction of driving.

## Changes
Three hand-curated variants cycle across fresh races: CHROMA CHICANE (lower S-bend), SPECTRAL STRAIGHTS (upper S-bend and lower arch), and APEX SWITCHBACK (asymmetric soft inward arcs). The entire geometry, closest-track physics, physical checkpoints, AI lookahead, start grid and ranking now use the selected course, not a global oval. Courses never change halfway through a lap.

Track Tide 1.0: at each 10-second zone change, start about 92 world units behind the player and advance a pigment front FORWARD along the entire selected route in 1.45 seconds. Composite new cached road pigment with a ribbon shaped clip over the unchanged old road; wrap at start/finish using two independent shapes, never a diagonal across the screen. Road-edge moving highlights communicate direction without looking like a separate gameplay barrier.

Background sky, scenery, distant pillars, non-road floor and atmosphere keep the SAME neutral colors at all zones; only the circuit changes pigment. No fullscreen flash, heavy particle layers or new gameplay obstacles. Maintain the Rush glass cubes, responsive mobile controls, 750k backing pixel limit and existing automatic quality reduction.

Run Audit 1.2 includes course ID, course name and length plus wave scope/direction/duration and wave start coordinates in zone events. Existing progress, real physical checkpoint log, contacts, falls, Dash, Brake and performance data are preserved.

## QA
Node tests for all course geometries and full three-lap guided races with 13 checkpoints, waves strictly advancing in forward arc-distance, source-based absence of palette change in backdrop, and unchanged normal gameplay mechanics. Three Chromium landscape form factors including high DPI test touch joystick, Brake, Dash, pause, fullscreen, result JSON and snapshots of the three track variations. A live screenshot at the midpoint of a zone change and pixel check for unchanged world background versus changed asphalt verify the requested visual behavior.

## Follow-up playtest focus
Are the new curves and course rotation enough to make three laps fun? Is the wave clearly visible on the road without obscuring hazards or resembling a collision gate? Are impacts now readable enough? One of the two logs had 24 impacts but zero falls, so collision consequences remain worth examining separately once the new racing routes and road-wave visual are validated.

No other Chroma Rush mode's physics or UI is changed. No copyrighted Wipeout or Fuzion Frenzy assets used.
