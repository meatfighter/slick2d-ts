# Compatibility Notes

`slick2d-ts` is a browser compatibility layer for selected Slick2D and LWJGL APIs. It keeps Java-style names and behavior where that makes sense for browser game ports, but it is not a full desktop runtime.

## Browser Runtime Boundaries

- Rendering uses WebGL2. If the browser loses and restores the WebGL context, GPU objects are recreated from retained decoded image data where possible. Framebuffer-backed render target contents are not preserved by the browser and must be redrawn by the game.
- The main loop is owned by `AppGameContainer` and browser `requestAnimationFrame`. Integer Slick `delta` values are derived from absolute high-resolution frame timestamps so fractional milliseconds carry into later frames instead of being discarded on every callback. `Display.update()` is intentionally a no-op for copied Java loops that still call it.
- Fullscreen, pointer lock, audio unlock, high-DPI backing stores, visibility throttling, and gamepad polling follow browser security and lifecycle rules.
- Keyboard, pointer, and wheel handlers update raw held state and enqueue primitive event data. Slick listener callbacks, event consumption, click detection, and `inputStarted()` / `inputEnded()` lifecycle callbacks run in stable listener snapshots during the next `Input.poll()`. Browser event timestamps are retained so delayed polling does not distort double-click timing.
- Browser gamepad slots are compacted into dense Slick controller numbers for each poll: usable tracked browser slots such as 0 and 3 are exposed as Slick controllers 0 and 1. The browser extension tracks at most 16 physical controller slots and at most 64 buttons per controller. Additional-axis calibration and logical controller ownership are fenced by physical slot, reported ID/mapping, and a connection-generation token so a same-index/same-ID replacement device cannot inherit the prior device's neutral baseline or one-shot edges. Ports can opt additional calibrated axis pairs into the four normal controller-direction controls through `Input.setAdditionalControllerDirectionAxes(...)`; those axes are sampled once during the normal input poll.
- Browser suspension clears game input without turning held controls into fresh actions later. After an actual `Input.pause()` → `Input.resume()` transition, browser focus/visibility recovery, a controller topology/ownership change, or a transient `navigator.getGamepads()` enumeration failure, the next successful controller sample establishes the current held-controller baseline without synthesizing one-shot `isControlPressed(...)` state or controller-pressed callbacks. `Input.getControllerSampleStatus()` exposes whether the latest sample was available/valid, whether it was baseline-only, and the topology generation; `sampleControllersForBaseline()` lets a browser port establish that baseline explicitly before resumed simulation reads raw levels. During an invalid enumeration sample the last valid controller levels are retained as uncertain state rather than converted into fake releases. Keyboard keys that were down, or became down while `Input` was paused, are quarantined until an actual `keyup` is observed because browsers expose no current physical-keyboard-state API. Releases and later fresh presses are reported normally.
- Browser-reserved keys or gestures may still be intercepted by the user agent. Keyboard, pointer, wheel, context-menu, and touch-action suppression follow browser focus and security rules.

## Global Audio Enable Flags Versus Logical Transport State

`SoundStore.setMusicOn(...)` and `SoundStore.setSoundsOn(...)` are application-wide logical enable preferences. They intentionally survive explicit PWA playback-generation retirement and `destroyPreservingAudioCache()`; replacing a browser `AudioContext` must not silently rewrite a user's or host application's Music/Sound policy.

Those flags are not substitutes for exact game transport state:

- Pause one logical track with `Music.pause()` / `Music.resume()`. A paused `Music` retains its exact transport position and remains paused across playback-generation replacement without changing `SoundStore.musicOn()`.
- Persist individual Music transport state with `Music.capturePlaybackState()` / `restorePlaybackState(...)`.
- Persist short-effect voices with `Sound.capturePlaybackState()` / `restorePlaybackState(...)`.
- `setSoundsOn(false)` prevents new Sound starts but is deliberately non-retroactive to already-live logical voices, so the flag cannot describe the complete state of existing effects.
- Game-state serializers should not save these application-wide flags merely to encode a gameplay pause or exact logical audio state. A host with real Music/Sound user preferences should persist them in its application/browser preference layer instead.

Playback-generation state remains a third, separate lifetime: browser `AudioContext`, native source/gain nodes, and generation identifiers are disposable physical resources and are never durable game state.

## Browser Sound Voice Persistence

These APIs and lifecycle rules extend Slick's short-effect `Sound` abstraction for browser PWAs while preserving its Java-facing play/stop behavior:

- Each successful `Sound.play(...)`, `Sound.playAt(...)`, or `Sound.loop(...)` invocation owns an independent logical effect voice. In explicit playback-generation mode, retiring a generation freezes and detaches those logical voices from disposable Web Audio nodes; a later accepted generation recreates the native source graphs and resumes each voice from its exact sample offset.
- Playback-generation retirement is not a stop operation. `Sound.stop()`, `SoundStore.stopSoundEffect(...)`, `SoundStore.stopSoundEffects()`, `SoundStore.stopAllPlayback()`, `clear()`, `destroy()`, and `disable()` remain destructive and permanently release the affected logical voices.
- `Sound.capturePlaybackState()` and `Sound.restorePlaybackState(...)` are browser persistence helpers analogous to `Music` playback snapshots. Their data contains logical voice properties only: loop state, playback rate, sample position, effective per-voice gain, optional spatial coordinates, and which voice is the `Sound` object's latest/active voice. Browser `AudioContext`, source/gain/panner nodes, playback-generation identifiers, and source-slot identifiers are never persisted.
- Multiple overlapping voices belonging to one `Sound` are captured independently. For Slick compatibility, `Sound.playing()` and `Sound.stop()` still refer only to that `Sound` object's latest remembered voice; an older overlapping voice may remain alive even when `Sound.playing()` returns `false`.
- A newly requested sound effect still requires a viable committed playback generation. Logical persistence does not turn a failed new `play()` request into a silent voice. Existing detached/restored voices can, however, advance on the accepted logical game clock if gameplay is deliberately continuing in silent-audio mode.
- `PlaybackDiagnostics.effects` counts effect voices with a physical source attached to the current generation. `PlaybackDiagnostics.logicalEffects` counts live logical effect voices whether attached or detached. This keeps the PWA menu invariant observable: a retired generation can have zero physical effects while retaining logical voices for Continue.
- Sound-volume changes remain non-retroactive to already-created voices. A detached voice retains the effective gain it had when started and does not multiply the current global sound volume again when it is reattached.

## Browser Rendering Extensions

These APIs are available for browser ports that need whole-scene display treatments. They are not Java Slick2D APIs:

- `BufferedScalableGame`: renders the held game into one fixed-size framebuffer image and then presents that completed frame to the display. It defaults to nearest-neighbor presentation for existing behavior, and also supports linear presentation and pixel-perfect integer presentation through `BufferedScalingMode`. Presentation rectangles are calculated in physical backing-store pixels, snapped to physical-pixel boundaries, converted back to logical coordinates for drawing, and reused for input mapping. This avoids fractional per-sprite rasterization when a host page scales the canvas, but it is a browser-only wrapper rather than a Java Slick2D class.
- `Graphics.setColorInverted(...)` and `Graphics.isColorInverted()`: invert subsequent renderer draw calls until the next safe renderer reset or explicit clear through `setColorInverted(false)`.
- `Graphics.setMonochromePalette(...)`, `Graphics.clearMonochromePalette()`, and `Graphics.isMonochromePaletteEnabled()`: map rendered RGB luminance between two replacement colors while preserving the rendered alpha. Endpoint alpha values are ignored. Palette shaders are compiled lazily on first use, and callers should clear the palette with `try`/`finally` when applying it to a bounded render section.

## Browser Resource Extensions

These APIs make asynchronous browser loading explicit while retaining Java resource paths as logical keys:

- `ResourceLoader.preloadResources(...)` and `SoundStore.preloadAudioBuffers(...)` accept an optional `AbortSignal`, progress callback, and positive-integer `concurrency` limit. Omitting `concurrency` preserves the existing unbounded batch behavior.
- `ResourceLoader.setCacheVersionResolver(...)` assigns a cache-version query value independently for each logical Java resource ref. `setCacheBust(...)` remains the simpler mutually exclusive global-version mode.
- Batch preload calls wait for every operation started by the batch to settle before reporting a failure. This prevents a host Retry action from accidentally overlapping the previous batch.
- `ResourceLoadException` reports a stable failure `kind` (`resolution`, `network`, `http`, `abort`, or `decode`), loading `phase`, resource ref, resolved URL, and HTTP status when available.
- The default retry policy retries transient network conditions, HTTP 408/425/429, and server errors. Permanent client errors such as HTTP 404 fail immediately.

## Java Random State

