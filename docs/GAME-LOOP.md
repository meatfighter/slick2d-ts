# Build a Visibility-Aware Fixed-Timestep Game Loop

Build a framework-independent TypeScript game-loop library that separates **simulation updates** from **rendering**.

The loop must:

* Update gameplay at a fixed rate, such as 60 updates per second.
* Render at the browser’s available animation-frame cadence.
* Perform multiple fixed updates before a render when the simulation falls behind.
* Avoid unbounded catch-up work after a long interruption.
* Pause safely when the document becomes hidden.
* Resume without treating hidden time as simulation debt.
* Support interpolation between simulation states.
* Expose overloads, dropped time, pauses, and timing discontinuities through diagnostics.
* Remain testable without a real browser clock.

## Verify the reference algorithm

The reference mechanism uses:

```ts
const updatesPerSecond = 60;
const millisecondsPerUpdate = 1000 / updatesPerSecond;

let previousTime: number;
let accumulatedLag: number;
```

On every animation callback, it draws once, measures elapsed time with `performance.now()`, adds that elapsed time to an accumulator, and repeatedly calls `update()` while at least one fixed update interval remains. This correctly implements the core **fixed-timestep accumulator** pattern. 

Its timing calculation is valid:

```ts
const fixedStepMs = 1000 / 60;
```

At 60 updates per second, each simulation update represents approximately 16.667 milliseconds. `performance.now()` also provides an appropriate monotonic clock that does not move backward because of ordinary system-clock corrections. ([W3C GitHub][1])

The algorithm nevertheless needs several changes before using it as a production library:

1. Its catch-up loop has no upper bound. A long suspension could cause hundreds or thousands of updates in one callback.
2. It draws before catching up. The newly updated state does not appear until the next callback.
3. It uses a fresh `performance.now()` call instead of the timestamp supplied to the animation-frame callback.
4. It has no visibility or suspension handling.
5. It has no interpolation between fixed simulation states.
6. It describes `requestAnimationFrame()` as approximately 60 calls per second, but the web API does not promise a 60 Hz cadence.
7. It always invokes one draw per callback. What it skips are the intermediate renders between multiple updates, rather than explicitly skipping the callback’s draw.
8. It does not protect against the “spiral of death,” in which catch-up updates themselves take so long that the loop falls farther behind.

The source also acknowledges that a faster rendering cadence can draw the same simulation state more than once and intentionally omits render interpolation. 

Preserve the accumulator concept, but replace the operational details described below.

# Define the simulation model

The game must have one fixed simulation interval:

```ts
const fixedStepSeconds = 1 / updateRateHz;
const fixedStepMs = 1000 / updateRateHz;
```

Use seconds in gameplay-facing APIs:

```ts
game.update(1 / 60);
```

Use milliseconds only at the browser scheduling boundary.

All ordinary gameplay systems must advance by exactly one fixed step per update:

```ts
interface GameLoopClient {
  update(stepSeconds: number, tick: number): void;
  render(interpolation: number): void;
}
```

Do not pass one arbitrarily large elapsed duration to `update()` after a stall. Large variable steps cause unstable movement, collision tunneling, animation jumps, and inconsistent gameplay behavior.

A fixed step improves repeatability, but do not claim that it alone guarantees cross-platform determinism. Randomness, floating-point behavior, asynchronous events, input timing, and external state must also be controlled for deterministic replays or lockstep networking.

# Use the animation-frame timestamp

Call `requestAnimationFrame()` once for each desired browser frame and use the timestamp passed into its callback.

The HTML Standard defines animation-frame callbacks as one-shot registrations. Each callback is removed when invoked and receives the browser-provided animation timestamp. The loop must therefore request another frame explicitly. ([HTML Living Standard][2])

Use this shape:

```ts
private onAnimationFrame = (timestampMs: number): void => {
  // Process this frame.

  if (this.shouldContinueRunning()) {
    this.frameHandle = this.frameDriver.request(this.onAnimationFrame);
  }
};
```

Prefer scheduling the next callback at the end of processing. This makes stopping, exceptions, and state transitions easier to reason about.

Do not assume the callback cadence equals the simulation rate. The loop must behave correctly under all of these cases:

```text
Rendering at 120 Hz, simulation at 60 Hz:
Some renders occur without a simulation update.

Rendering at 60 Hz, simulation at 60 Hz:
Usually one update occurs per render.

Rendering at 30 Hz, simulation at 60 Hz:
Usually two updates occur before each render.

Temporary stall:
Several updates may occur before one render.

Extended interruption:
The loop abandons excessive timing debt rather than processing it indefinitely.
```

