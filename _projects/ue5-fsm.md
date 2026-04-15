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

## What I'm Learning

This project is being developed incrementally as a hands-on exercise in Unreal Engine's C++ ecosystem. The main things I've worked on so far: plugin architecture, Unreal's reflection system (`UPROPERTY`, `UFUNCTION`), component-based logic separation, class inheritance with virtual functions, input handling through delegates, and C++/AnimBP integration.

You can check the repository <a class="repo-link" href="https://github.com/ItalianJackWEIRD/VS_FSM/tree/sprint1/FSM" target="_blank" rel="noopener">here ↗</a>
