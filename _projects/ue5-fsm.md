---
layout: project
project_style: ue5
title: "Character Controller — Unreal Engine 5"
title_display: "Character Controller — Work in Progress"
subtitle: "Unreal Engine 5 · Work in Progress"
role: "Gameplay Programmer"
team: 1
duration: "Ongoing"
tech: "Unreal Engine 5, C++, Plugin Architecture, Animation Blueprint"
video: "/assets/video/ue5-turnAnim.mp4"
image: "/assets/img/ue5-fsm.png"
about: "A third-person character controller built in UE5 C++ as the foundation for a vertical slice. Developed incrementally, starting from a custom State Machine plugin and growing one system at a time toward a complete locomotion pipeline."
---

---

## The Foundation: State Machine

<div class="feature-badge-row">
  <span class="feature-badge">Plugin Architecture</span>
  <span class="feature-badge">UObject States</span>
  <span class="feature-badge">Blueprint Exposed</span>
  <span class="feature-badge">Editor Configurable</span>
</div>

The system exposes a `UStateManagerComponent` attachable to any Actor, handling state instantiation, lifecycle management (`OnEnterState`, `TickState`, `OnExitState`), transition logic, and runtime history tracking; all in native C++ using `UCLASS`, `UPROPERTY` and `UFUNCTION` macros.

States are defined via a `UStateBase` class hierarchy: `PlayerBaseState` extends the base to add player-specific references and input binding through delegates. Concrete states like `IdleState` and `WalkState` derive from that.

## Architecture

The system is split across two layers:

**Plugin layer** (`FSM` plugin) — contains `UStateBase` and `UStateManagerComponent`. Intentionally generic: knows nothing about the project using it. The component manages a `TMap<FString, TSubclassOf<UStateBase>>` populated from the Details Panel, instantiates states at runtime via `NewObject`, and routes lifecycle calls to the active state.

**Project layer** — contains `UPlayerBaseState`, an intermediate class adding player-specific logic. Concrete states inherit from here.

```
BP_IdleState
    ↓
UIdleState          (C++ — project)
    ↓
UPlayerBaseState    (C++ — project)
    ↓
UStateBase          (C++ — plugin)
```

## State Lifecycle

Each state implements three virtual functions from `UStateBase`:

- `OnEnterState(AActor* Owner)`
- `TickState(float DeltaTime)`
- `OnExitState()`

The `UStateManagerComponent` guards transitions with a private `bCanTickState` flag, set to `false` mid-switch to avoid ticking a state that's being replaced.

## Editor Integration

States and the initial state are configured entirely from the Details Panel with no hardcoded references in C++. `InitStateManager()` is `BlueprintCallable` and called from the owning Actor's `BeginPlay`.

<div class="gallery">
  <img src="/assets/img/3rdPersonCharacterBP.png" alt="Third Person Character Blueprint">
  <img src="/assets/img/debug-fsm.png" alt="Debug view of the State Machine">
</div>
<p class="gallery-caption">Character Blueprint setup and runtime debug view.</p>

---

## Turning Animation System

<div class="feature-badge-row">
  <span class="feature-badge">Root Motion</span>
  <span class="feature-badge">ABP Integration</span>
  <span class="feature-badge">Curve-Driven</span>
  <span class="feature-badge">Spring Interpolation</span>
</div>

The locomotion system is being built with **root motion** in mind: the character's position is driven by the animation rather than the capsule, and the turn system is part of this pipeline.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-turnAnim.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Turn in place system: left and right 90° turns. No 180° support yet.</p>

The character's yaw is held in place by a **Rotate Root Bone** node in the AnimGraph, which keeps the mesh orientation fixed independently from the actor's rotation. While idle, C++ accumulates the delta between the actor's current and previous yaw each tick. Once the offset exceeds a configurable threshold (exposed in the Details Panel of the custom Anim Instance) a turn animation fires and a **spring interpolator** smoothly returns `RootYawOffset` to zero, giving the rotation a natural, physical feel rather than a hard snap.

<div class="gallery gallery--single">
  <img src="/assets/img/turn-anim-graph.png" alt="AnimGraph with Rotate Root Bone node">
</div>
<p class="gallery-caption">AnimGraph: Locomotion state machine --> Rotate Root Bone --> Output Pose.</p>

On the C++ side, the code handles the yaw offset calculation and increments `TurnAnimElapsedTime` each tick. This value is passed to a **Sequence Evaluator** node in the AnimGraph, which uses it as a start position when transitioning from `EnterTurn` to `TurnRecovery`, so the recovery animation picks up exactly where the entry left off.

<div class="gallery">
  <img src="/assets/img/turn-state-machine.png" alt="Idle/Turn State Machine">
  <img src="/assets/img/turn-recovery-state.png" alt="Turn Recovery state">
