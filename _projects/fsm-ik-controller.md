---
layout: project
title: "Third-Person Controller with IK & Custom State Machine (2025)"
role: "Gameplay Programmer"
team: 1
duration: "2 Months"
tech: "Unity (C#), HDRP, IK System"
image: "/assets/img/projectx.png"
video: "/assets/video/projectx.mp4"
about: "A third-person action prototype in Unity HDRP focused on scalable gameplay architecture. I built a custom state machine and integrated Unity's IK system to handle dynamic character interactions with the environment, prioritizing systems that could grow without becoming spaghetti."
---

## Introduction

The main goal of this project was architectural: build a character controller I could actually extend. Unity's built-in Animator condition system works for small projects but becomes brittle fast. So I wrote my own FSM, then used IK on top of it to add environmental responsiveness.

## Custom State Machine

The FSM is generic and data-driven — states are plain C# classes, transitions are declared explicitly, and side effects are scoped to `OnEnter` / `OnExit` callbacks. This made it easy to add new states (crouch, ledge grab) without touching existing ones.

- States: Idle, Walk, Run, Jump, Fall, Land, Interact
- Transitions with conditions and priority ordering
- Blend tree integration for smooth animation crossfades

## Inverse Kinematics

Unity's IK pass runs *after* the animation graph, which is crucial — it means the base pose is fully computed before IK overrides it. I used this to align hands to surfaces, adjust foot placement on slopes, and drive interaction reach.

- Foot IK: raycasts per foot, smooth blend between planted and lifted
- Hand IK: target-driven for interactive objects in range
- Body lean: counter-rotation based on movement direction

<a class="repo-link" href="https://github.com/ItalianJackWEIRD" target="_blank" rel="noopener">View on GitHub ↗</a>
