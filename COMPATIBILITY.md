# Compatibility Notes

`slick2d-ts` is a browser compatibility layer for selected Slick2D and LWJGL APIs. It keeps Java-style names and behavior where that makes sense for browser game ports, but it is not a full desktop runtime.

## Browser Runtime Boundaries

- Rendering uses WebGL2. If the browser loses and restores the WebGL context, GPU objects are recreated from retained decoded image data where possible. Framebuffer-backed render target contents are not preserved by the browser and must be redrawn by the game.
- The main loop is owned by `AppGameContainer` and browser `requestAnimationFrame`. Integer Slick `delta` values are derived from absolute high-resolution frame timestamps so fractional milliseconds carry into later frames instead of being discarded on every callback. `Display.update()` is intentionally a no-op for copied Java loops that still call it.
- Fullscreen, pointer lock, audio unlock, high-DPI backing stores, visibility throttling, and gamepad polling follow browser security and lifecycle rules.
- Keyboard, pointer, wheel, context-menu, touch-action, and gamepad input are mapped to Slick/LWJGL-style APIs. Browser-reserved keys or gestures may still be intercepted by the user agent. Ports can opt additional calibrated axis pairs into the four normal controller-direction controls through `Input.setAdditionalControllerDirectionAxes(...)`; those axes are sampled once during the normal input poll.

## Browser Rendering Extensions

These APIs are available for browser ports that need whole-scene display treatments. They are not Java Slick2D APIs:

- `BufferedScalableGame`: renders the held game into one fixed-size framebuffer image and then presents that completed frame to the display. It defaults to nearest-neighbor presentation for existing behavior, and also supports linear presentation and pixel-perfect integer presentation through `BufferedScalingMode`. Presentation rectangles are calculated in physical backing-store pixels, snapped to physical-pixel boundaries, converted back to logical coordinates for drawing, and reused for input mapping. This avoids fractional per-sprite rasterization when a host page scales the canvas, but it is a browser-only wrapper rather than a Java Slick2D class.
- `Graphics.setColorInverted(...)` and `Graphics.isColorInverted()`: invert subsequent renderer draw calls until the next safe renderer reset or explicit clear through `setColorInverted(false)`.
- `Graphics.setMonochromePalette(...)`, `Graphics.clearMonochromePalette()`, and `Graphics.isMonochromePaletteEnabled()`: map rendered RGB luminance between two replacement colors while preserving the rendered alpha. Endpoint alpha values are ignored. Palette shaders are compiled lazily on first use, and callers should clear the palette with `try`/`finally` when applying it to a bounded render section.

## Browser Resource Extensions

These APIs make asynchronous browser loading explicit while retaining Java resource paths as logical keys:

- `ResourceLoader.preloadResources(...)` and `SoundStore.preloadAudioBuffers(...)` accept an optional `AbortSignal` and progress callback.
- Batch preload calls wait for every operation started by the batch to settle before reporting a failure. This prevents a host Retry action from accidentally overlapping the previous batch.
- `ResourceLoadException` reports a stable failure `kind` (`resolution`, `network`, `http`, `abort`, or `decode`), loading `phase`, resource ref, resolved URL, and HTTP status when available.
- The default retry policy retries transient network conditions, HTTP 408/425/429, and server errors. Permanent client errors such as HTTP 404 fail immediately.

## Java Numeric Overload Boundaries

Java selects `Color(int, ...)` and `Color(float, ...)` overloads at compile time. JavaScript has only one numeric type, so legacy component constructor calls use tuple-wide inference: a fully integral tuple containing a component outside `[-1, 1]` is treated as byte components; otherwise it is treated as floating-point components. Use `Color.fromInts(...)` or `Color.fromFloats(...)` wherever the Java overload intent is ambiguous. Internal color arithmetic uses the explicit float path.

