---
layout: project
title: "Procedural Walk Cycle with Inverse Kinematics (2024)"
role: "Technical Animator / Gameplay Programmer"
team: 1
duration: "1 Month"
tech: "Unreal Engine 5, Control Rig, Blueprints, IK"
image: "/assets/img/procedural-walk-cycle.png"
video: "/assets/video/procedural-walk-cycle.mp4"
about: "My Bachelor thesis — a procedural animation system for a multi-legged creature in Unreal Engine 5. Instead of pre-baked animations, each leg adapts in real time to terrain height, slope, and obstacles using Control Rig and Inverse Kinematics."
---

## Introduction

For my Bachelor thesis I wanted to tackle something at the intersection of animation and code. Procedural walk cycles are a great case study: the problem is well-defined, but getting it to look *natural* requires careful tuning of many interdependent systems.

## Procedural Step System

Each leg operates independently. A raycast checks the expected foot landing position ahead of the stride, and if the leg is past a distance threshold from its current planted point, a step is triggered. The step arc is driven by an animation curve so it eases in and out naturally.

- Per-leg stride threshold and cooldown
- Terrain raycasts to find exact landing height
- Smooth interpolation of foot position and rotation
- Leg-pair coordination (opposing legs offset by half a cycle)

## Body Motion

The body height and lean are derived from the average foot position — if the creature walks uphill, the body rises; on a slope, it tilts accordingly. This makes the creature feel **grounded** without any manual authoring.

<div class="gallery">
  <img src="/assets/img/procedural-walk-cycle.png" alt="Flat terrain walk cycle">
  <img src="/assets/img/procedural-walk-cycle.png" alt="Slope adaptation">
</div>
<p class="gallery-caption">Procedural foot placement adapting to flat and uneven terrain.</p>

## Control Rig Integration

All IK is solved in Unreal's Control Rig, which runs as a post-process layer on the animation graph. This keeps IK separated from the Blueprint logic and makes it easy to tweak per-bone constraints and weight blends without touching the gameplay code.

<a class="repo-link" href="https://github.com/ItalianJackWEIRD" target="_blank" rel="noopener">View on GitHub ↗</a>
