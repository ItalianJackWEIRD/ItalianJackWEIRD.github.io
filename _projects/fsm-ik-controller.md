---
layout: project
title: "Third-Person Controller with IK & Custom State Machine (2025)"
role: "Gameplay Programmer"
team: 1
duration: "2 Months"
tech: "Unity (C#), HDRP, Animation Rigging"
video: "/assets/video/fsm-header.mp4"
image: "/assets/img/fsm-header.png"
about: "A third-person action prototype in Unity HDRP. The focus was architecture: a custom C# state machine running alongside Unity's Animator, a parkour system driven entirely by code rather than root motion, and Animation Rigging IK for procedural hand and foot placement."
---

> **A note on the animations.** All animations in this project are from Mixamo and were never retargeted to the character rig — so they look rough on the model. They also don't use root motion by design, since the goal was to build all displacement through code. This means the visual timing between the animation and the actual movement is often off. The animations are placeholder; the systems underneath them are the point.

## Introduction

The goal was to build a character controller I could actually extend without it falling apart. Unity's built-in Animator handles blending and playback, and a custom C# FSM handles all gameplay decisions.

The two talk to each other — the FSM sets Animator booleans and floats — but neither owns the other's logic.

## State Machine Architecture

Every state inherits from `BaseState`, which defines `EnterState()`, `UpdateState()`, and `ExitState()`. This keeps things clean — you always know exactly where to look when something breaks, and nothing from one phase accidentally ends up mixed into another.

`PlayerStateMachine` acts as the shared context. It holds all the data states need — input, physics, animator references, scanner results — and passes itself into every state. States read and write through it rather than going looking for things themselves.

`StateFactory` pre-instantiates all states at startup and holds references to them. States are reused across transitions instead of being allocated and garbage collected every time. `SwitchState()` calls `ExitState()` on the current state, swaps the reference, and calls `EnterState()` on the new one — the whole transition is three lines.

When a parkour action starts, the FSM sets `inControl = false`, which blocks input processing and gravity for the duration of the animation. The state itself decides when to give control back.

**States:** `Idle`, `Walk`, `Run`, `Jump`, `Fall`, `Crouch`, `Vault`, `ClimbLow`, `ClimbHigh`, `ClimbDown`, `Slide`


## Locomotion — Walk & Idle

The walk state uses two separate animation curves for acceleration and deceleration rather than a single `Mathf.Lerp`. Acceleration eases in slowly at first then ramps up; deceleration starts fast and tapers off. The difference is subtle but the movement reads as having actual weight.

Speed is also modified by a **directional speed curve** — the angle between the player's forward direction and the current movement direction is normalized to `[0, 1]` and evaluated against the curve. Moving forward gives full speed, strafing laterally about 75%, moving backward about 70%. This means backing away from something feels physically plausible without requiring separate animation states.

<div class="gallery gallery--single">
  <video src="/assets/video/fsm-locomotion.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Walk, strafe, and stop — the acceleration curves and momentum system are visible in how the character settles.</p>

Rotation uses its own acceleration curve as well — angular velocity ramps up proportionally to the camera-player angle difference, evaluated through a custom curve. The player doesn't snap to camera direction; it catches up smoothly.

When you stop and transition to Idle, the last move direction and speed are passed across the state boundary. `IdleState` runs a momentum system for 1.2 seconds, applying a decaying force in that direction before the character fully stops. The decay follows a stop curve so the slowdown itself is nonlinear.

<div class="gallery gallery--single">
  <video src="/assets/video/fsm-locomotion-inertia.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Momentum applied to the character.</p>

## Environment Scanner

The `EnvironmentScanner` runs two raycasts to detect obstacles: one forward at chest height, and one downward from above the hit point to measure the obstacle's top surface. The height hit gives the exact position where hands or feet should land.

Ray length is dynamic based on the current state — longer when running, shorter when crouching. This means you can initiate a vault from further away at a sprint, which feels correct, and you can't accidentally trigger parkour actions when crouched and near a wall.

Ledge detection uses three downward raycasts — center, left, and right of the player. If the center ray misses (no ground ahead) while either side hits, the player is at a ledge. This drives the ledge camera offset and blocks forward input, and is what triggers ClimbDown when requested.