Slick2D's three-float constructor retains raw RGB values and supplies alpha 1. Its four-float constructor clamps only the upper bound to 1. `Color.fromFloats(...)` preserves that distinction. The copy constructor preserves exact mutable channel state, including values outside the nominal range.

## Shared Resource Cancellation

Resource and decoded-audio requests are deduplicated by Java resource reference. The first uncached caller's `AbortSignal` owns cancellation of the shared underlying fetch or decode. Later callers may cancel their own wait but do not replace that ownership. Aborting the first signal therefore rejects every caller sharing that in-flight request. Coordinated preload generations should use one shared controller.

## Browser Controller Calibration Lifetime

Additional direction-axis baselines belong to the controller identity occupying that browser gamepad index. They are cleared when the controller disappears or when the reported gamepad ID changes, preventing a replacement device from inheriting an incompatible neutral baseline. Axis indexes and thresholds are validated when configured.

## Java Random State

`JavaRandom` implements the Java 48-bit LCG and exposes exact internal state through `getState()`, `setState(...)`, and `fromState(...)`. These are browser-port extensions intended for persistence, deterministic replays, and parity tests. Restoring an internal state bypasses the external-seed scrambling performed by Java's `setSeed(long)`.

## Approximate / Configuration-Only Compatibility

These APIs are present for Java source compatibility, and their requested values are stored or queried, but the browser runtime does not currently emulate the full desktop behavior behind them:

- `Input.setDoubleClickInterval(...)` and `Input.setMouseClickTolerance(...)`: values are stored, but pointer click detection currently reports single-click callbacks with click count `1`.
- `Input.enableKeyRepeat(initial, interval)`: enables repeated browser `keydown` events, but does not synthesize Slick-style repeat timing from the requested initial delay or repeat interval.
- `InternalTextureLoader.setHoldTextureData(...)`, `InternalTextureLoader.setDeferredLoading(...)`, and `InternalTextureLoader.set16BitMode()`: values are stored/queryable, but browser image decoding, retained image data, texture upload, and texture storage continue to follow the WebGL renderer's normal path.
- `SoundStore.setDeferredLoading(...)`: the value is stored/queryable, but `Sound` and `Music` constructors still queue browser audio fetch/decode work through the current resource-loading path.

## Intentional Compatibility No-Ops

These methods exist so copied Java code can call familiar APIs without crashing, but the browser port does not currently emulate their desktop effects:

- `BasicGame` input callbacks: convenience empty listener methods.
- `Display.update()`: the RAF loop already advances rendering.
- `Display.setIcon(ByteBuffer[])`: byte-buffer window icons do not map directly to browser tabs. `AppGameContainer.setIcon(String)` can apply a favicon resource.
- `GameContainer.setCssCursor(...)`: base hook only; `AppGameContainer` applies canvas cursor CSS.
- `Graphics.destroy()`: graphics state is container-owned.
- `Image.clampTexture()`: WebGL texture wrapping is managed internally.
- `Image.flushPixelData()`: pixel data is retained when available so Java-style `getColor(...)` and context restoration can keep working.
- `Input.consumeEvent()` and `Input.considerDoubleClick(...)`: DOM events are consumed through listener flow; click counts are currently reported as single clicks.
- `LoadableImageData.configureEdging(...)` for TGA data: retained for API shape.
- `Log.checkVerboseLogSetting()`: browser logging is controlled by host/runtime console settings.
- `SoundStore.poll(...)`: sound completion is driven by Web Audio callbacks.
- `SGL.glClipPlane(...)`, `SGL.glTexEnvi(...)`, and `SGL.glSecondaryColor3ubEXT(...)`: fixed-function desktop OpenGL features with no WebGL2 equivalent in this 2D renderer.

## Raw WebGL Caveat

Images loaded through `Image`, `SpriteSheet`, and related Slick-style APIs can be recreated after context restoration. Raw compatibility textures created through low-level `SGL.glGenTextures(...)` are GPU-only and cannot be reconstructed automatically after context loss.