</div>
<p class="gallery-caption">Left: Idle / Turn State Machine. Right: Turn Recovery state --> Sequence Player using TurnAnimElapsedTime as start position.</p>

The transition out of `EnterTurn` is driven by a **TurnYawCurve** embedded in the animation, an approach taken from Epic's **Lyra** project. The state exits only when the curve reads near zero, meaning the turn is visually complete, not just timed out.

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>How C++ and the Animation Blueprint share state at runtime, the basics of how root motion works in UE5, and general C++ debugging skills that helped me get this working.</p>
</div>

---

## Locomotion: Two State Machines

<div class="feature-badge-row">
  <span class="feature-badge">Decoupled Design</span>
  <span class="feature-badge">C++ ↔ AnimBP</span>
  <span class="feature-badge">Parameter-Driven</span>
  <span class="feature-badge">Camera-Relative</span>
</div>

Past the turning system, the controller grew into a full locomotion pipeline. The whole thing rests on one deliberate split: two state machines running in parallel.

The **C++ FSM** (the plugin above) owns *gameplay* state — whether the character is idling, walking, jogging or crouching. The **AnimGraph state machine** owns *visual* state — which animation is playing: Idle, Movement Start, Movement Cycle, Movement Stop, and the transitions between them.

The two never reference each other directly. They talk through `UPROPERTY` values on a custom `UAnimInstance`: each C++ state pushes parameters every `TickState`, and the AnimGraph reads them as a pure rendering layer. The point of the split is that the two machines can be intentionally out of sync — the character can be logically "idle" in C++ while the AnimGraph is still playing a stop animation, which is exactly what you want for a believable deceleration.

```
C++ FSM (gameplay)  ──push──>  UCustomAnimInstance  <──read──  AnimGraph FSM (visual)
  Idle · Walk · Jog              OrientationDirection           Idle · Start · Cycle · Stop
  Crouch                         Velocity · bShouldMove
                                 LeanAngle · StopDistance
```

---

## 8-Directional Movement

<div class="feature-badge-row">
  <span class="feature-badge">Signed Angle</span>
  <span class="feature-badge">Dot + Cross</span>
  <span class="feature-badge">Atan2</span>
  <span class="feature-badge">Enum Bucketing</span>
</div>

The character can move in any direction relative to where it faces — strafing, backpedalling, diagonals — while the camera drives orientation.

Every tick, the active state computes the signed angle between the actor's forward vector and its velocity, projected onto the ground plane. The dot product alone can't tell left from right — it's symmetric — so the system pairs it with the Z component of the cross product and feeds both into `Atan2`, giving a full signed angle in the [-180°, +180°] range. That angle is then bucketed into four cardinal directions held in an `EOrientationDirection` enum.

When velocity drops near zero, the calculation returns the **last known direction** instead of recomputing. Without this, the angle would collapse to zero and snap the character to "Forward" the instant it stopped, popping the next start animation.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-enum-orientation.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">On-screen debug: the orientation enum updating as the character moves around the camera.</p>

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>The "dot for magnitude, cross for sign, Atan2 for the full angle" technique isn't specific to locomotion — it's the same calculation behind aim offsets, turn detection and AI vision cones. Building the mental model once made all of those click.</p>
</div>

---

## Input Intent vs Physical State

<div class="feature-badge-row">
  <span class="feature-badge">Enhanced Input</span>
  <span class="feature-badge">Frame-Accurate</span>
  <span class="feature-badge">Decoupled Triggers</span>
</div>

A subtle distinction drives the entire stop pipeline: *what the player is asking for* versus *what the character is physically doing*.

`bShouldMove` reflects **intent** — it's tracked straight off the Enhanced Input bindings (`Triggered` / `Completed` / `Canceled`), so it flips to false the exact frame the movement key is released, even while the character is still moving at full speed. `IsMoving()` reflects **physical state** — true while velocity is above a threshold.

The AnimGraph reacts to intent (Movement Cycle → Movement Stop fires on input release, while the character still has speed to spend), and the C++ FSM reacts to physical state (Walk → Idle only once movement has actually stopped). Driving the stop transition off intent rather than velocity is what makes distance-matched deceleration possible at all.

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>My first attempt read the input vector from the movement component, which doesn't return to zero the instant the key is released — it lags a few frames. Debugging that with on-screen prints taught me to track intent at the binding itself, and to never assume a getter is frame-accurate just because it sounds like it should be.</p>
</div>

---

## Distance-Matched Stops

<div class="feature-badge-row">
  <span class="feature-badge">Distance Matching</span>
  <span class="feature-badge">Curve Modifier</span>
  <span class="feature-badge">Predicted Stop</span>
  <span class="feature-badge">Property Access</span>
</div>

Stop animations are synced to the character's physical deceleration, so the animation plays out in step with the slowdown rather than freezing on a single frame.