# Implement the frame algorithm

Use this processing order:

```text
1. Receive the animation-frame timestamp.
2. Calculate elapsed real time.
3. Detect timing discontinuities.
4. Add acceptable elapsed time to the accumulator.
5. Run bounded fixed updates.
6. Handle any remaining excessive backlog.
7. Render the latest state once.
8. Request the next animation frame.
```

The core implementation should resemble:

```ts
private processFrame(timestampMs: number): void {
  if (!this.isActivelyRunning()) {
    return;
  }

  if (this.previousTimestampMs === undefined) {
    this.previousTimestampMs = timestampMs;
    this.client.render(0);
    this.scheduleNextFrame();
    return;
  }

  const rawElapsedMs =
    timestampMs - this.previousTimestampMs;

  this.previousTimestampMs = timestampMs;

  if (!Number.isFinite(rawElapsedMs) || rawElapsedMs < 0) {
    this.resetTiming("invalid-timestamp");
    this.client.render(0);
    this.scheduleNextFrame();
    return;
  }

  if (rawElapsedMs >= this.options.discontinuityThresholdMs) {
    this.resetTiming("long-discontinuity", rawElapsedMs);
    this.client.render(0);
    this.scheduleNextFrame();
    return;
  }

  const acceptedElapsedMs = Math.min(
    rawElapsedMs,
    this.options.maximumFrameDeltaMs,
  );

  this.accumulatorMs += acceptedElapsedMs;

  let updates = 0;

  while (
    this.accumulatorMs >= this.fixedStepMs &&
    updates < this.options.maximumUpdatesPerFrame
  ) {
    this.client.update(
      this.fixedStepMs / 1000,
      this.tick,
    );

    this.tick += 1;
    this.accumulatorMs -= this.fixedStepMs;
    updates += 1;

    if (!this.isActivelyRunning()) {
      return;
    }
  }

  if (this.accumulatorMs >= this.fixedStepMs) {
    this.handleExcessiveBacklog(updates);
  }

  if (!this.isActivelyRunning()) {
    return;
  }

  const interpolation =
    this.accumulatorMs / this.fixedStepMs;

  this.client.render(interpolation);
  this.scheduleNextFrame();
}
```

Always perform updates before rendering. The render then depicts the newest simulated state rather than the state from before catch-up.

Rendering must occur only once per animation callback, regardless of the number of updates performed.

# Bound catch-up work

Never permit this loop to run without a limit:

```ts
while (accumulator >= fixedStep) {
  update();
}
```

It can freeze the page after:

* A hidden tab resumes.
* A debugger suspends execution.
* The device wakes from sleep.
* Garbage collection causes a long pause.
* Another main-thread task blocks execution.
* Updates consistently take longer than the fixed interval.

Add both:

```ts
maximumFrameDeltaMs
maximumUpdatesPerFrame
```

Suggested initial defaults are:

```ts
const defaults = {
  updateRateHz: 60,
  maximumFrameDeltaMs: 250,
  maximumUpdatesPerFrame: 5,
  discontinuityThresholdMs: 1000,
};
```

Keep them configurable. Five updates at 60 Hz allow about 83 milliseconds of simulation catch-up in one animation callback.

The two limits have distinct roles:

* `maximumFrameDeltaMs` prevents one callback from adding an enormous amount of elapsed time.
* `maximumUpdatesPerFrame` prevents simulation processing from monopolizing the main thread.

# Handle excessive backlog deliberately

When the maximum update count has been reached but at least one complete update remains in the accumulator, the loop has entered overload.

Do not reset the game world. Reset or reduce only the **timing debt**.

The recommended default policy is:

```ts
private discardWholeBacklogSteps(): number {
  const retainedMs =
    this.accumulatorMs % this.fixedStepMs;

  const discardedMs =
    this.accumulatorMs - retainedMs;

  this.accumulatorMs = retainedMs;
  return discardedMs;
}
```

Using the remainder preserves the fractional position between ticks while discarding old complete ticks that the loop can no longer process usefully.

For example:

```text
Accumulator: 74 ms
Fixed step: 16.667 ms

Complete overdue steps: 4
Fractional remainder: about 7.3 ms
```

After abandoning the overdue updates, retain approximately 7.3 milliseconds for interpolation.

Resetting the accumulator completely to zero is also safe, but introduces a larger timing discontinuity. Use a complete reset for:

* Resuming from a hidden tab
* Resuming after system suspension
* A very large timestamp discontinuity
* Reinitializing or changing scenes
* Recovering from an explicitly acknowledged timing fault

Do not try to “make up” ten hidden seconds by running 600 updates.

## Support configurable overload policies

Provide:

```ts
export type BacklogPolicy =
  | "discard"
  | "pause"
  | "stop"
  | "preserve";
```

Interpret them as follows:

### `discard`

Discard complete overdue steps, retain the fractional remainder, and continue.

This should be the default for ordinary single-player browser games.

### `pause`

Pause the game and notify the host that the simulation cannot keep up.

This may suit editors, simulations, or games where silently dropping simulation time would be misleading.

### `stop`

Stop the loop with a structured overload error.

Use this for testing or strict simulation modes.

### `preserve`

Leave the accumulator intact and continue catching up over future callbacks.

Use this only when every simulation tick must execute. It risks permanent slow motion or repeated overload and should not serve as the general default.

For deterministic lockstep or authoritative multiplayer systems, do not discard required simulation ticks casually. Pause and resynchronize with the authoritative state instead.

# Distinguish skipped renders from dropped simulation time

Use precise terminology.

When the loop executes three updates and then one render:

```text
update tick 100
update tick 101
update tick 102
render state near tick 102
```

It has skipped the intermediate renders for ticks 100 and 101, but it has not skipped their simulation updates.

When the backlog limit is exceeded and old accumulator time is discarded, the loop has dropped simulation time. This represents a different and more consequential event.

Track these separately:

```ts
interface FrameStatistics {
  updatesExecuted: number;
  intermediateRendersSkipped: number;
  simulationTimeDiscardedMs: number;
}
```

# Add optional explicit render skipping

Rendering may itself consume enough time to prevent recovery.

Provide an optional strategy that skips rendering when the update budget has been saturated:

```ts
export interface RenderSkippingOptions {
  readonly skipRenderWhenSaturated: boolean;
  readonly maximumConsecutiveRenderSkips: number;
}
```

Example behavior:

```text
Frame 1:
Run maximum catch-up updates.
Backlog remains.
Skip render.

Frame 2:
Run catch-up updates.
Backlog remains.
Skip render.

Frame 3:
Render even if overloaded, because the maximum render-skip count was reached.
```

Do not allow rendering to disappear indefinitely. User feedback must continue even under degradation.

Before skipping whole renders, prefer reducing optional visual work:

* Particle counts
* Shadow quality
* Postprocessing
* Render resolution
* Decorative animation
* Nonessential effects

Do not dynamically enlarge the fixed simulation step merely to improve performance unless the game explicitly supports a variable simulation rate.

# Pause when the document becomes hidden

Add a browser visibility adapter based on:

```ts
document.visibilityState
document.hidden
document.addEventListener("visibilitychange", ...)
```

The HTML Standard exposes `visible` and `hidden` document states and fires `visibilitychange` when the state changes. It specifically associates background tabs and minimized windows with page visibility. ([HTML Living Standard][3])

Browser callbacks may be throttled or frozen while a context is backgrounded, while the monotonic clock continues to represent elapsed time accurately. Without explicit handling, the first callback after returning may appear to contain a very large elapsed duration. ([W3C GitHub][1])

Use:

```ts
document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
      loop.pause("visibility");
    } else {
      loop.resume("visibility", {
        resetTiming: true,
      });
    }
  },
);
```

On visibility pause:

1. Cancel the pending animation-frame callback.
2. Record that the loop had been running.
3. Add the visibility pause reason.
4. Clear or preserve the accumulator according to policy.
5. Reset the previous timestamp.
6. Notify the game client.
7. Clear transient input events.
8. Consider pausing audio through a separate host callback.

On visibility resume:

1. Remove the visibility pause reason.
2. Do not resume if another pause reason remains.
3. Reset the previous timestamp.
4. Reset the accumulator by default.
5. Schedule a fresh animation frame.
6. Do not count hidden time as simulation elapsed time.
7. Notify the client that a resynchronization may be needed.

# Support multiple pause reasons

A boolean `paused` flag is insufficient.

The user may manually pause the game and then switch tabs. Returning to the tab must not accidentally undo the manual pause.

Track pause reasons:

```ts
export type PauseReason =
  | "manual"
  | "visibility"
  | "modal"
  | "context-lost"
  | "system"
  | "overload";

private readonly pauseReasons =
  new Set<PauseReason>();
```

