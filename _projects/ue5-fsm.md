---
layout: project
title: "Finite State Machine System for Unreal Engine 5 (Work in Progress)"
role: "Gameplay Programmer"
team: 1
duration: "Ongoing"
tech: "Unreal Engine 5, C++, Plugin Architecture"
video: "/assets/video/ue5-fsm.mp4"
image: "/assets/img/ue5-fsm.png"
about: "The system manages actor behaviour through a clean separation of concerns, exposing a StateManagerComponent attachable to any Actor. Each state is implemented as a C++ UObject class, with a corresponding Blueprint that inherits from it, allowing a clear separation between core logic and customizable behaviour."
---

## Overview

The system exposes a `UStateManagerComponent` attachable to any Actor, which handles state instantiation, lifecycle management (enter, tick, exit), transition logic, and runtime history tracking, all implemented through native C++ classes integrated via `UCLASS`, `UPROPERTY` and `UFUNCTION` macros.

States are defined via a `UStateBase` C++ class hierarchy: `PlayerBaseState` extends the base class to introduce player-specific references and input binding via delegates. Individual states are then derived from this intermediate layer.

This project is about learning how things work and how they are structured.

## Architecture

The system is split across two layers:

**• Plugin layer** (`FSM` plugin) — contains the base classes `UStateBase` and `UStateManagerComponent`. This layer is intentionally generic: it knows nothing about the specific project using it. `UStateManagerComponent` manages a `TMap<FString, TSubclassOf<UStateBase>>` populated from the editor Details Panel, instantiates states at runtime via `NewObject`, and routes lifecycle calls (`OnEnterState`, `TickState`, `OnExitState`) to the current active state.

**• Project layer** — contains `UPlayerBaseState`, an intermediate C++ class that inherits from `UStateBase` and adds player-specific logic. Concrete states like `IdleState` and `WalkState` inherit from `UPlayerBaseState`.

```
BP_IdleState
    ↓
UIdleState (C++ — project)
    ↓
UPlayerBaseState (C++ — project)
    ↓
UStateBase (C++ — plugin)
```

## State Lifecycle

Each state implements three virtual functions defined in `UStateBase`:

- `OnEnterState(AActor* Owner)`
- `TickState(float DeltaTime)`
- `OnExitState()`

The `UStateManagerComponent` controls the tick via a private `bCanTickState` flag, which is set to `false` during transitions to avoid ticking a state mid-switch.

## Editor Integration

States and the initial state are configured entirely from the Unreal Editor Details Panel, with no hardcoded references in C++.

`InitStateManager()` is exposed as a `BlueprintCallable` function and must be called manually from the owning Actor's `BeginPlay` in Blueprint, after the component has finished instantiating its states.

<div class="gallery">
  <img src="/assets/img/3rdPersonCharacterBP.png" alt="descrizione">
  <img src="/assets/img/debug-fsm.png" alt="descrizione">
</div>
<p class="gallery-caption">Third Person Character Blueprint and Debug view of the State Machine.</p>

## What I'm Learning

This project is being developed incrementally as a hands-on exercise in Unreal Engine's C++ ecosystem. The main things I learned are plugin architecture, Unreal's reflection systems (`UPROPERTY`, `UFUNCTION`), separating logic into components, basic class inheritance with virtual functions and handling input through delegates.

You can check the repository <a class="repo-link" href="https://github.com/ItalianJackWEIRD/VS_FSM/tree/sprint1/FSM" target="_blank" rel="noopener">here ↗</a>