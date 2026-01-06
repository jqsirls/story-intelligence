# Edge Cases — Concurrency

## A) Story creation library race

When creating a story without `libraryId`, the gateway:
- selects one library with `.limit(1).single()`
- if none, inserts `My Stories`

Concurrent creates can race and create multiple default libraries unless constrained by DB uniqueness.

## B) A2A task status races

A task create returns `submitted`, but async execution can transition to `working` immediately.

Clients must tolerate:
- `submitted` → `working` → `completed` without assuming stable intermediate states.

## C) SSE polling concurrency

SSE polling runs every 1 second per open stream. High concurrency can increase load.