Implement:

```ts
pause(reason: PauseReason): void {
  const wasActive = this.isActivelyRunning();

  this.pauseReasons.add(reason);

  if (wasActive) {
    this.cancelScheduledFrame();
    this.previousTimestampMs = undefined;
    this.client.onPause?.(reason);
  }
}

resume(
  reason: PauseReason,
  options: { resetTiming?: boolean } = {},
): void {
  this.pauseReasons.delete(reason);

  if (options.resetTiming) {
    this.accumulatorMs = 0;
    this.previousTimestampMs = undefined;
  }

  if (
    this.runRequested &&
    this.pauseReasons.size === 0
  ) {
    this.client.onResume?.(reason);
    this.scheduleNextFrame();
  }
}
```

Only resume simulation when the pause-reason set becomes empty.

# Define hidden-page behavior as a policy

Pausing represents the correct default for ordinary local games, but not every application has the same semantics.

Provide:

```ts
export type HiddenPagePolicy =
  | "pause"
  | "stop-rendering"
  | "continue"
  | "host-controlled";
```

### `pause`

Stop updates and renders. Resume with a fresh clock.

### `stop-rendering`

Stop rendering, but permit a separate background service to continue selected work.

Do not rely on animation-frame callbacks for reliable background simulation.

### `continue`

Permit the host to use an alternate scheduler. This mode requires explicit acknowledgement that browsers may throttle background execution.

### `host-controlled`

Emit visibility events and let the application decide.

For server-authoritative multiplayer games, a useful design is:

```text
While hidden:
Pause local rendering and predictive simulation.
Keep only necessary network coordination alive.

When visible:
Obtain the latest authoritative snapshot.
Replace or reconcile local state.
Reset the loop’s accumulator and timestamp.
Resume rendering.
```

Do not run thousands of local physics updates to reconstruct hidden time.

For games with offline progression, calculate wall-clock progression in a separate domain system:

```ts
progression.applyOfflineDuration(hiddenDuration);
```

Do not feed that duration into the fixed physics loop.

# Add render interpolation

Fixed updates and rendering callbacks will not always align.

Maintain a previous and current simulation state:

```ts
previousState = currentState;
currentState = simulate(currentState, fixedStep);
```

After updates, compute:

```ts
const interpolation =
  accumulatorMs / fixedStepMs;
```

Pass a value in `[0, 1)` to rendering:

```ts
render(interpolation);
```

Interpolate visual properties:

```ts
const displayedX =
  previousX +
  (currentX - previousX) * interpolation;
```

Do not mutate authoritative simulation state during interpolation.

Interpolate values such as:

* Position
* Rotation
* Camera location
* Scale
* Visual animation parameters

Do not blindly interpolate discrete values such as:

* Health-state transitions
* Inventory membership
* Collision flags
* Scene changes
* Object creation and destruction

Those require domain-specific rendering rules.

After a clock reset, scene change, teleport, or authoritative correction, set the previous state equal to the current state so interpolation does not create an unwanted sweep from the old position.

# Integrate input correctly

Catch-up updates create input concerns.

A key held down may legitimately affect every fixed update:

```ts
if (input.isHeld("ArrowRight")) {
  player.moveRight(stepSeconds);
}
```

A one-shot event must not fire repeatedly across all catch-up updates:

```ts
if (input.consumePressed("Space")) {
  player.jump();
}
```

Design input around:

```text
Continuous state:
held keys, pointer position, gamepad axes

Edge events:
pressed, released, clicked, wheel movement
```

Queue edge events and consume each event once.

For stricter deterministic simulation, timestamp input events and assign each event to the first simulation tick whose simulated time reaches that event.

When visibility changes to hidden, clear held-key state or resynchronize it on resume. Otherwise, a missed key-release event can leave a control apparently stuck.

# Manage scene transitions safely

A scene transition may occur during `update()`.

After every update, check whether the loop remains active:

```ts
client.update(stepSeconds, tick);

if (!isActivelyRunning()) {
  return;
}
```

If the update stopped the loop or initiated a scene transition:

* Do not render the old scene again.
* Do not schedule another callback for the old loop generation.
* Reset timing before the new scene begins.
* Clear interpolation history.
* Clear transient input events.
* Ensure an old scheduled callback cannot affect the new scene.

Use a generation identifier:

```ts
private generation = 0;

start(): void {
  this.generation += 1;
  const generation = this.generation;

  this.frameHandle = this.frameDriver.request(
    (timestamp) => {
      if (generation !== this.generation) {
        return;
      }

      this.processFrame(timestamp);
    },
  );
}
```