Each stop animation carries a **Distance curve** generated automatically by Unreal's **Distance Curve Modifier**, which reads the animation's root motion and records how far the character still has to travel at each frame. At runtime, an anim function predicts the stop location from the current velocity and the movement component's braking parameters via `PredictGroundMovementStopLocation`, and a **Distance Match To Target** node finds the animation frame whose curve value matches that predicted distance.

The braking parameters feeding the prediction are read **live** through Unreal's Property Access system, from a pointer to the Character Movement Component. They're deliberately not copied into the Anim Instance: each state swaps the movement parameters on enter (via a data asset), and a cached copy would go stale the moment that happened.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-distance-matching.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Distance-matched stops at different speeds: the animation always lands the foot at the exact point where the character decelerates to rest.</p>

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>The hardest bug here wasn't the matching itself — it was a stale cache. I'd copied the braking values into the Anim Instance inside <code>NativeInitializeAnimation</code>, which runs once at startup, before any state had applied its data asset. Switching to a live read fixed it, and taught me the difference between caching a pointer (safe) and caching a value that changes at runtime (a trap).</p>
</div>

---

## Animation Warping & Lean

<div class="feature-badge-row">
  <span class="feature-badge">Orientation Warping</span>
  <span class="feature-badge">Stride Warping</span>
  <span class="feature-badge">Additive Lean</span>
  <span class="feature-badge">Blend Space</span>
</div>

Three warping systems sit on top of the base locomotion poses.

**Orientation Warping** rotates the lower body to line the legs up with the actual direction of travel while the upper body stays oriented to where the character faces. It runs across all movement states, driven by the same signed angle the orientation system already computes — remapped so that zero aligns with the current direction of travel rather than the actor's forward.

**Stride Warping** scales the stride length to match the character's real speed, so the feet keep pace when velocity differs from the speed the animation was authored at. It runs **only inside the Movement Cycle** — applying it during stops caused visible flickering, because the rapidly changing velocity made the stride scale jump frame to frame.

**Lean** is an additive layer driven by the character's yaw rate: the faster it turns, the more the body leans into the curve. `LeanAngle` is computed in C++ from the per-tick change in actor yaw, sign-flipped based on the current movement direction, then fed into an additive blend space (`BS_Leans`) whose own spring smoothing keeps the motion soft. Like stride warping, it lives **only in the Movement Cycle**.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-locomotion-warping.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Orientation warping and lean reacting to direction and turn rate during a movement cycle.</p>

---

## Gait & Stance Transitions

<div class="feature-badge-row">
  <span class="feature-badge">Notify-Driven</span>
  <span class="feature-badge">Bool Guards</span>
  <span class="feature-badge">Data Assets</span>
  <span class="feature-badge">Trimmed Clips</span>
</div>

Two toggle systems share one pattern: a transition animation plays, and a guard bool blocks re-triggering until it finishes.

**Walk ↔ Jog** uses an AnimNotify placed near the end of each transition clip. Thanks to Unreal's magic-naming convention (`AnimNotify_<NotifyName>`), the matching C++ function on the Anim Instance is called automatically when the notify fires, clearing the guard. The transition clips were trimmed to drop their lead-in frames, so the visual shift in movement matches the exact moment the movement parameters swap in C++.

**Stand ↔ Crouch** follows the same idea with an AnimNotifyState and a consume-pattern bool that reads and resets itself in a single call.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-gait-transitions-walk-jog.mp4" autoplay muted loop playsinline></video>
  <video src="/assets/video/ue5-gait-transitions-crouch-stand.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Walk-to-jog and stand-to-crouch transitions: the guard bool blocks re-triggering mid-clip, keeping each gait change clean and uninterrupted.</p>

Each state's movement parameters — max speed, braking, friction — live in a `ULocomotionDataAsset` applied to the Character Movement Component in `OnEnterState`, so they can be tuned from the editor without recompiling.

---

## What I'm Learning

This project is being built incrementally as a hands-on exercise in Unreal Engine's C++ ecosystem, one system at a time. So far I've worked through plugin architecture, Unreal's reflection system (`UPROPERTY`, `UFUNCTION`), component-based logic separation, class inheritance with virtual functions, and input handling through delegates.

The locomotion layer pushed that further: sharing state between C++ and the Animation Blueprint without coupling them, the vector maths behind directional movement, distance matching against root-motion curves, and the practical difference between input intent and physical state. A lot of the real learning came from debugging — stale caches, frame-accuracy of input, warping artefacts during stops — and from deciding when a system was "good enough" for a vertical slice rather than chasing polish it didn't need.

You can check the repository <a class="repo-link" href="https://github.com/ItalianJackWEIRD/VS_FSM/tree/sprint1/FSM" target="_blank" rel="noopener">here ↗</a>
