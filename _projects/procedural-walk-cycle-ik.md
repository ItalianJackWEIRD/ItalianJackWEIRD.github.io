---
layout: project
title: "Procedural Walk Cycle with Inverse Kinematics (2024)"
role: "Technical Animator / Gameplay Programmer"
team: 1
duration: "1 Month"
tech: "Unreal Engine 5, Control Rig, Blueprints, IK"
video: "/assets/video/spider-long.mp4"
image: "/assets/img/spider.png"
about: "Bachelor thesis project. A fully procedural walk cycle for an 8-legged spider in Unreal Engine 5 — no keyframe animations. Every leg placement, body height, and movement arc is computed in real time using Inverse Kinematics, Control Rig, and Blueprint logic."
---

## Introduction

The goal was simple to state and genuinely hard to implement: take a static 3D spider model and make it walk convincingly across any terrain, without a single keyframe animation. Everything — foot placement, body alignment, leg timing, step arcs — had to be computed at runtime.

The project was also my first real contact with procedural animation as a discipline. The concepts involved (IK chains, coordinate spaces, delta-time-based systems) were new to me going in. I worked through them iteratively, using trial and error as the main methodology, which is honestly the only way this kind of work gets done.

The mesh came pre-rigged. I built the material from scratch using generated texture maps (Normal, Roughness, Metallic, AO), and everything else in the project — Control Rig, Blueprints, PCG level — I wrote myself.

## Grounding the Body — Pelvis and Feet

The first step was making the spider physically touch the ground. Without this, all IK work is meaningless.

The foot IK is solved with Unreal's **Basic IK** node inside Control Rig. With 8 legs, this runs once per foot every frame.

I used **Sphere Traces** to find the terrain surface below each body part. For each of the 8 feet, I traced from above the foot position downward and used the hit point as the IK target.


<div class="gallery gallery--single">
  <img src="/assets/img/spider1.png" alt="descrizione">
</div>
<p class="gallery-caption">Pelvis and all 8 feet independently grounding to surfaces of different heights.</p>

This introduced the first bug: at geometry edges, legs would clip through surfaces because the trace origin was calculated from the foot position alone, ignoring the surrounding geometry. The fix was to interpolate the trace origin between the foot position and the pelvis (alpha = 0.5), which shifted it inward enough to clear the geometry.

## Locking Feet

Once the feet could find the ground, the next problem was that they recalculated their target every frame — which meant they slid along the terrain instead of planting.

I stored the initial foot positions in a **WorldLockedFootLocation** array (in World Space) during a Construction Event. From that point, IK targets were frozen in the array and only updated at controlled intervals, rather than recalculating every tick.

Each new foot position is computed ahead of the body in the direction of movement, so the spider plants its feet where it's going rather than where it was.

## Independent Leg Timing

At this point all 8 legs moved simultaneously, which looked completely robotic. The fix was a **FootTimings** array — each foot has its own timer that increments every frame by `deltaTime`. When a timer exceeds a threshold, that foot recalculates its target position and resets.

To stagger the legs, I initialized each timer to `footIndex * 0.125` — a small offset per leg. Combined with a **Remap** function this produced the staggered, asynchronous feel I was after.

<div class="gallery">
  <video src="/assets/video/spider-sync.mp4" autoplay muted loop playsinline></video>
  <video src="/assets/video/spider-async.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Left: all legs moving simultaneously. Right: after per-leg timer offset and Remap — the movement becomes visibly more natural.</p>

## Foot Arc

Feet were still moving in straight lines between positions. One of the 12 Principles of Animation states that natural movement follows arcs, not straight paths!

I added an **Evaluate Curve** node that takes the interpolation progress (0→1) and maps it to a Z-offset following a custom curve. The curve peaks early and falls off gradually — so feet lift quickly and come down slowly. This single change made the movement look substantially more alive.

The curve's Target Maximum is driven by velocity, so faster movement produces higher step arcs.

## Pelvis Spring — The Part That Made It Feel Alive

The pelvis was previously snapping instantly to new terrain heights, which broke the illusion of weight.

I replaced the direct position assignment with UE5's **Spring Interpolate** node, which helped simulating elasticity and mass.

I also changed what the pelvis targets: instead of tracing from its own position, it now traces from the **average position of all 8 feet**. This means the body tracks toward the collective center of the legs — so when the spider climbs a slope, the body leans into it, and when it turns, the body follows the direction of movement.

The result is that the spider appears to breathe. The body bobs naturally as legs cycle, reacts to terrain, and has inertia. This was the most satisfying moment in the project.

<div class="gallery gallery--single">
  <video src="/assets/video/spider-pelvis.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">The pelvis spring interpolation tracking the average foot position. The body movement is entirely procedural.</p>

## PCG Forest Level

To test the system on real terrain (instead of the flat dev room used throughout), I built a forest level using UE5's **Procedural Content Generation** framework. 

The assets came from Megascans. The point of this chapter wasn't to build a complete game level — it was to give the IK system terrain that would actually challenge it.

<div class="gallery">
  <img src="/assets/img/spider-show-FINAL.png" alt="descrizione">
  <img src="/assets/img/spider-show-FINAL2.png" alt="descrizione">
</div>
<p class="gallery-caption">The spider in the PCG forest. Foot placement and body alignment adapting to uneven, sloped terrain in real time.</p>

## Known Limitation

At high speed, legs still trail slightly behind the body. The root cause is that foot positions are stored in **World Space**: when the body moves quickly, the locked world positions fall behind before the next step triggers. The correct fix is to store positions in **Local Space** (relative to the rig), so feet move with the body. I documented this in the thesis but didn't implement it — the conversion between World and Local Space within Control Rig would have added significant complexity beyond the scope of the project.

## What I'd Do Differently

The leg trailing at speed is the obvious one. Beyond that, the step timing system is rigid — every leg uses the same threshold values. A more organic system would vary thresholds per leg pair based on their natural reach distance. I'd also explore blending the procedural system with short keyframe animations for specific actions like turning sharply or stopping, rather than relying on procedural motion for everything.

*Bachelor thesis — Roma Tre University, Computer Engineering. Grade: 101/110.*