# Add a complete state machine

Model lifecycle explicitly:

```ts
export type GameLoopState =
  | "idle"
  | "running"
  | "paused"
  | "stopped"
  | "disposed";
```

Required rules:

```text
idle → running
running → paused
paused → running
running → stopped
paused → stopped
stopped → running, when restart is supported
any non-disposed state → disposed
```

Reject or safely ignore invalid operations:

* Starting an already running loop
* Scheduling two animation callbacks
* Resuming without a matching pause reason
* Updating after disposal
* Stopping twice
* Disposing during an already active disposal

Never allow more than one outstanding animation-frame request per loop instance.

# Define the public API

Use an interface resembling:

```ts
export interface GameLoopOptions {
  readonly updateRateHz?: number;
  readonly maximumFrameDeltaMs?: number;
  readonly maximumUpdatesPerFrame?: number;
  readonly discontinuityThresholdMs?: number;

  readonly backlogPolicy?: BacklogPolicy;
  readonly hiddenPagePolicy?: HiddenPagePolicy;

  readonly interpolate?: boolean;
  readonly skipRenderWhenSaturated?: boolean;
  readonly maximumConsecutiveRenderSkips?: number;

  readonly pauseWhenHidden?: boolean;
}

export interface GameLoopClient {
  update(stepSeconds: number, tick: number): void;
  render(interpolation: number): void;

  onPause?(reason: PauseReason): void;
  onResume?(reason: PauseReason): void;

  onTimingDiscontinuity?(
    event: TimingDiscontinuityEvent,
  ): void;

  onOverload?(
    event: GameLoopOverloadEvent,
  ): void;

  onError?(error: unknown): void;
}

export interface GameLoop {
  readonly state: GameLoopState;
  readonly tick: number;

  start(): void;
  stop(): void;

  pause(reason?: PauseReason): void;
  resume(reason?: PauseReason): void;

  stepOnce?(): void;
  dispose(): void;
}
```

A manual `stepOnce()` operation is useful for debugging editors and paused simulations. It should execute exactly one fixed update and optionally render afterward.

# Inject browser dependencies

Do not hard-code global browser functions inside the core loop.

Define:

```ts
export interface AnimationFrameDriver {
  request(
    callback: (timestampMs: number) => void,
  ): number;

  cancel(handle: number): void;
}

export interface VisibilitySource {
  readonly hidden: boolean;

  subscribe(
    listener: (hidden: boolean) => void,
  ): () => void;
}
```

Provide browser adapters:

```ts
export class BrowserAnimationFrameDriver
  implements AnimationFrameDriver {
  request(
    callback: (timestampMs: number) => void,
  ): number {
    return window.requestAnimationFrame(callback);
  }

  cancel(handle: number): void {
    window.cancelAnimationFrame(handle);
  }
}
```

The core loop should work with fake drivers in tests and with alternate drivers in supported worker environments.

# Handle errors defensively

Wrap client callbacks:

```ts
try {
  client.update(stepSeconds, tick);
} catch (error: unknown) {
  stopAfterFailure(error, "update");
  return;
}
```

Do the same for rendering.

On an unhandled client error:

1. Cancel the pending frame.
2. Stop the loop.
3. Clear timing state.
4. Emit a structured error.
5. Do not continue calling the faulty client every frame.
6. Preserve the original cause.

Use:

```ts
export type GameLoopFailurePhase =
  | "update"
  | "render"
  | "visibility"
  | "scheduler"
  | "timing";
```

# Detect sustained overload

A single saturated frame may result from an ordinary transient pause. Repeated saturation indicates that the application cannot sustain its configured update rate.

Track:

```ts
consecutiveSaturatedFrames
totalSaturatedFrames
totalDiscardedSimulationMs
maximumObservedUpdatesPerFrame
```

Emit an overload event after a configurable threshold:

```ts
interface GameLoopOverloadEvent {
  readonly consecutiveFrames: number;
  readonly accumulatorBeforeDiscardMs: number;
  readonly discardedSimulationMs: number;
  readonly updatesExecuted: number;
}
```

Allow the host to respond by:

* Reducing visual quality
* Disabling optional effects
* Reducing active entity counts
* Moving suitable work to a worker
* Pausing the simulation
* Showing a performance warning
* Requesting a state resynchronization

Do not silently alter simulation rules in response to overload.

# Add diagnostics

Expose a read-only snapshot:

```ts
export interface GameLoopDiagnostics {
  readonly state: GameLoopState;
  readonly tick: number;

  readonly updateRateHz: number;
  readonly fixedStepMs: number;

  readonly accumulatorMs: number;
  readonly lastRawElapsedMs?: number;

  readonly updatesLastFrame: number;
  readonly rendersCompleted: number;
  readonly rendersSkipped: number;

  readonly droppedSimulationMs: number;
  readonly timingResetCount: number;
  readonly overloadCount: number;

  readonly pauseReasons: readonly PauseReason[];
}
```

Optional measurements may include update and render durations. Use them for diagnostics rather than simulation timing.

# Recommended default behavior after lost frames

Implement this decision sequence:

```text
Was the page deliberately hidden or paused?
    Yes:
        Reset previous timestamp and accumulator.
        Resume from current state.
        Do not catch up hidden time.

Was elapsed time above the discontinuity threshold?
    Yes:
        Reset timing debt.
        Keep game state.
        Emit a timing-discontinuity event.

Is elapsed time moderately large?
    Yes:
        Clamp the accepted elapsed duration.

Can the backlog be processed within the update limit?
    Yes:
        Run all required fixed updates.

Does backlog remain after the update limit?
    Yes:
        Apply the configured backlog policy.
        Default: discard complete overdue steps,
        retain the fractional remainder,
        and report the discarded time.
```

Do **not** reset all game state merely because frames were lost.

Reset:

* Previous timestamp
* Accumulator
* Interpolation history where necessary
* Transient input state

Preserve:

* Player state
* World state
* Current level
* Inventory
* Progress
* Simulation tick, unless restarting or resynchronizing

Replace world state only when an authoritative server, saved snapshot, or explicit recovery policy supplies a replacement.

# Required tests

Write deterministic tests using a fake animation-frame driver.

Test at least these scenarios:

1. At 60 Hz callbacks and 60 Hz updates, the loop performs approximately one update per rendered frame.
2. At 120 Hz callbacks, the loop does not update twice as fast.
3. At 30 Hz callbacks, the loop performs approximately two updates per render.
4. Multiple updates occur before one render after a short stall.
5. Rendering receives an interpolation value between zero and one.
6. The loop never exceeds `maximumUpdatesPerFrame`.
7. Excess complete backlog is discarded while its fractional remainder is retained.
8. A very large elapsed duration resets timing rather than running thousands of updates.
9. Hiding the page pauses the loop.
10. Returning after ten hidden seconds performs no catch-up burst.
11. A manual pause remains active after a hide-and-show cycle.
12. Releasing the visibility pause resumes a previously running game.
13. A stopped game does not resume merely because the page becomes visible.
14. One-shot input events fire once during a multi-update catch-up frame.
15. Held input affects every appropriate fixed update.
16. Stopping during `update()` prevents rendering and further scheduling.
17. An update exception stops the loop.
18. A render exception stops the loop.
19. No more than one animation-frame callback remains scheduled.
20. An old callback from a previous generation cannot update a restarted scene.
21. Sustained overload emits diagnostics.
22. Explicit render skipping never exceeds the configured consecutive limit.
23. Invalid or decreasing timestamps cause a timing reset.
24. Disposal removes visibility listeners and cancels scheduled frames.

# Suggested package structure

Package the mechanism independently:

```text
src/game-loop/
  GameLoop.ts
  GameLoopClient.ts
  GameLoopOptions.ts
  GameLoopDiagnostics.ts
  GameLoopErrors.ts
  GameLoopEvents.ts

  browser/
    BrowserAnimationFrameDriver.ts
    DocumentVisibilitySource.ts

  testing/
    FakeAnimationFrameDriver.ts
    FakeVisibilitySource.ts
```

The final design should follow this rule:

```text
The browser controls when rendering opportunities occur.

The game loop converts elapsed browser time into a bounded number
of fixed simulation ticks.

Rendering displays the newest simulation state once per available
frame, optionally interpolated.

Visibility changes and severe timing discontinuities reset timing
debt rather than forcing the game to replay unusable elapsed time.
```

That retains the sound part of the original mechanism—fixed updates with skipped intermediate renders—while addressing hidden tabs, variable displays, long stalls, overload, input edges, lifecycle races, and production-library concerns.

[1]: https://w3c.github.io/hr-time/ "High Resolution Time"
[2]: https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html "HTML Standard"
[3]: https://html.spec.whatwg.org/multipage/interaction.html "HTML Standard"
