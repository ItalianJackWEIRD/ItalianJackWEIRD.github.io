---
layout: project
project_style: ue5
title: "Advanced Locomotion — Unreal Engine 5"
title_display: "Advanced Locomotion System"
subtitle: "Unreal Engine 5"
role: "Gameplay Programmer"
team: 1
duration: "2 months"
tech: "Unreal Engine 5, C++, Plugin Architecture, Animation Blueprint"
video: "/assets/video/ue5-fsm.mp4"
image: "/assets/img/ue5-fsm.png"
about: "A third-person character controller built in UE5 C++ as the foundation for a vertical slice. Developed incrementally, starting from a custom State Machine plugin and growing one system at a time toward a complete Advanced Locomotion pipeline."
---

---

## The Foundation: State Machine Plugin

<div class="feature-badge-row">
  <span class="feature-badge">Plugin Architecture</span>
  <span class="feature-badge">UObject States</span>
  <span class="feature-badge">Blueprint Exposed</span>
  <span class="feature-badge">Editor Configurable</span>
</div>

The base of everything is a generic FSM packaged as its own plugin. A `UStateManagerComponent` attaches to any Actor and handles state instantiation, the lifecycle (`OnEnterState` / `TickState` / `OnExitState`), transitions and runtime history. States derive from a `UStateBase` hierarchy: `PlayerBaseState` adds player references and delegate-based input binding, and concrete states like `IdleState` and `WalkState` build on that.

The split is deliberate. The **plugin layer** (`UStateBase`, `UStateManagerComponent`) knows nothing about the project using it since it holds a `TMap<FString, TSubclassOf<UStateBase>>` populated from the Details Panel and instantiates states at runtime via `NewObject`. The **project layer** adds the player-specific logic on top.

```
BP_IdleState
    ↓
UIdleState          (C++ — project)
    ↓
UPlayerBaseState    (C++ — project)
    ↓
UStateBase          (C++ — plugin)
```

States and the initial state are configured entirely from the Details Panel, with no hardcoded references in C++; `InitStateManager()` is `BlueprintCallable` from the owner's `BeginPlay`. A `bCanTickState` guard stops a state from ticking while it's mid-swap.

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

The locomotion system is built around **root motion**: position is driven by the animation, not the capsule. The turn-in-place is the first piece of that pipeline. A **Rotate Root Bone** node in the AnimGraph holds the mesh orientation fixed while the actor rotates; C++ accumulates the yaw delta each tick, and once it crosses a configurable threshold a turn fires while a **spring interpolator** eases `RootYawOffset` back to zero for a physical feel instead of a snap.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-turnAnim.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Turn-in-place: left and right 90° turns. No 180° support yet.</p>

C++ also feeds `TurnAnimElapsedTime` into a **Sequence Evaluator**, so the recovery animation picks up exactly where the entry left off.

<div class="gallery">
  <img src="/assets/img/turn-state-machine.png" alt="Idle/Turn State Machine">
  <img src="/assets/img/turn-recovery-state.png" alt="Turn Recovery state">
</div>
<p class="gallery-caption">Idle / Turn state machine, and the recovery state reading TurnAnimElapsedTime as its start position.</p>

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>How C++ and the Animation Blueprint share state at runtime, the basics of root motion in UE5, and a lot of practical C++ debugging.</p>
</div>

---

## Locomotion: Two State Machines

<div class="feature-badge-row">
  <span class="feature-badge">Decoupled Design</span>
  <span class="feature-badge">C++ ↔ AnimBP</span>
  <span class="feature-badge">Parameter-Driven</span>
  <span class="feature-badge">Camera-Relative</span>
</div>

Past turning, the controller grew into a full locomotion pipeline with one deliberate split in mind: **two state machines running in parallel**. The **C++ FSM** owns *gameplay* state (idling, walking, jogging, crouching). The **AnimGraph state machine** owns *visual* state (Idle, Start, Cycle, Stop). 
They never reference each other: they talk only through `UPROPERTY` values on a custom `UAnimInstance`: each C++ state pushes parameters every tick, the AnimGraph reads them as a pure rendering layer.

The point of the split is that the two can be intentionally *out of sync* — the character can be logically "idle" in C++ while the AnimGraph is still playing a stop animation, which is exactly what a believable deceleration needs.

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