`JavaRandom` implements the Java 48-bit LCG and exposes exact internal state through `getState()`, `setState(...)`, and `fromState(...)`. These are browser-port extensions intended for persistence, deterministic replays, and parity tests. Restoring an internal state bypasses the external-seed scrambling performed by Java's `setSeed(long)`.

## Approximate / Configuration-Only Compatibility

These APIs are present for Java source compatibility, and their requested values are stored or queried, but the browser runtime does not currently emulate the full desktop behavior behind them:

- `Input.enableKeyRepeat(initial, interval)`: enables native repeated browser `keydown` events. The timing arguments are retained for Java source compatibility but are intentionally ignored, matching the Slick version whose deprecated timing overload delegates to LWJGL's repeat-event switch.
- `InternalTextureLoader.setHoldTextureData(...)`, `InternalTextureLoader.setDeferredLoading(...)`, and `InternalTextureLoader.set16BitMode()`: values are stored/queryable, but browser image decoding, retained image data, texture upload, and texture storage continue to follow the WebGL renderer's normal path.
- `SoundStore.setDeferredLoading(...)`: the value is stored/queryable, but `Sound` and `Music` constructors still queue browser audio fetch/decode work through the current resource-loading path.

## Intentional Compatibility No-Ops

These methods exist so copied Java code can call familiar APIs without crashing, but the browser port does not currently emulate their desktop effects:

- `BasicGame` input callbacks: convenience empty listener methods.
- `BufferedScalableGame.renderOverlay(...)` and `ScalableGame.renderOverlay(...)`: protected extension hooks for subclasses.
- `Display.update()`: the RAF loop already advances rendering.
- `Display.setIcon(ByteBuffer[])`: byte-buffer window icons do not map directly to browser tabs. `AppGameContainer.setIcon(String)` can apply a favicon resource.
- `GameContainer.setCssCursor(...)`: base hook only; `AppGameContainer` applies canvas cursor CSS.
- `Graphics.destroy()`: graphics state is container-owned.
- `HumanInput.reset()`: the live input adapter has no playback cursor or buffered sequence to reset.
- `Image.clampTexture()`: WebGL texture wrapping is managed internally.
- `LoadableImageData.configureEdging(...)` for TGA data: retained for API shape.
- `Log.checkVerboseLogSetting()`: browser logging is controlled by host/runtime console settings.
- `RecordedInput.snap()`: recorded state is already selected by its current byte index; `update()` advances that index.
- `SGL.glClipPlane(...)`, `SGL.glTexEnvi(...)`, and `SGL.glSecondaryColor3ubEXT(...)`: fixed-function desktop OpenGL features with no WebGL2 equivalent in this 2D renderer.

## Raw WebGL Caveat

Images loaded through `Image`, `SpriteSheet`, and related Slick-style APIs can be recreated after context restoration. Raw compatibility textures created through low-level `SGL.glGenTextures(...)` are GPU-only and cannot be reconstructed automatically after context loss.

## Java Numeric Overload Boundaries

Java selects `Color(int, ...)` and `Color(float, ...)` overloads at compile time. JavaScript has only one numeric type, so legacy component constructor calls use tuple-wide inference: a fully integral tuple containing a component outside `[-1, 1]` is treated as byte components; otherwise it is treated as floating-point components. Use `Color.fromInts(...)` or `Color.fromFloats(...)` wherever the Java overload intent is ambiguous. Internal color arithmetic uses the explicit float path.

Slick2D's three-float constructor retains raw RGB values and supplies alpha 1. Its four-float constructor clamps only the upper bound to 1. `Color.fromFloats(...)` preserves that distinction. The copy constructor preserves exact mutable channel state, including values outside the nominal range.

## Shared Resource Cancellation

Resource and decoded-audio requests are deduplicated by Java resource reference. The first uncached caller's `AbortSignal` owns cancellation of the shared underlying fetch or decode. Later callers may cancel their own wait but do not replace that ownership. Aborting the first signal therefore rejects every caller sharing that in-flight request. Coordinated preload generations should use one shared controller.

## Browser Controller Calibration Lifetime

Additional direction-axis baselines belong to one physical browser connection lifetime, not merely to a reported controller name. The owner includes browser slot, reported ID/mapping, and the slot's connection generation; disconnect/reconnect events therefore invalidate calibration even when a replacement device reports the same ID at the same index. Axis indexes and thresholds are validated when configured.
