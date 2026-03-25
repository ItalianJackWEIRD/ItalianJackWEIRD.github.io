---
layout: project
title: "Forest Runner (2023)"
role: "Gameplay Programmer / Game Designer"
team: 3
duration: "3 Months"
tech: "Unity (C#)"
video: "/assets/video/forest-runner-long.mp4"
image: "/assets/img/forest-runner.png"
about: "A mobile endless runner in Unity built in a team of three. My first time working on a mobile game end-to-end, from touch input and procedural tile generation to an in-game shop and a PlayFab-backed global leaderboard."
---

## Introduction

Forest Runner is a 3-lane 3D endless runner for mobile. It was built from scratch in three months, splitting systems across the team. I handled gameplay programming, level design, and game feel - everything except the login/registration UI.

The concepts here are fundamentals but working through them hands-on was the point.

## The Illusion of Movement

The player character doesn't actually move forward. The entire world translates toward the player every frame. This is a standard trick in endless runners: this keeps the player anchored near the world origin at all times, where floating-point precision is highest and keeps the player transform stable for physics and collision.

I had studied this pattern before starting the project, but discovering how to apply it directly in the game and really understanding why it works was one of the most satisfying parts.

## Procedural Tile System

The level is assembled from a pool of 13 gameplay tiles, spawned in batches of 3 as the world scrolls. I designed each tile by hand (sketched on paper, then built in engine) making sure every one connected seamlessly at its edges and had a valid set of adjacencies.

A few things the system handles:

- No two consecutive identical tiles (anti-repeat check before each spawn)
- Separate start tiles for the opening sequence
- Automatic destruction of tiles that scroll off screen
- Special shop tiles injected automatically every 500 points, replacing the normal batch

## Input & Movement

Input is handled by a custom `SwipeManager` that reads both touch and mouse, with a configurable dead zone to filter accidental swipes. The four directions (left, right, up, down) each map to a distinct action.

Movement uses a timer-based system (`CountdownTimer`) instead of manual boolean flags (cleaner state tracking for jump, slide, and strafe). The slide temporarily resizes the `CapsuleCollider` so the player can pass under obstacles. Jump uses a manual velocity + gravity scale rather than Unity's Rigidbody, which gave me finer control over the feel.

## Difficulty Curve

Speed scales continuously using `Mathf.Lerp` between 4 and 10 units/second as the score goes from 0 to 1500. After that it stays at max. It's a simple curve but it works: the acceleration is smooth enough that the player doesn't notice the moment things get harder.

## In-Game Shop

<div class="gallery gallery--single">
  <video src="/assets/video/forest-runner-shop.mp4" autoplay muted loop playsinline></video>
</div>
<p class="gallery-caption">The shop is meant as a "safe" place.</p>

Every 500 points, the normal tile stream is replaced by a shop sequence. The player can spend collected coins on four items: an extra life, a random power-up, a 40-second speed reduction, or a 40-second score multiplier. Each purchase goes through a confirmation popup, a small but deliberate UX choice to prevent accidental buys.

## Power-Up System

Three power-ups spawn randomly on tiles: a coin magnet, temporary invincibility, and a jump boost (which directly modifies the jump physics parameters). Each runs on a coroutine timer. If the same power-up is collected while already active, the timer resets rather than stacking.

## Backend - PlayFab

Login, registration and the global leaderboard are backed by Microsoft PlayFab via its Unity SDK. The authentication flow uses standard REST calls. I wasn't the one who integrated this, but I understand the pattern well enough (it's the same REST + token flow I've used in other contexts).

## What I'd Do Differently

The character animation system is rough: basic transitions, no blending, noticeable pops between states. I'd redo that entirely.

Beyond bugs, the game is shallow. I wanted to add secondary height paths (elevated platforms, underground corridors) and roaming enemies that force the player to react differently depending on lane. Neither made it in due to time. Both would have meaningfully changed the design.

The world-bend shader (the effect that curves the horizon, similar to Subway Surfers) was taken from an open-source shader; I didn't write it.

<a class="repo-link" href="https://github.com/ItalianJackWEIRD/ForestRunner/tree/Sapienza/FinaleHCI" target="_blank" rel="noopener">View on GitHub ↗</a>
 ---> Apk is outdated!