<div class="gallery">
  <img src="/assets/img/fsm-scanner.png" alt="descrizione">
  <img src="/assets/img/fsm-scanner-ledge.png" alt="descrizione">
</div>
<p class="gallery-caption">Debug view of the Environment Scanner.</p>

## Parkour — Vault, Climb, Slide

All parkour movement is driven by code. `Animator.applyRootMotion` is disabled on entry and the FSM moves the `CharacterController` directly using a parametric position calculated from a custom curve and a normalized time `t`. The animation plays for visual reference; the actual displacement is computed.

**Vault** interpolates between a start and end position using a sine arc for the vertical component, driven by `VaultCurve`. The camera detaches from the player at entry and follows a manually scripted path — forward and slightly ahead — then lerps back to the player in the final 40% of the animation. Hand IK fades in between 15–55% of the animation using `TwoBoneIKConstraint` weights, locking both hands to the obstacle surface.

**ClimbHigh** works similarly but moves the character upward instead of over. The animation starts with a 16.75% preparation phase where the player advances horizontally without rising, then transitions into the vertical climb. IK weights for hands and feet fade in and out independently at different keyframe percentages — right foot first, then right hand, then left foot and left hand together — to match the visual rhythm of the animation without keying anything manually. Control returns at 85% of the animation so the player can already start steering into the next state.

<div class="gallery">
  <video src="/assets/video/fsm-climbHigh.mp4" autoplay muted loop playsinline></video>
  <video src="/assets/video/fsm-climbLow.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">ClimbHigh on the left, ClimbLow on the right.</p>

**Slide** locks the player into a forward direction at entry, computes a start and end position `slideDistance` units ahead, and moves the character along that path using `SlideCurve`. Exits into `Crouch` by default, or back into `Run` if sprint is held.

<div class="gallery">
  <video src="/assets/video/fsm-slide.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Slide with procedural camera follow.</p>

## Camera

Camera position is driven by a lerp toward a goal position (`_cameraTargetOffsetGoal`) that changes per state — higher for ledge, lower for crouch, default otherwise. The lerp runs every `LateUpdate` so the transition between positions is smooth rather than instant.

`CameraMotion` adds a vertical bob and horizontal sway while walking, both evaluated from animation curves against a running timer. The effect is weighted — it fades in when the walk state starts and fades out on exit — so there's no pop when transitioning to idle.

During parkour actions the camera target is detached from the player hierarchy entirely, moved manually by the state's own camera update function, then reattached on exit. This avoids the camera fighting between Cinemachine's follow and the state's scripted movement.

Head look-at is handled with a Multi-Aim Constraint targeting a point in front of the camera. The constraint weight fades to zero when the camera swings behind the player past 115°, so the head doesn't torque unnaturally to face behind itself.

<div class="gallery">
  <video src="/assets/video/fsm-headIK.mp4" autoplay muted loop playsinline></video>
</div>

## What I'd Do Differently

The IK target positions for ClimbHigh are computed with hardcoded offsets relative to the obstacle hit point. It works for the obstacles in the test level but it's fragile — surface angles, obstacle widths, and edge cases all break it. A more robust approach would sample the surface normal and compute positions relative to it, or use a secondary raycast per limb.

The parkour entry conditions (obstacle tag comparison, height threshold) live in the state transitions inside Walk and Idle. As the number of actions grows, this becomes a mess. A dedicated `ParkourResolver` that takes the scanner data and returns the correct state would be cleaner.

The Animator state machine is incomplete. Several micro-transition states are missing — there's no `StartWalkBackward` before moving in reverse, no `StopRun` blend before idle, and similar gaps throughout. The result is that some transitions pop visually instead of flowing. Adding these intermediate states would require retargeting proper animations anyway, so it felt out of scope for this prototype.

The momentum system applies to all stops regardless of the previous speed. In practice, this makes small directional corrections feel sluggish — tapping a direction and immediately releasing it carries the same inertia as stopping from a full sprint, which reads as floaty. The cleaner approach would be to gate the momentum system on exit speed: only apply it when coming out of `Run`, not `Walk`, and scale the effect proportionally to how fast the character was moving.

<a class="repo-link" href="https://github.com/ItalianJackWEIRD/Project-X/tree/Sprint1/HDRPLevelPrototype" target="_blank" rel="noopener">View on GitHub ↗</a>