The character moves in any direction relative to where it faces (strafing, backpedalling, diagonals) with the camera driving orientation. Each tick the active state computes the signed angle between the actor's forward vector and its velocity on the ground plane. The dot product is symmetric (it can't tell left from right), so it's paired with the cross product's Z component and fed into `Atan2` for a full signed angle in [-180°, +180°], then bucketed into an `EOrientationDirection`.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-enum-orientation.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">On-screen debug: the orientation enum updating as the character moves around the camera.</p>

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>"Dot for magnitude, cross for sign, Atan2 for the full angle"</p>
</div>

---

## Input Intent vs Physical State

<div class="feature-badge-row">
  <span class="feature-badge">Enhanced Input</span>
  <span class="feature-badge">Frame-Accurate</span>
  <span class="feature-badge">Decoupled Triggers</span>
</div>

The recurring idea behind the whole stop pipeline: *what the player is asking for* versus *what the character is physically doing*. `bShouldMove` is **intent** read straight off the Enhanced Input bindings, so it flips false the exact frame the key is released, even while the character still has speed. `IsMoving()` is **physical state**, true while velocity is above a threshold.

The AnimGraph reacts to intent (Cycle → Stop fires on release, while there's still speed to spend); the C++ FSM reacts to physics (Walk → Idle only once movement actually stops). Driving the stop off intent rather than velocity is what makes distance-matched deceleration possible at all.

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>My first attempt read the input vector from the movement component, which lags a few frames behind the key release. Debugging it taught me to track intent at the binding itself, and never to trust a getter to be frame-accurate just because its name sounds like it should be...</p>
</div>

---

## Distance-Matched Stops

<div class="feature-badge-row">
  <span class="feature-badge">Distance Matching</span>
  <span class="feature-badge">Curve Modifier</span>
  <span class="feature-badge">Predicted Stop</span>
  <span class="feature-badge">Property Access</span>
</div>

Stop animations are synced to the character's physical deceleration, so the animation plays out in step with the slowdown instead of freezing on a frame. Each stop carries a **Distance curve** auto-generated by the **Distance Curve Modifier** (it reads the root motion and records how far there is left to travel at each frame). At runtime, `PredictGroundMovementStopLocation` predicts the stop point from current velocity and braking, and a **Distance Match To Target** node finds the frame whose curve value matches that distance.

The braking parameters feeding the prediction are read **live** through Property Access from the Character Movement Component and never copied into the Anim Instance, because each state swaps movement params on enter via a data asset and a cached copy would go stale instantly.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-distance-matching.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Distance-matched stops at different speeds: the foot always lands where the character decelerates to rest.</p>

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>The hardest bug here was a stale cache: I had copied the braking values from <code>NativeInitializeAnimation</code>, which runs once at startup before any state applies its data asset. Switching to a live read fixed it and taught me the difference between caching a pointer (safe) and caching a value that changes at runtime (a trap).</p>
</div>

---

## Animation Warping & Lean

<div class="feature-badge-row">
  <span class="feature-badge">Orientation Warping</span>
  <span class="feature-badge">Stride Warping</span>
  <span class="feature-badge">Additive Lean</span>
  <span class="feature-badge">Blend Space</span>
</div>

Three warping layers sit on top of the base poses. **Orientation Warping** rotates the lower body to line the legs up with the real direction of travel while the upper body stays facing forward, driven by the same signed angle the orientation system computes. **Stride Warping** scales stride length to the character's real speed, but runs **only inside the Movement Cycle**, because the rapidly changing velocity during a stop made the stride scale jump frame to frame. **Lean** is an additive layer driven by yaw rate (`LeanAngle` computed in C++, fed into a spring-smoothed `BS_Leans`), also Cycle-only.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-locomotion-warping.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Orientation warping and lean reacting to direction and turn rate during a movement cycle.</p>

---

## Gait & Posture Transitions

<div class="feature-badge-row">
  <span class="feature-badge">Notify-Driven</span>
  <span class="feature-badge">Bool Guards</span>
  <span class="feature-badge">Data Assets</span>
  <span class="feature-badge">Trimmed Clips</span>
</div>

Two toggle systems share one pattern: a transition animation plays, and a guard bool blocks re-triggering until it finishes. **Walk ↔ Jog** uses an AnimNotify near the end of the clip: thanks to Unreal's magic naming (`AnimNotify_<Name>`), the matching C++ function fires automatically and clears the guard. The clips were trimmed of their lead-in so the visual shift lines up with the exact frame the movement params swap in C++. **Stand ↔ Crouch** follows the same idea with an AnimNotifyState and a consume-once bool.

Each state's movement parameters (max speed, braking, friction) live in a `ULocomotionDataAsset` applied on `OnEnterState`, so they're tunable from the editor without recompiling.

<div class="gallery gallery--single">
  <video src="/assets/video/ue5-gait-transitions-walk-jog.mp4" autoplay muted loop playsinline></video>
  <video src="/assets/video/ue5-gait-transitions-crouch-stand.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Walk-to-jog and stand-to-crouch: the guard bool blocks re-triggering mid-clip, keeping each change clean.</p>

---

## Refactoring for Scale: a Shared Locomotion Base

<div class="feature-badge-row">
  <span class="feature-badge">Class Hierarchy</span>
  <span class="feature-badge">Shared Behaviour</span>
  <span class="feature-badge">Pooled States</span>
  <span class="feature-badge">OOP</span>
</div>

Once Idle, Walk and Jog all worked, they'd accumulated the same duplicated logic: orientation, input edges, transition guards. I pulled it into an intermediate `ULocomotionState`, sitting between `UPlayerBaseState` and the concrete states. The rule that drove the split: this logic is shared only among *grounded locomotion* states. Putting it on `UPlayerBaseState` would have leaked it onto other states that don't care (Jump, Fall, Climb). It's the reason an intermediate class exists: shared behaviour among a *subset* of subclasses.

```
UPlayerBaseState
 ├── ULocomotionState      ← shared locomotion logic
 │    ├── UIdleState
 │    ├── UWalkState
 │    └── UJogState
 ├── UJumpState            ← non-locomotion states stay direct children
 └── UFallState
```

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>The subtle bug that followed taught me more than the refactor itself. The smoothed direction vector lived as a member on the base class, but FSM states are <em>pooled</em> (one instance each in a <code>TMap</code>), so Idle, Walk and Jog each had their own copy. A direction smoothed in Idle was already stale by the time Walk read it, glitching everything. Inheritance shares the <em>declaration</em>, not the <em>storage</em>. The fix was to move the shared buffer onto the AnimInstance.</p>
</div>

---

## Talking Back: AnimGraph → C++ Sync

<div class="feature-badge-row">
  <span class="feature-badge">Thread-Safe Functions</span>
  <span class="feature-badge">Reset-then-Set</span>
  <span class="feature-badge">Watchdogs</span>
  <span class="feature-badge">Consume-Once</span>
</div>

Until now data flowed one way: C++ pushes, the AnimGraph reads. Some decisions need the reverse: C++ has to know *which* AnimGraph state is live. I added flags like `bAnimGraphInIdle` and `bAnimInMovStop`, set by thread-safe anim node functions on state entry/exit. The robust variant is **reset-then-set**: clear both at the top of the thread-safe update, then each state raises its own flag on update. Because the update runs before the graph is evaluated, the flags are recomputed every frame and can't get stuck if an exit is missed on an interrupted transition.

This unlocked a few things that were previously misbehaving. The turn-in-place footwork lives *inside* the AnimGraph's Idle state, so C++ now accumulates `RootYawOffset` always but only arms the turn trigger when `bAnimGraphInIdle`, otherwise the actor would rotate with no footwork while a stop was still playing. Guarded transitions (walk↔jog, crouch↔stand) are cleared by an AnimNotify at the end of the clip, with a timestamp **watchdog** in the base tick as a fallback if the notify is ever missed.

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>The crouch/stand in-place animation is only reachable from Idle or Movement Stop, so arming its trigger mid-cycle left it to be consumed later at the wrong moment, firing the transition unexpectedly. The fix was a gate: only arm the flag where it's certain to be consumed shortly; otherwise just switch state. "</p>
</div>

---

## Awareness Stances & the Input Pipeline

<div class="feature-badge-row">
  <span class="feature-badge">Player Controller</span>
  <span class="feature-badge">Stance Modes</span>
  <span class="feature-badge">Device Detection</span>
  <span class="feature-badge">Hold-to-Jog</span>
</div>

An **awareness stance** (Normal / Alert) it's a policy that reconfigures how input maps to gait: in Normal the stick walks and holding RB jogs; in Alert the stick *magnitude* picks walk vs jog (crossing 90%) and holding RB sprints. Keeping them separate is what makes the system extensible (Spotted, NormalRelaxed… later).

Stance is *gameplay* state, so it lives on the **Character**, not the controller. It survives controller changes and will eventually be driven by enemy perception (the player is *set* to Alert when seen). Alongside it, I moved movement and look input off the Character onto a custom `APlayerController`. The pawn is cached in `OnPossess` ( not `BeginPlay`, where possession order isn't guaranteed and a cached pointer goes stale on respawn) and cleared in `OnUnPossess`.


<div class="gallery gallery--single">
  <video src="/assets/video/ue5-stance-alert-gait.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Alert stance on gamepad: stick magnitude selects walk vs jog at two fixed speeds and holding RB / R1 makes you run; Normal uses hold RB / R1 to jog.</p>

A few decisions made this clean. The Alert analog selector only makes sense on a thumbstick, so device detection (gamepad vs keyboard/mouse) is event-driven via `UInputDeviceSubsystem`, which tracks the most-recently-used device. And because real sticks have **round gates**, a fully-pushed stick reads ~1.0 in every direction, so the whole jog selector is just `MovementVector.Size() >= 0.9`, with no diagonal special-casing. Gait itself is driven by one desired-gait flag, `bIsJogging`. Converting jog from toggle to hold then just became write the flag on press/release.

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>Two real lessons. First, solve input shaping in the input config, not in code: hold-to-jog kept breaking because the Input Action had a <code>Pressed</code> trigger. Removing the trigger entirely makes the action behave as Down, which is exactly what a hold needs. Second, the sharpest example of intent vs physics in the whole project: in Alert the stop animation was always the <em>walk</em> stop, even from a jog. The stop gait was frozen from intent (<code>bMovStopJogging = bIsJogging</code>), but releasing the stick passes through the walk zone on the way to zero, so by the capture frame the flag had already flipped. The stop is a <em>physical</em> event: at release the input is zero but velocity isn't (braking hasn't started yet), so capturing the gait from velocity against a fixed threshold fixed it for every case.</p>
</div>

---

## Recentering on Diagonal Stops

<div class="feature-badge-row">
  <span class="feature-badge">Orientation Warping</span>
  <span class="feature-badge">Decision Freeze</span>
  <span class="feature-badge">Cone Geometry</span>
  <span class="feature-badge">Step Animation</span>
</div>

The stop animations are cardinal-only. Diagonal stops are synthesised at runtime by Orientation Warping rotating the lower body to face the real travel direction. But the Idle state has no warp, so on the `MovStop → Idle` transition the warp collapses from its diagonal value to zero across the cross-fade, and the legs visibly *swing around* the planted feet back to forward.

The fix is an intermediate `IdleRecentering` state that plays a small step animation to physically move the foot back to a neutral position before falling through to Idle. Instead of the legs snapping around, the recovery feels like a natural *step*.


<div class="gallery">
  <video src="/assets/video/ue5-recentering-after.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">The IdleRecentering state repositioning the foot cleanly.</p>

The whole system is driven by a single `bShouldRecenterIdle` bool set in C++ and read by the AnimGraph as a transition condition. The important detail is *when* it gets set: at the **input-release frame**, not when velocity reaches zero. At that moment `OrientationAngle` still has a clean, stable reading. Once the character starts decelerating the value gets noisy and unreliable, so the decision is made on good data and then frozen.

The condition itself is simple geometry. Diagonals that need recentering all fall inside the forward or backward movement cone (pure laterals have no warp offset to fix). I compute the angular distance from the nearest axis with `DistFromAxis = min(|angle|, 180 − |angle|)`, which means 45° and 135° both return 45. Recentering triggers when that value falls inside the band `[DiagonalRecenterMin, HalfAngle]`, with `DiagonalRecenterMin` exposed as a tunable parameter.

<!-- NEW MEDIA (optional) — a diagram of the cone geometry: forward/backward cones, the lateral gap, and the recentering band would make this section much clearer than a screenshot. (Claude offered to generate this as an SVG.) -->
<div class="gallery gallery--single">
  <img src="/assets/img/recentering-cone-geometry.svg" alt="Recentering cone geometry diagram">
</div>
<p class="gallery-caption">The cone geometry: forward / backward gaits, the lateral gap, and the recentering band between DiagonalRecenterMin and the cone half-angle.</p>

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>A good exception to a rule I'd been following by default. Normally the state that sets a flag is also responsible for clearing it. Here the flag is read by a <em>later</em> state's AnimGraph, so clearing it in Walk/Jog's exit would destroy it the same frame the transition tries to read it. The reset has to happen on the consumer's side: Idle's entry.</p>
</div>

---

## A Data-Driven Camera Plugin

<div class="feature-badge-row">
  <span class="feature-badge">Plugin Architecture</span>
  <span class="feature-badge">Mode Data Assets</span>
  <span class="feature-badge">Spring-Arm Blending</span>
  <span class="feature-badge">Procedural Lean</span>
</div>

The camera is an **over-the-shoulder** third-person rig, and like the FSM it's packaged as a **self-contained plugin** the game module plugs into. Every camera context (idle, walk, jog, crouch) is described by a **parameter data asset**: arm length, shoulder offset, field of view, lag and collision. A dedicated component holds those presets and applies them to the spring arm, so re-framing the camera for a new state is *data* tunable from the editor without touching C++.

The component caches the spring arm and camera once, then does its real work each tick. When the locomotion FSM changes state it hands the component a new target mode, and the component **eases toward it** instead of snapping: continuous values like arm length, offset and FOV are interpolated (`FInterpTo` for floats, `VInterpTo` for the vector offsets). The result is a camera that breathes between gaits, pulling a little wider and longer as the character speeds up, rather than cutting.

```
C++ FSM ──state change──> UVSCameraComponent ──applies preset──> Spring Arm + Camera
   │                          │
   │                          └── reads ──> UCameraModeDataAsset   (per-state preset)
   │
   └──── yaw-rate signal ────> UCameraModifier ──roll──> camera lean
```

On top of that sits a **procedural lean**, layered through a custom `UCameraModifier` that rolls the camera slightly into turns. The neat part is where the lean comes from: it reuses the **yaw-rate signal the FSM already computes** for the body lean. The same number that drives the additive `BS_Leans` on the mesh. One signal, two consumers: the body leans into the turn and the camera rolls with it because they read the same source rather than each measuring the turn separately.

<!-- NEW MEDIA — capture locally: gameplay showing (a) the framing shifting between walk and jog — arm length / FOV easing, not cutting — and (b) the camera rolling into a hard left and right turn. A walk→jog→stop loop plus a couple of sharp turns covers it. -->
<div class="gallery gallery--single">
  <video src="/assets/video/ue5-camera-modes.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">Camera modes blending between gaits, with the procedural lean rolling into turns.</p>

This keeps the dependency one-directional and clean: the FSM only ever **pushes signals** into the camera component and never reads back from it, so the camera stays fully decoupled from the gameplay code.

<div class="learned-box">
  <span class="learned-box__label">What this taught me</span>
  <p>A state change shouldn't <em>set</em> the camera, it should set a <em>target</em> the component eases toward every frame. Camera modes want continuous blending, not discrete switching. Once the data asset described the destination and the component owned the interpolation, the cuts disappeared.</p>
</div>

---

## What I'm Learning

This project is built incrementally, one system at a time, as a hands-on tour of Unreal's C++ ecosystem: plugin architecture, the reflection system, component-based separation, inheritance with virtual functions, and input through delegates. The locomotion layer pushed it further: sharing state between C++ and the AnimGraph without coupling them, the vector maths behind directional movement, distance matching against root-motion curves, and the constant battle between input intent and physical state.

Refactoring everything into a shared LocomotionState base class felt like the clean Unreal-style move. A bug made me realise the catch: inherited variables aren't shared. WalkState and IdleState each get their own separate instance of whatever LocomotionState declares. I knew this in theory, but seeing it breaking something in practice made it actually stick.

A lot of bugs came down to one question: is this an intent signal or a physics signal? Getting that wrong in the Alert stop meant the wrong animation played every time. I also got better at recognising when something was good enough for a vertical slice instead of over-polishing systems that didn't need it yet.

You can check the repository <a class="repo-link" href="https://github.com/ItalianJackWEIRD/VS_FSM/tree/sprint1/Camera_System" target="_blank" rel="noopener">here ↗</a>
