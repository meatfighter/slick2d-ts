# Slick2D Parity API for TypeScript

This document specifies the TypeScript library we want to build from the Slick2D abstraction layer used by:

- `C:\NetBeansProjects\SlickJackal`
- `C:\NetBeansProjects\stickvania`
- `C:\NetBeansProjects\SlickMsPacMan`
- `C:\java-projects\slick2d`

The target is a pure modern TypeScript library for the web that preserves Slick2D's Java-facing shape closely enough that the game code can be ported with direct, mechanical substitutions. The API names, class boundaries, overload shapes, argument order, public constants, and expected side effects must map back to the Java counterparts one-to-one whenever the browser platform allows it.

The existing project docs remain authoritative for the browser-specific subsystems:

- `docs/RESOURCE-MANAGEMENT-SYSTEM.md`
- `docs/GAME-LOOP.md`

This file defines the Slick2D parity layer that must sit above those systems.

## Compatibility Goal

Implement the exact API surface used by the three source games first. Add broader Slick2D methods only when they are public dependencies of those classes or are cheap compatibility shims. Every public method listed here must have a Javadoc-style block comment in TypeScript that states:

- the Java Slick2D counterpart,
- whether the behavior is exact, browser-adapted, or intentionally unsupported,
- the important side effects.

Where Java returns `void`, TypeScript must also return `void` unless browser resource loading, fullscreen, pointer lock, or startup genuinely requires a `Promise<void>`. `update` and `render` must remain synchronous.

## Source Audit Coverage

The source audit found four categories of code.

```text
Category                                  Documentation target
Slick2D public API calls                  Required API Surface
LWJGL/OpenGL/OpenAL helper calls          Required shim sections
Reusable project helper methods           Game Helper Porting Layer
Applet and desktop wrapper lifecycle      Legacy Container Mapping
Game-domain classes and state             Port locally in each game, not in this library
```

The observed Slick2D constructor surface is:

```text
AppGameContainer(Game)
ApplicationGameContainer(Game, width, height, fullscreen)
Color(r, g, b, a)
Color(packedInteger)
DisplayMode(width, height)
Image(ref, flipped, filter)
Image(width, height)
Music(ref)
Music(ref, streamingHint)
PackedSpriteSheet(def, filter)
PixelFormat()
PixelFormat(alpha, depth, stencil)
PixelFormat(alpha, depth, stencil, samples)
ScalableGame(held, width, height, maintainAspect)
ScalableGame2(held, width, height, maintainAspect)
SlickException(message)
SlickException(message, cause)
Sound(ref)
XMLPackedSheet(imageRef, xmlRef)
```

The observed Slick2D instance calls are:

```text
AppGameContainer:
setAlwaysRender, setClearEachFrame, setDisplayMode, setShowFPS,
setSmoothDeltas, setSoundOn, setVSync, start

ApplicationGameContainer:
setIcon, setResizable, start

DisplayMode:
getBitsPerPixel, getFrequency, getHeight, getWidth

GameContainer:
getHeight, getInput, getWidth, isFullscreen, setAlwaysRender,
setClearEachFrame, setFullscreen, setIcon, setMusicOn, setShowFPS,
setSmoothDeltas, setVSync

Graphics:
clearClip, clearWorldClip, drawImage, drawLine, drawRect, fillRect,
flush, getArea, getBackground, getColor, setBackground, setClip,
setColor, setWorldClip

Image:
copy, draw, getFlippedCopy, getGraphics, getHeight, getSubImage,
getWidth, rotate, setAlpha, setRotation

Input:
clearControlPressedRecord, clearKeyPressedRecord, isButtonPressed,
isControllerDown, isControllerLeft, isControllerRight, isControllerUp,
isKeyDown, isKeyPressed

Music:
loop, play, playing, setVolume, stop

PackedSpriteSheet:
getSprite

LoadableImageData:
loadImage

ScalableGame2:
containerSizeChanged

SGL:
glPopMatrix, glPushMatrix, glScalef, glTranslatef

Sound:
play, playing, stop

XMLPackedSheet:
getSprite
```

The observed or directly required static calls and constants are:

```text
BufferUtils.createByteBuffer
Color.black, Color.blue, Color.red, Color.white
CursorLoader.get
AL.create, AL.destroy, AL.isCreated
Display.create, destroy, getAvailableDisplayModes, getDisplayMode,
getHeight, getWidth, isActive, isCloseRequested, isCreated,
isFullscreen, isResizable, isVisible, setDisplayMode, setFullscreen,
setIcon, setParent, setResizable, setTitle, setVSyncEnabled, sync, update,
wasResized
FastTrig.cos, FastTrig.sin
GameContainer.stencil
GL11.glPopMatrix, glPushMatrix, glRotatef, glScalef, glTranslatef,
glViewport
Graphics.setCurrent
Image.FILTER_NEAREST
Input key constants listed in the Input section
InternalTextureLoader.get
Log.error, Log.info
Mouse.getNativeCursor, isGrabbed, setGrabbed, setNativeCursor
Renderer.get
ResourceLoader.getResourceAsStream
SlickCallable.enterSafeBlock, leaveSafeBlock
SoundStore.get
Sys.getTime, Sys.getTimerResolution, Sys.getVersion
```

Every item above is either a public API requirement, a neutral support helper, a browser shim, or an explicit migration mapping in this document.

## Final Audit Decisions

The final source audit closes these concerns before implementation starts:

```text
Concern                                      Required decision
Java vendor package roots                    omit org/newdawn, keep src/slick and src/lwjgl
Game-title-specific helper names             never export title-specific modules from slick2d-ts
Animation/AngelCodeFont/UnicodeFont          not required by the three game ports; do not implement in phase one
Applet/AWT wrappers                          remove during ports; map lifecycle to AppGameContainer and DOM canvas
Display.sync(targetFPS)                      required shim; records cap request without blocking the browser thread
GameContainer shared context statics         required shims; map to the active WebGL resource/context owner
org.lwjgl.openal.AL                          required minimal shim for copied container/audio paths
Controller button callback indexes           listener callbacks are one-based; polling/storage is zero-based
ClassLoader/DataInputStream resources        preload/register with ResourceLoader, read with BinaryReader
URL.openStream score/service calls           game-local async fetch, not ResourceLoader
FileOutputStream recording/debug output      game-local Blob download or IndexedDB/localStorage export
java.awt.Toolkit.getDefaultToolkit()         delete in browser ports; bootstrap owns DOM/canvas readiness
new Thread()                                 replace with RAF loop, Promise flow, or explicit Worker only for CPU work
System.exit(0)                               container.exit() or game-local state transition; never close the tab
System.currentTimeMillis() throttles         Sys.getTime() or performance.now() monotonic milliseconds
java.util.Random seeded behavior             use JavaRandom for exact seeded nextInt/nextFloat/nextBoolean parity
Collections.synchronizedMap                  normal Map is sufficient unless a port introduces Workers
```

No remaining audit item is allowed to become an undocumented "figure it out during the port" task. If implementation discovers a method not listed here, update this document first, then implement.

## Project Layout

Use a TypeScript-native source layout that drops the Java vendor package roots `org` and `newdawn`, but keeps `slick` as the library namespace. This repo is already named `slick2d-ts`, so keeping `src/slick` gives us the useful part of the Java package identity without making every import carry Java-era ceremony.

Keep one TypeScript file per Java class or interface for parity classes. Neutral TS support helpers may use their own files when the Java source had helper methods rather than a reusable library class.

```text
src/
    slick/
        AppGameContainer.ts
        ApplicationGameContainer.ts
        BasicGame.ts
        Color.ts
        ControlledInputReciever.ts
        ControllerListener.ts
        Font.ts
        Game.ts
        GameContainer.ts
        Graphics.ts
        Image.ts
        Input.ts
        InputListener.ts
        KeyListener.ts
        MouseListener.ts
        Music.ts
        MusicListener.ts
        PackedSpriteSheet.ts
        Renderable.ts
        ScalableGame.ts
        ScalableGame2.ts
        SlickException.ts
        Sound.ts
        SpriteSheet.ts
        XMLPackedSheet.ts
        rendering/
            RenderBackend.ts
            WebGLBatch.ts
            WebGLRenderer.ts
            WebGLRenderTarget.ts
            WebGLShaderProgram.ts
            WebGLTextureResource.ts
        util/
            FastTrig.ts
            Log.ts
            ResourceLoader.ts
        support/
            BinaryReader.ts
            BitmapText.ts
            ButtonMapping.ts
            GeometryMath.ts
            HumanInput.ts
            IInput.ts
            IMode.ts
            JavaRandom.ts
            RecordedInput.ts
            Song.ts
            SpriteDrawing.ts
        opengl/
            CursorLoader.ts
            ImageData.ts
            ImageIOImageData.ts
            InternalTextureLoader.ts
            LoadableImageData.ts
            SlickCallable.ts
            TGAImageData.ts
            renderer/
                Renderer.ts
                SGL.ts
        openal/
            SoundStore.ts
    lwjgl/
        BufferUtils.ts
        LWJGLException.ts
        Sys.ts
        input/
            Cursor.ts
            Mouse.ts
        openal/
            AL.ts
        opengl/
            Display.ts
            DisplayMode.ts
            GL11.ts
            PixelFormat.ts
```

Use this import mapping:

```text
Java counterpart                     TypeScript file
org.newdawn.slick.Image              src/slick/Image.ts
org.newdawn.slick.Graphics           src/slick/Graphics.ts
org.newdawn.slick.util.FastTrig      src/slick/util/FastTrig.ts
project Song helper classes          src/slick/support/Song.ts
project IInput/HumanInput helpers    src/slick/support/IInput.ts
project recorded/demo input helper   src/slick/support/RecordedInput.ts
java.util.Random port helper         src/slick/support/JavaRandom.ts
project bitmap text helpers          src/slick/support/BitmapText.ts
project draw helper methods          src/slick/support/SpriteDrawing.ts
project geometry helper methods      src/slick/support/GeometryMath.ts
org.newdawn.slick.opengl.GL wrapper  src/slick/opengl/*
org.newdawn.slick.openal.SoundStore  src/slick/openal/SoundStore.ts
org.lwjgl.Sys                        src/lwjgl/Sys.ts
org.lwjgl.openal.AL                  src/lwjgl/openal/AL.ts
org.lwjgl.opengl.GL11                src/lwjgl/opengl/GL11.ts
```

The `src/lwjgl` files are compatibility shims for project helper code that reaches below Slick2D. They must be thin wrappers around browser services and must not become the primary rendering API. Public Javadoc-style comments must still name the complete Java counterpart, for example `Java Slick2D counterpart: org.newdawn.slick.Image`.

Do not add game-title-specific modules to this library. The source projects may keep their own `Main`, `Stage`, actor, mode, and game-specific input classes during TS ports. This library must expose neutral Slick parity classes and neutral helper primitives only.

## TypeScript Style Rules

- Use modern TypeScript with ES modules.
- Keep Java class and method names, including Java-style casing.
- Preserve the original misspelling `ControlledInputReciever`.
- Use one TS file per Java class or interface.
- Use overload signatures when Java has constructor or method overloads.
- Implement overloaded functions with one runtime implementation.
- End statements with semicolons.
- Indent with 4 spaces.
- Prefer `number` for Java `int`, `float`, and `double`.
- Use `bigint` for Java `long` when exact 64-bit binary or bitfield parity matters. Time values such as `Sys.getTime()` may remain `number`.
- Prefer `string` for Java `String` and one-character Java `char`.
- Use mutable public fields when the Java class exposes mutable public fields.
- Use `static readonly` for Java public constants that should not be reassigned.
- Do not convert Java-like APIs to idiomatic web APIs at the public boundary.
- Keep `Game.init`, `Game.update`, and `Game.render` synchronous from the game author's point of view. The TS `Game.init` type is `void | Promise<void>` so `AppGameContainer.start()` can await browser resource preparation when an init implementation returns a promise.

Example public method style:

```ts
/**
 * Java Slick2D counterpart: Image.draw(float x, float y).
 *
 * Draws this image at the supplied top-left world coordinate using the
 * image's current alpha, rotation, center of rotation, and filter state.
 */
public draw(x: number, y: number): void;
```

## Browser Adaptation Rules

### Resources

Java Slick2D constructors such as `new Image("images/foo.png")`, `new Sound("audio/hit.ogg")`, and `new Music("music/theme.ogg")` are synchronous because desktop resources are available from the classpath or filesystem. Browser loading is asynchronous, so the TS constructors must preserve the Java call shape while delegating actual loading to the resource system.

The source games also read binary and text resources through `ClassLoader.getResourceAsStream`, `BufferedInputStream`, and `DataInputStream`. Do not port those as direct disk or classpath access. In the browser, all image, audio, XML, text, and binary `.dat` assets must be URL-addressed resources acquired through the resource manager.

Implement these rules:

- The full resource manager architecture in `docs/RESOURCE-MANAGEMENT-SYSTEM.md` is the long-form design target. The phase-one Slick parity implementation uses `ResourceLoader` as the concrete shared cache, byte registry, and preload barrier.
- `Image`, `Sound`, `Music`, `PackedSpriteSheet`, and `XMLPackedSheet` must register or retrieve work through `ResourceLoader`; they must not perform one-off uncached browser fetches.
- `AppGameContainer.start()` must call `game.init`, then wait for `ResourceLoader.waitForAll()` before the first real frame.
- Dynamic resources created after startup must begin loading immediately and participate in `ResourceLoader.waitForAll()` when their preparation promise is tracked.
- Releasing a container must dispose WebGL and audio runtime state owned by the container. Per-scene reference-counted unloading is deferred until a full `ResourceManager`/`ResourceScope` implementation is added.
- Cache keys must include handler kind plus every option that changes the runtime value, for example image path, filter mode, transparent color, atlas metadata path, and audio streaming mode.
- The manager must cache in-flight requests as well as completed values so two `new Image("images/foo.png")` calls share one network/decode operation.
- `ResourceLoader` is a Java compatibility adapter over the same manager. It must not maintain a second cache.
- `ResourceLoader.getResourceAsStream(ref)` means "return already loaded bytes for this resource" in TS. It must not perform a synchronous network request.
- Java `ClassLoader.getResourceAsStream(ref)` maps to preloading/registering the bytes under the original Java ref string, then to `ResourceLoader.getResourceAsStream(ref)` after the preload barrier.
- `ResourceLoader.setCacheBust(value)` appends or replaces a `v` query parameter on network fetch URLs while preserving the exact Java ref as the cache key.
- `ResourceLoader.setRetryOptions(retries, delayMs)` configures network retry attempts for resources loaded through Slick. Retries apply only to fetch transport failures and non-OK HTTP responses; decode/parse failures fail immediately.
- `ResourceLoader.hasPending()` and `getPendingCount()` report queued fetch/decode work, including browser-only promises registered through `track()`.
- Browser resource locations must preserve Java's ordered search semantics. `loadResource(ref)` tries every configured location in order, retries that candidate according to retry settings, then falls through to the next location before failing.
- `removeAllResourceLocations()` clears every location, matching Java. Add `""` explicitly when a port wants the default relative-to-page lookup after clearing.
- Root-relative browser locations such as `/assets` must stay origin-root absolute. Relative locations such as `assets` stay relative to the deployed page/base URL. Absolute `https://...` locations stay absolute.
- Java `DataInputStream` maps to `slick.support.BinaryReader`, which must implement Java-compatible big-endian reads for the methods used by the ports.
- Stage text files map to the text handler; `.def` files map to the packed-sheet text handler; XML atlas files map to the XML handler; images map to the image-bitmap handler; audio maps to the audio-buffer or streaming-audio handler.
- Java `URL.openStream` or `BufferedReader` over an HTTP score/service URL is not Slick resource loading. Port that code inside the game using `fetch`, make it asynchronous, and keep it out of `slick2d-ts`.
- Java `FileOutputStream` and `BufferedOutputStream` recording/debug output is not Slick resource loading. Port that code inside the game using a `Blob` download for manual export, IndexedDB for persistent binary saves, or `localStorage` only for tiny text/state values.
- Resource failures must produce `SlickException` or stored `ResourceLoader` errors with enough data to identify the path and original cause.
- Resource progress and diagnostics must come from `ResourceLoader` in phase one, then from `ResourceManager` when the fuller architecture is implemented.
- Constructing `Image`, `Sound`, `Music`, `PackedSpriteSheet`, or `XMLPackedSheet` registers, retrieves, or tracks a resource through the shared resource loader.
- Resource paths must preserve the exact Java string value as the logical cache key, for example `images/player.png` and `sound/start.ogg`. The resource manager may resolve that key against a configured base URL, but the public Slick object keeps the original string.
- `AppGameContainer.start()` must await all resources queued during `Game.init`.
- Resources created after startup must begin loading immediately and expose a ready state internally.
- Resources created from a loading screen or any other `update` after startup must still participate in the shared barrier. `AppGameContainer` must allow the current progress frame to render, then pause the next update until `ResourceLoader.hasPending()` is false or a queued promise rejects.
- Resource or frame failures after `start()` has resolved must be deliverable to the host PWA through `AppGameContainer.setErrorHandler(handler)`. The fallback may still surface an uncaught asynchronous error, but host loading UIs must not be forced to rely on global `error` or `unhandledrejection`.
- Drawing an image whose handle is still pending after the startup barrier skips that draw and logs one warning keyed by resource path. Drawing an image whose handle failed throws `SlickException`.
- Playing audio whose handle is still pending or blocked by browser autoplay produces no sound and logs one warning keyed by resource path. Playing audio whose handle failed throws `SlickException`.
- Missing or failed required resources must surface as `SlickException`.
- `.def` packed-sheet files must be loaded as text and parsed according to `PackedSpriteSheet`.
- XML packed-sheet files must be loaded as text and parsed with `DOMParser`.
- Constructors that synchronously parse bytes, including `PackedSpriteSheet` and `XMLPackedSheet`, cannot fetch their metadata in the constructor. A port must preload/register the `.def` or XML bytes first, or call an async game-local loader before constructing the Slick parity object.

### Timing

Java Slick2D passes integer millisecond deltas into `Game.update`. The TS library must do the same.

Implement these rules:

- Implement the Slick container loop as an adapter over the fixed-timestep game loop from `docs/GAME-LOOP.md`.
- The lower-level loop may use seconds internally, but the Slick adapter must convert each fixed step to Java-style integer milliseconds before calling `Game.update(container, delta)`.
- Use a default adapter update rate of `60` updates per second unless the container configuration changes it.
- Bound catch-up work with both `maximumFrameDeltaMs` and `maximumUpdatesPerFrame`.
- Do not process hidden-tab time as simulation debt. On visibility resume, reset the previous timestamp and accumulator.
- Track multiple pause reasons, such as manual pause, visibility pause, modal pause, context loss, and overload pause.
- Clear one-shot input events when timing is reset or the document becomes hidden.
- Render once per browser animation callback after all bounded update work for that callback is complete.
- Expose timing diagnostics for dropped simulation time, skipped intermediate renders, overload, and timing discontinuities.
- The browser loop uses `requestAnimationFrame`.
- Internal timing uses `performance.now()`.
- `Game.update(container, delta)` receives an integer number of milliseconds.
- `Game.render(container, graphics)` is called after update work for the frame.
- `Sys.getTime()` and `Sys.getTimerResolution()` must be available for ported helper code. `Sys.getTimerResolution()` must return `1000`.
- The source helper loops use two explicit cadences: `(Sys.getTimerResolution() / 91)` for about 91 updates per second, and `((Sys.getTimerResolution() * 0.01f) + 0.5f)` for about 100 updates per second. The Slick adapter must not force those game-local loops to 60 Hz; it must preserve `Sys` timing so the port can keep those exact counters.
- Fixed-timestep behavior must follow `docs/GAME-LOOP.md`.

### Rendering

The primary backend must be WebGL2 because Slick2D is an OpenGL/LWJGL rendering library and the source helper code uses `GL11` transforms directly. A Canvas2D backend may exist only as a testing or emergency fallback; it must not define the public API.

Implement these rules:

- Coordinates use Slick2D's top-left origin.
- `Graphics` owns the current drawing state: color, font, clip, world clip, transform, anti-alias flag, draw mode, and line width.
- `Image` owns image state: alpha, rotation in degrees, center of rotation, source rectangle, flipped flags, filter, and name.
- `Graphics.pushTransform` and `Graphics.popTransform` map to a WebGL matrix-state stack.
- `Graphics.scale`, `Graphics.rotate`, and `Graphics.translate` must affect later draw calls.
- `Image.draw` must respect both its own image state and the current `Graphics` state.
- `SlickCallable.enterSafeBlock` and `leaveSafeBlock` become state-save boundaries for compatibility with code that mixes `GL11` calls and `Graphics`.
- `Image(width, height)` creates a texture-backed render target with a framebuffer.
- `Image.getGraphics()` binds that framebuffer as the active render target.
- `Graphics.getArea(..., target)` uses `gl.readPixels` into a reusable byte buffer.
- `Image.FILTER_NEAREST` maps to `gl.NEAREST` for both minification and magnification filters.
- `Image.FILTER_LINEAR` maps to `gl.LINEAR`.
- `Graphics.setClip` maps to `gl.scissor` in framebuffer coordinates.
- `Graphics.setWorldClip` maps to the current transform plus scissor when axis-aligned, or a stencil clip when transformed clipping cannot be represented by one scissor rectangle.
- `GameContainer.stencil` and `PixelFormat(..., stencil, ...)` request a WebGL context with `{ stencil: true }`.

### Web Runtime Libraries

Use browser-native APIs first. Do not introduce a game engine dependency. The parity library must stay small, testable TypeScript over Web APIs.

Required browser APIs and their roles:

```text
WebGL2RenderingContext       Primary renderer, textures, framebuffers, batching
requestAnimationFrame        Display scheduling
performance.now              Monotonic timing
fetch / Response             Resource transport
AbortController              Resource cancellation
createImageBitmap            Image decode when available
HTMLImageElement             Image decode fallback
DOMParser                    XML atlas parsing
TextDecoder                  Text and binary string decode
DataView                     Java-compatible binary reads
AudioContext                 Short sound effects and decoded music
Gamepad API                  Controller state
KeyboardEvent / PointerEvent Keyboard, mouse, touch-compatible pointer input
Fullscreen API               setFullscreen
Pointer Lock API             setMouseGrabbed
Blob / URL.createObjectURL   Cursor/image URL generation and streaming fallbacks
OffscreenCanvas              Optional worker/offscreen render-target support
Web Workers                  Optional CPU-heavy parsing or decoding
```

Optional small dependencies are allowed only when they replace error-prone infrastructure without changing the public API:

```text
Matrix math helper           Allowed for 3x3/4x4 transform stacks
Tiny XML convenience layer    Allowed only over DOMParser output
Test-only fake RAF/DOM layer  Allowed in test packages
```

Do not use Phaser, PixiJS, Three.js, React, or a UI framework inside the core Slick parity layer. Those libraries impose their own scene, rendering, or component models and make one-to-one Slick parity harder.

### WebGL Mapping

Implement the WebGL backend with these concrete pieces:

```text
Slick concept                WebGL implementation
Image resource               WebGLTexture plus source width/height and UV rect
Image subimage               Same WebGLTexture, different UV rect
Image flipped copy           Same WebGLTexture, UV coordinates reversed
Image alpha                  Per-draw uniform multiplied into vertex color
Image rotation               Per-image local transform in degrees
Image getGraphics            Framebuffer-backed render target
Graphics current color       Uniform/vertex color for primitives and tinting
Graphics draw mode           Blend equation and blend function state
Graphics transform stack     Array of 3x3 affine matrices
GL11 matrix calls            Delegation to same transform stack
draw image                   Batched textured quad
fillRect / drawRect          Solid-color quads; outline rect as four quads
drawLine                     Thin quad between endpoints, not gl.LINE width
setClip                      gl.scissor with y-flipped framebuffer coordinates
setWorldClip                 transformed scissor or stencil mask
clear / background           gl.clearColor and gl.clear
getArea                      gl.readPixels
```

The default shader set must include:

- textured quad shader with alpha and color tint,
- solid primitive shader for rectangles and line quads,
- mask/stencil shader support for non-scissor world clips.

Batching rules:

- Flush when the texture changes and the batch cannot add another texture.
- Flush before changing blend mode, scissor, stencil, framebuffer, or shader.
- Flush before `SlickCallable.enterSafeBlock`.
- Flush before `Graphics.getArea` or any `gl.readPixels` call.
- Preserve draw order exactly.

Context loss rules:

- Listen for `webglcontextlost` and prevent the browser default.
- Pause the game loop with reason `context-lost`.
- On `webglcontextrestored`, recreate shaders, buffers, textures, framebuffers, and render targets from resource handles.
- Reset timing debt before resuming.

Internal renderer files must expose a small private backend API that the Slick classes share. This API is not a replacement public surface; it exists so `Image`, `Graphics`, `GL11`, and `SGL` all mutate the same render state.

```ts
export interface RenderBackend {
    initialize(canvas: HTMLCanvasElement, options: RenderBackendOptions): void;
    beginFrame(width: number, height: number, background: Color): void;
    endFrame(): void;
    setRenderTarget(target: WebGLRenderTarget | null): void;
    drawImage(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3): void;
    fillRect(x: number, y: number, width: number, height: number, color: Color, transform: Matrix3): void;
    drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, width: number, transform: Matrix3): void;
    setClip(x: number, y: number, width: number, height: number): void;
    clearClip(): void;
    setWorldClip(x: number, y: number, width: number, height: number, transform: Matrix3): void;
    clearWorldClip(): void;
    pushTransform(): void;
    popTransform(): void;
    translate(x: number, y: number): void;
    scale(x: number, y: number): void;
    rotate(x: number, y: number, angle: number): void;
    readPixels(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    bindTextureResource(resource: WebGLTextureResource): void;
    handleContextLost(): void;
    handleContextRestored(): void;
    dispose(): void;
}
```

Internal file responsibilities:

```text
RenderBackend.ts          Shared private interface and backend options
WebGLRenderer.ts          Owns WebGL2 context, frame lifecycle, state stacks, and draw submission
WebGLBatch.ts             Queues textured and solid quads, preserves draw order, flushes on state changes
WebGLTextureResource.ts   Wraps WebGLTexture, ImageBitmap/source size, UV defaults, filter, and reload data
WebGLRenderTarget.ts      Wraps framebuffer plus texture for Image(width, height) and Graphics.getArea
WebGLShaderProgram.ts     Compiles, links, binds, and validates shader programs
```

`WebGLRenderer` must be the only place that calls raw WebGL for normal drawing. `Image`, `Graphics`, `SGL`, and `GL11` must delegate to it so transform, clipping, framebuffer, and batching behavior cannot diverge.

### Audio

Use Web Audio for decoded sound effects and decoded music. Phase one must not use `HTMLAudioElement`; Java `Music(ref, streamingHint)` keeps the constructor shape, but playback still routes through `AudioContext`, decoded `AudioBuffer`s, `AudioBufferSourceNode`s, and gain nodes.

Implement these rules:

- `Sound` represents short effects.
- `Music` represents longer tracks and can loop.
- `Sound` and `Music` constructors preserve Java call shape, but they must immediately queue fetch plus Web Audio decode through `SoundStore.preloadAudioBuffer(ref)` and `ResourceLoader.track()`.
- `Sound.ready()` / `Sound.load()` and `Music.ready()` / `Music.load()` are browser parity helpers that return the constructor-queued decode promise. They do not replace Java-style `play()` call sites; they exist so loading screens and host bootstraps can await browser work explicitly.
- `Sound.play(pitch, volume)` maps pitch to playback rate. Clamp or reject values the browser backend cannot play, and document that decision in the method comment.
- `Music.setVolume` persists across future `play` and `loop` calls.
- `Music` must preserve Java Slick2D's single global current music channel. Starting one `Music` stops/swaps the previous current instance, updates listener state, and makes `oldMusic.playing()` return false immediately.
- `Music.stop()` and `pause()` must invalidate pending async starts so a decoded buffer cannot start after the game has stopped or changed modes.
- `GameContainer.setMusicOn(false)` / `SoundStore.setMusicOn(false)` suspends audible active music, not just mutes it. It must not call public `Music.pause()` semantics, and it must preserve the current music instance and `Music.playing()` state. Setting music on again resumes from the stored position when possible.
- `Music.play()` or `loop()` while global music is off still registers that track as current and prepares it; audible Web Audio playback waits until global music is enabled.
- Browser autoplay restrictions must be handled by deferring playback until audio is unlocked by a user gesture.
- `playing()` must report whether the sound or music instance is currently active.

### Fullscreen, Cursor, and Input

Implement these rules:

- `setFullscreen` maps to the browser Fullscreen API.
- `setDisplayMode` and `setFullscreen` may return `Promise<void>` because browser fullscreen changes are asynchronous. When a promise is returned, dimensions and the WebGL display must be refreshed after it settles.
- `AppGameContainer` must listen to `fullscreenchange` and `resize`, update canvas backing size and CSS size, then reinitialize the WebGL display dimensions.
- `setMouseGrabbed` maps to Pointer Lock where available.
- Cursor methods must use CSS cursor values or browser cursor assets.
- Keyboard constants must retain the original LWJGL numeric values.
- Input polling methods must preserve Slick2D's difference between "pressed once" and "currently down".
- While the game canvas owns focus/input, Slick movement/action keys must call `KeyboardEvent.preventDefault()` so arrows and Space do not scroll or activate DOM UI. This must not suppress normal behavior when an editable/menu element has focus.
- DOM controls outside the game surface must not be recorded as Slick input at all. Split "prevent browser default" from "accept as game input" so buttons, sliders, text fields, and contenteditable elements remain normal browser controls.
- Window blur, hidden `visibilitychange`, and inactive input polling must clear held keyboard/mouse state plus one-shot key, mouse, and controller records. Browser input can miss a `keyup`; do not let held state survive lost focus.
- Controller methods must use the Gamepad API and preserve Slick2D's listener method names.

## Required API Surface

The following sections are the required public API. Every method listed here must be implemented or explicitly marked as a browser-adapted no-op where that is the correct parity behavior.

### `slick.SlickException`

```ts
export class SlickException extends Error {
    public constructor(message: string);
    public constructor(message: string, cause: unknown);
}
```

Implementation instructions:

- Preserve Java constructor overloads.
- Set `name` to `SlickException`.
- Store `cause` when provided.
- Use this for resource, display, audio, and unsupported-operation failures.

### `slick.Game`

```ts
export interface Game {
    init(container: GameContainer): void | Promise<void>;
    update(container: GameContainer, delta: number): void;
    render(container: GameContainer, g: Graphics): void;
    closeRequested(): boolean;
    getTitle(): string;
}
```

Implementation instructions:

- Keep the method names and argument order identical to Java.
- `delta` is integer milliseconds.
- `closeRequested` returns whether the container may close.

### `slick.BasicGame`

```ts
export abstract class BasicGame implements Game, InputListener {
    public constructor(title: string);
    public getTitle(): string;
    public closeRequested(): boolean;
    public setInput(input: Input): void;
    public abstract init(container: GameContainer): void | Promise<void>;
    public abstract update(container: GameContainer, delta: number): void;
    public abstract render(container: GameContainer, g: Graphics): void;
    public isAcceptingInput(): boolean;
    public inputStarted(): void;
    public inputEnded(): void;
    public keyPressed(key: number, c: string): void;
    public keyReleased(key: number, c: string): void;
    public mouseWheelMoved(change: number): void;
    public mouseClicked(button: number, x: number, y: number, clickCount: number): void;
    public mousePressed(button: number, x: number, y: number): void;
    public mouseReleased(button: number, x: number, y: number): void;
    public mouseMoved(oldx: number, oldy: number, newx: number, newy: number): void;
    public mouseDragged(oldx: number, oldy: number, newx: number, newy: number): void;
    public controllerLeftPressed(controller: number): void;
    public controllerLeftReleased(controller: number): void;
    public controllerRightPressed(controller: number): void;
    public controllerRightReleased(controller: number): void;
    public controllerUpPressed(controller: number): void;
    public controllerUpReleased(controller: number): void;
    public controllerDownPressed(controller: number): void;
    public controllerDownReleased(controller: number): void;
    public controllerButtonPressed(controller: number, button: number): void;
    public controllerButtonReleased(controller: number, button: number): void;
}
```

Implementation instructions:

- Store the title from the constructor.
- `closeRequested` returns `true`.
- `setInput` is a no-op by default.
- All input callbacks are no-ops by default.

### `slick.ControlledInputReciever`

```ts
export interface ControlledInputReciever {
    setInput(input: Input): void;
    isAcceptingInput(): boolean;
    inputStarted(): void;
    inputEnded(): void;
}
```

Implementation instructions:

- Preserve the Java spelling `Reciever`.
- `Input` must call `inputStarted` before dispatching a batch of callbacks and `inputEnded` after the batch.

### `slick.KeyListener`

```ts
export interface KeyListener extends ControlledInputReciever {
    keyPressed(key: number, c: string): void;
    keyReleased(key: number, c: string): void;
}
```

Implementation instructions:

- `key` is the LWJGL/Slick key code, not a DOM code.
- `c` is a one-character string when available, otherwise `"\0"`.

### `slick.ControllerListener`

```ts
export interface ControllerListener extends ControlledInputReciever {
    controllerLeftPressed(controller: number): void;
    controllerLeftReleased(controller: number): void;
    controllerRightPressed(controller: number): void;
    controllerRightReleased(controller: number): void;
    controllerUpPressed(controller: number): void;
    controllerUpReleased(controller: number): void;
    controllerDownPressed(controller: number): void;
    controllerDownReleased(controller: number): void;
    controllerButtonPressed(controller: number, button: number): void;
    controllerButtonReleased(controller: number, button: number): void;
}
```

Implementation instructions:

- Preserve Slick2D's listener behavior where controller button callback indexes start at `1`.
- Polling APIs such as `Input.isButtonPressed` must use zero-based button indexes. The observed key-binding helper decrements the listener callback value before storing it, then passes the stored value to `isButtonPressed`.

### `slick.MouseListener`

```ts
export interface MouseListener extends ControlledInputReciever {
    mouseWheelMoved(change: number): void;
    mouseClicked(button: number, x: number, y: number, clickCount: number): void;
    mousePressed(button: number, x: number, y: number): void;
    mouseReleased(button: number, x: number, y: number): void;
    mouseMoved(oldx: number, oldy: number, newx: number, newy: number): void;
    mouseDragged(oldx: number, oldy: number, newx: number, newy: number): void;
}
```

Implementation instructions:

- Mouse coordinates are container coordinates after input scale and offset have been applied.
- Button constants must match `Input.MOUSE_LEFT_BUTTON`, `MOUSE_RIGHT_BUTTON`, and `MOUSE_MIDDLE_BUTTON`.

### `slick.InputListener`

```ts
export interface InputListener extends MouseListener, KeyListener, ControllerListener {
}
```

Implementation instructions:

- This is only a composition interface.

### `slick.Renderable`

```ts
export interface Renderable {
    draw(x: number, y: number): void;
}
```

Implementation instructions:

- `Image` must implement this interface.

### `slick.Font`

```ts
export interface Font {
    getWidth(text: string): number;
    getHeight(text: string): number;
    getLineHeight(): number;
    drawString(x: number, y: number, text: string): void;
    drawString(x: number, y: number, text: string, col: Color): void;
    drawString(x: number, y: number, text: string, col: Color, startIndex: number, endIndex: number): void;
}
```

Implementation instructions:

- The default implementation must rasterize text into a WebGL texture atlas. `CanvasRenderingContext2D` or `OffscreenCanvas` may be used only as rasterization staging, not as the main rendering backend.
- Preserve overloads even if the first implementation ignores character-range tinting.

### `slick.Color`

```ts
export class Color {
    public static readonly transparent: Color;
    public static readonly white: Color;
    public static readonly yellow: Color;
    public static readonly red: Color;
    public static readonly blue: Color;
    public static readonly green: Color;
    public static readonly black: Color;
    public static readonly gray: Color;
    public static readonly cyan: Color;
    public static readonly darkGray: Color;
    public static readonly lightGray: Color;
    public static readonly pink: Color;
    public static readonly orange: Color;
    public static readonly magenta: Color;

    public r: number;
    public g: number;
    public b: number;
    public a: number;

    public constructor(color: Color);
    public constructor(r: number, g: number, b: number);
    public constructor(r: number, g: number, b: number, a: number);
    public constructor(value: number);
    public static decode(value: string): Color;
    public bind(): void;
    public hashCode(): number;
    public equals(other: unknown): boolean;
    public toString(): string;
    public darker(): Color;
    public darker(scale: number): Color;
    public brighter(): Color;
    public brighter(scale: number): Color;
    public getRed(): number;
    public getGreen(): number;
    public getBlue(): number;
    public getAlpha(): number;
    public getRedByte(): number;
    public getGreenByte(): number;
    public getBlueByte(): number;
    public getAlphaByte(): number;
    public multiply(c: Color): Color;
    public add(c: Color): void;
    public scale(value: number): void;
    public addToCopy(c: Color): Color;
    public scaleCopy(value: number): Color;
}
```

Implementation instructions:

- Store `r`, `g`, `b`, and `a` as normalized floats from `0` to `1`, matching Slick2D.
- Integer constructors accept Java byte-like channel values from `0` to `255`.
- The single-number constructor interprets packed integer color values exactly as Java Slick2D: `0xAARRGGBB`. If the packed alpha byte is `0`, use alpha `255`.
- Static color constants must be independent `Color` instances.
- `bind` applies this color to the current `Graphics` context or acts as a no-op when no context is active.
- Mutating methods must match Java behavior: `add` and `scale` mutate this instance and return `void`; `addToCopy` and `scaleCopy` return new instances.

### `slick.Image`

```ts
export class Image implements Renderable {
    public static readonly TOP_LEFT: number;
    public static readonly TOP_RIGHT: number;
    public static readonly BOTTOM_RIGHT: number;
    public static readonly BOTTOM_LEFT: number;
    public static readonly FILTER_LINEAR: number;
    public static readonly FILTER_NEAREST: number;

    public constructor(ref: string);
    public constructor(ref: string, trans: Color);
    public constructor(ref: string, flipped: boolean);
    public constructor(ref: string, flipped: boolean, filter: number);
    public constructor(ref: string, flipped: boolean, filter: number, transparent: Color);
    public constructor(width: number, height: number);
    public constructor(width: number, height: number, filter: number);
    public constructor(input: ArrayBuffer | Blob, ref: string, flipped: boolean);
    public constructor(input: ArrayBuffer | Blob, ref: string, flipped: boolean, filter: number);
    public constructor(data: slick.opengl.ImageData);
    public constructor(data: slick.opengl.ImageData, filter: number);
    public constructor(image: Image);
    public setFilter(filter: number): void;
    public getFilter(): number;
    public getResourceReference(): string | null;
    public setImageColor(r: number, g: number, b: number): void;
    public setImageColor(r: number, g: number, b: number, a: number): void;
    public setColor(corner: number, r: number, g: number, b: number): void;
    public setColor(corner: number, r: number, g: number, b: number, a: number): void;
    public clampTexture(): void;
    public setName(name: string): void;
    public getName(): string | null;
    public getGraphics(): Graphics;
    public bind(): void;
    public draw(): void;
    public draw(x: number, y: number): void;
    public draw(x: number, y: number, scale: number): void;
    public draw(x: number, y: number, filter: Color): void;
    public draw(x: number, y: number, width: number, height: number): void;
    public draw(x: number, y: number, width: number, height: number, filter: Color): void;
    public draw(x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    public draw(x: number, y: number, width: number, height: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    public drawCentered(x: number, y: number): void;
    public drawEmbedded(x: number, y: number, width: number, height: number): void;
    public drawSheared(x: number, y: number, hshear: number, vshear: number): void;
    public drawFlash(x: number, y: number): void;
    public drawFlash(x: number, y: number, width: number, height: number): void;
    public drawFlash(x: number, y: number, width: number, height: number, col: Color): void;
    public setCenterOfRotation(x: number, y: number): void;
    public getCenterOfRotationX(): number;
    public getCenterOfRotationY(): number;
    public setRotation(angle: number): void;
    public getRotation(): number;
    public rotate(angle: number): void;
    public getAlpha(): number;
    public setAlpha(alpha: number): void;
    public getSubImage(x: number, y: number, width: number, height: number): Image;
    public drawWarped(topLeftX: number, topLeftY: number, topRightX: number, topRightY: number, bottomRightX: number, bottomRightY: number, bottomLeftX: number, bottomLeftY: number): void;
    public getWidth(): number;
    public getHeight(): number;
    public copy(): Image;
    public getScaledCopy(scale: number): Image;
    public getScaledCopy(width: number, height: number): Image;
    public ensureInverted(): void;
    public getFlippedCopy(flipHorizontal: boolean, flipVertical: boolean): Image;
    public endUse(): void;
    public startUse(): void;
    public toString(): string;
    public getColor(x: number, y: number): Color;
    public isDestroyed(): boolean;
    public destroy(): void;
    public flushPixelData(): void;
}
```

Implementation instructions:

- Required by the games: constructors from path, constructors from width and height, `FILTER_NEAREST`, `draw`, `copy`, `getFlippedCopy`, `getGraphics`, `getHeight`, `getSubImage`, `getWidth`, `rotate`, `setAlpha`, and `setRotation`.
- `Image(ref, false, Image.FILTER_NEAREST)` must disable smoothing for pixel-art rendering.
- The `flipped` constructor flag is Slick's y-axis load inversion flag.
- Transparent-color constructors must zero matching source pixels' alpha during browser decode.
- `ArrayBuffer` and `Blob` constructors must decode the supplied bytes and register them under `ref`.
- `Image(width, height)` creates a texture-backed render target with a framebuffer.
- `getSubImage` returns a new `Image` view over the same source resource with a different source rectangle.
- `copy` returns a new `Image` object sharing the source pixels but with independent alpha, rotation, filter, name, and center state.
- `getScaledCopy` changes logical display width and height only. It must not change the sampled source rectangle.
- `ensureInverted` must be idempotent.
- `getColor` must sample cached texture pixel data, not the current framebuffer.
- `setColor` and `setImageColor` must render with Slick per-corner color behavior through WebGL vertex colors.
- `getFlippedCopy` composes the requested flip flags with the current image's flip state.
- `rotate(angle)` adds degrees to the current rotation and stores modulo `360`.
- `setRotation(angle)` sets absolute degrees modulo `360`.
- `setAlpha(alpha)` stores persistent per-image alpha without clamping.
- `getGraphics()` returns a `Graphics` instance drawing into the image's framebuffer-backed render target. Throw `SlickException` when the image is not writable.
- Texture/OpenGL methods such as `bind`, `startUse`, `endUse`, and `clampTexture` map to WebGL texture and batch state; they must exist even when a browser backend can collapse some state changes.
- `flushPixelData()` drops cached CPU pixel data. When no CPU-side pixel cache exists, it returns immediately and records no state change.
- `drawWarped` and `drawSheared` are phase-one browser-adapted unsupported methods because the three source games do not call them. They must exist and throw `SlickException` with a message naming the unsupported method. If later implemented, update this document with the exact WebGL quad math before changing behavior.

### `slick.Graphics`

```ts
export class Graphics {
    public static readonly MODE_NORMAL: number;
    public static readonly MODE_ALPHA_MAP: number;
    public static readonly MODE_ALPHA_BLEND: number;
    public static readonly MODE_COLOR_MULTIPLY: number;
    public static readonly MODE_ADD: number;
    public static readonly MODE_SCREEN: number;

    public constructor();
    public constructor(width: number, height: number);
    public static setCurrent(current: Graphics | null): void;
    public setDrawMode(mode: number): void;
    public clearAlphaMap(): void;
    public flush(): void;
    public getFont(): Font;
    public setFont(font: Font): void;
    public resetFont(): void;
    public setBackground(color: Color): void;
    public getBackground(): Color;
    public clear(): void;
    public resetTransform(): void;
    public scale(x: number, y: number): void;
    public rotate(x: number, y: number, angle: number): void;
    public translate(x: number, y: number): void;
    public setColor(color: Color): void;
    public getColor(): Color;
    public drawLine(x1: number, y1: number, x2: number, y2: number): void;
    public drawRect(x: number, y: number, width: number, height: number): void;
    public fillRect(x: number, y: number, width: number, height: number): void;
    public fillRect(x: number, y: number, width: number, height: number, fill: unknown): void;
    public clearClip(): void;
    public setClip(x: number, y: number, width: number, height: number): void;
    public clearWorldClip(): void;
    public setWorldClip(x: number, y: number, width: number, height: number): void;
    public drawOval(x: number, y: number, width: number, height: number): void;
    public drawArc(x: number, y: number, width: number, height: number, start: number, end: number): void;
    public fillOval(x: number, y: number, width: number, height: number): void;
    public fillArc(x: number, y: number, width: number, height: number, start: number, end: number): void;
    public drawRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    public fillRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    public setLineWidth(width: number): void;
    public getLineWidth(): number;
    public resetLineWidth(): void;
    public setAntiAlias(antiAlias: boolean): void;
    public isAntiAlias(): boolean;
    public drawString(text: string, x: number, y: number): void;
    public drawImage(image: Image, x: number, y: number): void;
    public drawImage(image: Image, x: number, y: number, color: Color): void;
    public drawImage(image: Image, x: number, y: number, width: number, height: number): void;
    public drawImage(image: Image, x: number, y: number, width: number, height: number, color: Color): void;
    public copyArea(target: Image, x: number, y: number): void;
    public getPixel(x: number, y: number): Color;
    public getArea(x: number, y: number, width: number, height: number): Image;
    public getArea(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    public drawGradientLine(x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, x2: number, y2: number, r2: number, g2: number, b2: number, a2: number): void;
    public pushTransform(): void;
    public popTransform(): void;
    public destroy(): void;
}
```

Implementation instructions:

- Required by the games: `clearClip`, `clearWorldClip`, `drawImage`, `drawLine`, `drawRect`, `fillRect`, `flush`, `getArea`, `getColor`, `setClip`, `setColor`, and `setWorldClip`.
- Maintain current color as a copy so later mutation of the caller's `Color` does not unexpectedly change drawing state.
- `fillRect` and `drawRect` use the current `Color`.
- `drawImage` delegates to image drawing while applying the current transform, clip, alpha, and color filter.
- `setClip` clips in container/screen coordinates.
- `setWorldClip` clips in current world coordinates and must be affected by the active transform.
- `clearClip` removes the screen clip.
- `clearWorldClip` removes the world clip.
- `getArea` returns an offscreen `Image` containing pixels copied from the current render target.
- `getArea(..., target)` writes RGBA bytes into the supplied buffer for cursor compatibility code.
- `flush` must submit the current WebGL batch and synchronize deferred state before readback, cursor extraction, framebuffer switches, or `SlickCallable` safe blocks.
- Shape and `ShapeFill` overloads are phase-one browser-adapted unsupported methods because the three source games do not call them. Their overload signatures must exist and throw `SlickException` with a message naming the unsupported overload. If later implemented, update this document with exact shape tessellation rules before changing behavior.

### `slick.Input`

```ts
export class Input {
    public static readonly ANY_CONTROLLER: number;
    public static readonly MOUSE_LEFT_BUTTON: number;
    public static readonly MOUSE_RIGHT_BUTTON: number;
    public static readonly MOUSE_MIDDLE_BUTTON: number;

    public static readonly KEY_ESCAPE: number;
    public static readonly KEY_1: number;
    public static readonly KEY_2: number;
    public static readonly KEY_3: number;
    public static readonly KEY_4: number;
    public static readonly KEY_5: number;
    public static readonly KEY_6: number;
    public static readonly KEY_7: number;
    public static readonly KEY_8: number;
    public static readonly KEY_9: number;
    public static readonly KEY_0: number;
    public static readonly KEY_Q: number;
    public static readonly KEY_W: number;
    public static readonly KEY_E: number;
    public static readonly KEY_R: number;
    public static readonly KEY_T: number;
    public static readonly KEY_Y: number;
    public static readonly KEY_U: number;
    public static readonly KEY_I: number;
    public static readonly KEY_O: number;
    public static readonly KEY_P: number;
    public static readonly KEY_ENTER: number;
    public static readonly KEY_A: number;
    public static readonly KEY_S: number;
    public static readonly KEY_D: number;
    public static readonly KEY_F: number;
    public static readonly KEY_G: number;
    public static readonly KEY_H: number;
    public static readonly KEY_J: number;
    public static readonly KEY_K: number;
    public static readonly KEY_L: number;
    public static readonly KEY_Z: number;
    public static readonly KEY_X: number;
    public static readonly KEY_C: number;
    public static readonly KEY_V: number;
    public static readonly KEY_B: number;
    public static readonly KEY_N: number;
    public static readonly KEY_M: number;
    public static readonly KEY_SPACE: number;
    public static readonly KEY_F1: number;
    public static readonly KEY_F2: number;
    public static readonly KEY_F3: number;
    public static readonly KEY_F4: number;
    public static readonly KEY_F5: number;
    public static readonly KEY_F6: number;
    public static readonly KEY_F7: number;
    public static readonly KEY_F8: number;
    public static readonly KEY_F9: number;
    public static readonly KEY_F10: number;
    public static readonly KEY_F11: number;
    public static readonly KEY_F12: number;
    public static readonly KEY_UP: number;
    public static readonly KEY_LEFT: number;
    public static readonly KEY_RIGHT: number;
    public static readonly KEY_DOWN: number;

    public static disableControllers(): void;
    public static getKeyName(code: number): string;
    public constructor(height: number);
    public bindToElement(target: HTMLElement | Window | Document): void;
    public setPreventDefaultElement(element: HTMLElement | null): void;
    public unbind(): void;
    public setDoubleClickInterval(delay: number): void;
    public setMouseClickTolerance(mouseClickTolerance: number): void;
    public initControllers(): void;
    public addListener(listener: InputListener): void;
    public removeListener(listener: InputListener): void;
    public removeAllListeners(): void;
    public removeAllKeyListeners(): void;
    public removeAllMouseListeners(): void;
    public removeAllControllerListeners(): void;
    public addPrimaryListener(listener: InputListener): void;
    public addKeyListener(listener: KeyListener): void;
    public removeKeyListener(listener: KeyListener): void;
    public addMouseListener(listener: MouseListener): void;
    public removeMouseListener(listener: MouseListener): void;
    public addControllerListener(listener: ControllerListener): void;
    public removeControllerListener(listener: ControllerListener): void;
    public setScale(xscale: number, yscale: number): void;
    public setOffset(xoffset: number, yoffset: number): void;
    public resetInputTransform(): void;
    public isKeyPressed(key: number): boolean;
    public isKeyDown(key: number): boolean;
    public clearKeyPressedRecord(): void;
    public clearControlPressedRecord(): void;
    public clearMousePressedRecord(): void;
    public isControlPressed(button: number): boolean;
    public isControlPressed(button: number, controller: number): boolean;
    public isButtonPressed(index: number, controller: number): boolean;
    public isButton1Pressed(controller: number): boolean;
    public isButton2Pressed(controller: number): boolean;
    public isButton3Pressed(controller: number): boolean;
    public isButtonDown(index: number, controller: number): boolean;
    public getControllerCount(): number;
    public getAxisCount(controller: number): number;
    public getAxisValue(controller: number, axis: number): number;
    public getAxisName(controller: number, axis: number): string;
    public isControllerLeft(controller: number): boolean;
    public isControllerRight(controller: number): boolean;
    public isControllerUp(controller: number): boolean;
    public isControllerDown(controller: number): boolean;
    public isControllerLeftPressed(controller: number): boolean;
    public isControllerRightPressed(controller: number): boolean;
    public isControllerUpPressed(controller: number): boolean;
    public isControllerDownPressed(controller: number): boolean;
    public getAbsoluteMouseX(): number;
    public getAbsoluteMouseY(): number;
    public getMouseX(): number;
    public getMouseY(): number;
    public isMouseButtonDown(button: number): boolean;
    public isMousePressed(button: number): boolean;
    public consumeEvent(): void;
    public considerDoubleClick(button: number, x: number, y: number): void;
    public poll(width: number, height: number): void;
    public enableKeyRepeat(initial: number, interval: number): void;
    public enableKeyRepeat(): void;
    public disableKeyRepeat(): void;
    public isKeyRepeatEnabled(): boolean;
    public pause(): void;
    public resume(): void;
}
```

Implementation instructions:

- Required by the games: key constants listed above, `clearControlPressedRecord`, `clearKeyPressedRecord`, `isButtonPressed`, `isControllerDown`, `isControllerLeft`, `isControllerRight`, `isControllerUp`, `isKeyDown`, and `isKeyPressed`.
- Mouse button constants must be `MOUSE_LEFT_BUTTON = 0`, `MOUSE_RIGHT_BUTTON = 1`, and `MOUSE_MIDDLE_BUTTON = 2`.
- `ANY_CONTROLLER` must be `-1`.
- Preserve original LWJGL numeric key values. The constants used by the source games must be:
  - `KEY_ESCAPE = 0x01`
  - `KEY_2 = 0x03`
  - `KEY_4 = 0x05`
  - `KEY_6 = 0x07`
  - `KEY_8 = 0x09`
  - `KEY_W = 0x11`
  - `KEY_Y = 0x15`
  - `KEY_I = 0x17`
  - `KEY_P = 0x19`
  - `KEY_ENTER = 0x1C`
  - `KEY_A = 0x1E`
  - `KEY_S = 0x1F`
  - `KEY_D = 0x20`
  - `KEY_F = 0x21`
  - `KEY_J = 0x24`
  - `KEY_K = 0x25`
  - `KEY_L = 0x26`
  - `KEY_Z = 0x2C`
  - `KEY_X = 0x2D`
  - `KEY_SPACE = 0x39`
  - `KEY_F12 = 0x58`
  - `KEY_UP = 0xC8`
  - `KEY_LEFT = 0xCB`
  - `KEY_RIGHT = 0xCD`
  - `KEY_DOWN = 0xD0`
- `isKeyDown` returns continuous held state.
- `isKeyPressed` returns true once per physical press until cleared or consumed.
- `clearKeyPressedRecord` clears all one-shot key pressed state.
- `clearControlPressedRecord` clears all one-shot controller pressed state.
- `clearMousePressedRecord` clears all one-shot mouse pressed state.
- `bindToElement` and `unbind` are browser parity helpers used by containers. They attach/remove keyboard, pointer, wheel, and gamepad event handling without changing Java-facing polling methods.
- `setPreventDefaultElement(element)` records the canvas or host element whose focused game keys should suppress browser defaults. Suppress only mapped game-control keys and never suppress while an `input`, `textarea`, `select`, `button`, or `contentEditable` element owns focus.
- Keyboard events from focused interactive DOM controls must be ignored by Slick state and listeners entirely, not merely allowed to keep their browser default behavior.
- Pointer and wheel events outside the prevent-default/game element must be ignored unless they are completing an existing game drag/release.
- `pause()` clears held key/mouse state plus key, mouse, and controller pressed records. `poll()` must clear those pressed records and return while paused, matching Java Slick2D.
- `bindToElement` must also install browser lost-focus cleanup on `window.blur` and document `visibilitychange`. The cleanup clears `downKeys`, `downMouse`, `pressedKeys`, `pressedMouse`, and `controlPressed`.
- `poll()` must clear all browser-held input state and return when the document is hidden or `document.hasFocus()` is false.
- `setScale` and `setOffset` are required by `ScalableGame` and `ScalableGame2`; they transform browser pointer coordinates into game coordinates.
- Gamepad direction methods must support `Input.ANY_CONTROLLER`.
- `isButton1Pressed`, `isButton2Pressed`, and `isButton3Pressed` delegate to `isButtonPressed(0/1/2, controller)`.
- `isControlPressed(button, controller)` consumes one-shot controller control state using Slick's control indexes: left `0`, right `1`, up `2`, down `3`, button 1 `4`, button 2 `5`, button 3 `6`, and so on. `isButtonPressed(index, controller)` is the zero-based physical-button polling API and must not add the directional offset.
- `getControllerCount`, `getAxisCount`, `getAxisValue`, and `getAxisName` read from the Gamepad API and return `0`, `0`, `0`, and `""` for missing controllers or axes.
- `disableControllers` records that controller polling must be skipped.
- Key repeat methods record repeat settings and synthesize repeated `keyPressed` callbacks only when enabled.

### `slick.Sound`

```ts
export class Sound {
    public constructor(ref: string);
    public constructor(url: URL);
    public constructor(input: ArrayBuffer | Blob, ref: string);
    public ready(): Promise<void>;
    public load(): Promise<void>;
    public play(): void;
    public play(pitch: number, volume: number): void;
    public playAt(pitch: number, volume: number, x: number, y: number, z: number): void;
    public loop(): void;
    public loop(pitch: number, volume: number): void;
    public playing(): boolean;
    public stop(): void;
}
```

Implementation instructions:

- Required by the games: `constructor(ref)`, `play()`, `play(pitch, volume)`, `playing()`, and `stop()`.
- Constructors queue byte fetch and Web Audio decode immediately, matching Java's observable "loaded after construction" behavior through an async browser barrier.
- `ready()` and `load()` return the decode readiness promise and reject with `SlickException` on missing/corrupt audio. Java-style game code may keep `play()` synchronous as long as the port's loading flow awaits the shared resource barrier.
- `play()` uses pitch `1` and volume `1`.
- `play(pitch, volume)` clamps volume to `0..1` and maps pitch to playback rate.
- `playing()` returns true for handles that have been requested and have not ended, stopped, or failed, including a first play that is waiting for an already-queued browser decode to settle.
- `playAt` is a browser-adapted parity method: ignore positional coordinates and behave exactly like `play(pitch, volume)`.
- `loop` repeats until `stop`.

### `slick.Music`

```ts
export class Music {
    public constructor(ref: string);
    public constructor(ref: string, streamingHint: boolean);
    public constructor(url: URL);
    public constructor(url: URL, streamingHint: boolean);
    public constructor(input: ArrayBuffer | Blob, ref: string);
    public static poll(delta: number): void;
    public ready(): Promise<void>;
    public load(): Promise<void>;
    public addListener(listener: MusicListener): void;
    public removeListener(listener: MusicListener): void;
    public play(): void;
    public play(pitch: number, volume: number): void;
    public loop(): void;
    public loop(pitch: number, volume: number): void;
    public pause(): void;
    public stop(): void;
    public resume(): void;
    public playing(): boolean;
    public setVolume(volume: number): void;
    public getVolume(): number;
    public setPosition(position: number): boolean;
    public getPosition(): number;
    public fade(duration: number, endVolume: number, stopAfterFade: boolean): void;
}
```

Implementation instructions:

- Required by the games: `constructor(ref)`, `constructor(ref, streamingHint)`, `loop`, `play`, `playing`, `setVolume`, and `stop`.
- `streamingHint` is accepted for Java constructor parity. Phase one uses decoded Web Audio buffers for both streaming-hint values; do not introduce `HTMLAudioElement` streaming unless a later audit documents exact handoff semantics.
- Constructors queue byte fetch and Web Audio decode immediately. `ready()` and `load()` expose that browser readiness promise and reject with `SlickException` when the track cannot be fetched or decoded.
- `play()` uses pitch `1` and the instance's current volume.
- `loop()` loops indefinitely.
- Starting a track makes it the single current music instance, stops any previous current music, and fires `musicSwapped(oldMusic, this)` on the old music's listeners.
- `playing()` returns true only while this instance is the current music and has not ended, stopped, paused, or been swapped out.
- `pause()` is the public Java `Music.pause()` equivalent: it stores the current position, stops the active `AudioBufferSourceNode`, and makes `playing()` false.
- Global music-off suspension is separate from public `pause()`: it stops audible playback and stores position without clearing `playing()` or `currentMusic`.
- `resume()` starts a new source at the stored public-pause position because Web Audio source nodes are one-shot. Global music-on resume uses the same one-shot-source restart internally while preserving Java global music toggle semantics.
- `setVolume(volume)` clamps and stores `0..1` volume.
- `setPosition(position)` returns whether the backend accepted the seek, matching Slick2D's boolean return.
- `fade(duration, endVolume, stopAfterFade)` stores a fade operation in milliseconds; `Music.poll(delta)` advances active fades and dispatches end-of-track listener events.
- `stop()` must make `playing()` false immediately from user code's point of view, even if the browser audio node finishes cleanup asynchronously.

### `slick.MusicListener`

```ts
export interface MusicListener {
    musicEnded(music: Music): void;
    musicSwapped(music: Music, newMusic: Music): void;
}
```

Implementation instructions:

- Notify listeners when a non-looping track ends.
- Notify the old current music's listeners through `musicSwapped(oldMusic, newMusic)` when a new `Music` instance replaces it, matching Java Slick2D's single-channel handoff.

### `slick.PackedSpriteSheet`

```ts
export class PackedSpriteSheet {
    public constructor(def: string);
    public constructor(def: string, trans: Color);
    public constructor(def: string, filter: number);
    public constructor(def: string, filter: number, trans: Color);
    public getFullImage(): Image;
    public getSprite(name: string): Image;
    public getSpriteSheet(name: string): SpriteSheet;
}
```

Implementation instructions:

- Required by the games: `constructor(def, Image.FILTER_NEAREST)` and `getSprite(name)`.
- Browser contract: the `.def` bytes must already be available through `ResourceLoader.getResourceAsStream(def)` before construction. Use `ResourceLoader.loadResource(def)` plus `waitForAll()`, or `registerResource(def, bytes)`, from the host/game loader.
- Parse Slick2D `.def` packed-sheet files using the copied Java parser shape:
  - Normalize `\` to `/` in the `.def` path.
  - Compute `basePath` from the directory of the `.def` file.
  - The first line is the backing image filename, loaded as `basePath + firstLine`.
  - Each section consumes a delimiter line, then `name`, `x`, `y`, `width`, `height`, `tilesx`, `tilesy`, then two ignored lines.
  - Clamp `tilesx` and `tilesy` to at least `1`.
- Load the sheet image with the supplied filter and transparent color.
- `getSprite` returns a subimage preserving the parent image filter and transparency.
- Unknown sprite names must throw `Error` with message `Unknown sprite from packed sheet: ${name}`, matching the copied Java behavior.
- `getSpriteSheet(name)` returns a `SpriteSheet` over the named section with tile size `section.width / section.tilesx` by `section.height / section.tilesy`.

### `slick.XMLPackedSheet`

```ts
export class XMLPackedSheet {
    public constructor(imageRef: string, xmlRef: string);
    public getSprite(name: string): Image | null;
}
```

Implementation instructions:

- Required heavily by the source project that uses XML sprite atlases.
- Browser contract: the XML bytes must already be available through `ResourceLoader.getResourceAsStream(xmlRef)` before construction. Use `ResourceLoader.loadResource(xmlRef)` plus `waitForAll()`, or `registerResource(xmlRef, bytes)`, from the host/game loader.
- Load `imageRef` as the backing image exactly like the Java code: `new Image(imageRef, false, Image.FILTER_NEAREST)`.
- Load `xmlRef` as XML text and parse it with `DOMParser`.
- Parse `<sprite>` entries with `name`, `x`, `y`, `width`, and `height` attributes.
- `getSprite` returns an `Image` subimage or `null` when missing.

### `slick.SpriteSheet`

```ts
export class SpriteSheet extends Image {
    public constructor(ref: string, tw: number, th: number);
    public constructor(ref: string, tw: number, th: number, spacing: number);
    public constructor(ref: string, tw: number, th: number, spacing: number, margin: number);
    public constructor(ref: string, tw: number, th: number, col: Color);
    public constructor(ref: string, tw: number, th: number, col: Color, spacing: number);
    public constructor(image: Image, tw: number, th: number);
    public constructor(image: Image, tw: number, th: number, spacing: number);
    public constructor(image: Image, tw: number, th: number, spacing: number, margin: number);
    public getSubImage(x: number, y: number): Image;
    public getSprite(x: number, y: number): Image;
    public getHorizontalCount(): number;
    public getVerticalCount(): number;
    public startUse(): void;
    public renderInUse(x: number, y: number, sx: number, sy: number): void;
    public endUse(): void;
}
```

Implementation instructions:

- Needed because `PackedSpriteSheet.getSpriteSheet` exposes it.
- `SpriteSheet` must extend `Image`, matching Java Slick2D.
- String constructors load with `Image.FILTER_NEAREST`.
- `getSubImage` and `getSprite` return a tile image by sheet index, not pixel coordinate.
- `getSubImage` returns cached tile images; `getSprite` validates bounds and returns a tile image view.
- `spacing` and `margin` use Slick2D tile layout rules, including the Java vertical-count remainder increment.
- `startUse()` flushes the active batch and records this sprite sheet as the active sheet-in-use.
- `renderInUse(x, y, sx, sy)` draws `getSprite(sx, sy)` at `x, y` and must only be valid between `startUse()` and `endUse()`.
- `endUse()` flushes the active batch and clears the active sheet-in-use flag.

### `slick.GameContainer`

```ts
export abstract class GameContainer {
    public static stencil: boolean;
    public static enableStencil(): void;
    public static enableSharedContext(): void;
    public static getSharedContext(): unknown | null;
    public static getBuildVersion(): number;

    public constructor(game: Game);
    public getInput(): Input;
    public getGraphics(): Graphics;
    public getWidth(): number;
    public getHeight(): number;
    public getScreenWidth(): number;
    public getScreenHeight(): number;
    public getAspectRatio(): number;
    public getFPS(): number;
    public getTime(): number;
    public sleep(milliseconds: number): void;
    public setAlwaysRender(alwaysRender: boolean): void;
    public getAlwaysRender(): boolean;
    public setClearEachFrame(clear: boolean): void;
    public setShowFPS(show: boolean): void;
    public isShowingFPS(): boolean;
    public setSmoothDeltas(smooth: boolean): void;
    public setVSync(sync: boolean): void;
    public isVSyncRequested(): boolean;
    public setTargetFrameRate(frameRate: number): void;
    public setMinimumLogicUpdateInterval(interval: number): void;
    public setMaximumLogicUpdateInterval(interval: number): void;
    public setUpdateOnlyWhenVisible(updateOnlyWhenVisible: boolean): void;
    public isUpdatingOnlyWhenVisible(): boolean;
    public setSoundOn(on: boolean): void;
    public isSoundOn(): boolean;
    public setMusicOn(on: boolean): void;
    public isMusicOn(): boolean;
    public setSoundVolume(volume: number): void;
    public getSoundVolume(): number;
    public setMusicVolume(volume: number): void;
    public getMusicVolume(): number;
    public setFullscreen(fullscreen: boolean): void | Promise<void>;
    public isFullscreen(): boolean;
    public setIcon(ref: string): void;
    public setIcons(refs: string[]): void;
    public setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(data: ImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setAnimatedMouseCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): void | Promise<void>;
    public setDefaultMouseCursor(): void;
    public setDefaultFont(font: Font): void;
    public getDefaultFont(): Font;
    public setMouseGrabbed(grabbed: boolean): void | Promise<void>;
    public isMouseGrabbed(): boolean;
    public setPaused(paused: boolean): void;
    public isPaused(): boolean;
    public pause(): void;
    public resume(): void;
    public setForceExit(forceExit: boolean): void;
    public exit(): void;
    public hasFocus(): boolean;
    public reinit(): void | Promise<void>;
    public setMultiSample(samples: number): void;
    public supportsMultiSample(): boolean;
    public getSamples(): number;
    public setVerbose(verbose: boolean): void;
}
```

Implementation instructions:

- Required by the games: `getHeight`, `getInput`, `getWidth`, `isFullscreen`, `setAlwaysRender`, `setClearEachFrame`, `setFullscreen`, `setIcon`, `setMusicOn`, `setShowFPS`, `setSmoothDeltas`, and `setVSync`.
- The static `stencil` flag and static `enableStencil()` exist for copied container code that chooses a `PixelFormat`.
- `enableSharedContext()` records that subsequent containers must share the active WebGL renderer resource owner. It must not create a native pbuffer. If no browser WebGL context can be created, throw `SlickException`.
- `getSharedContext()` returns the active shared WebGL context or internal shared renderer handle after `enableSharedContext()` succeeds; otherwise it returns `null`.
- `getBuildVersion()` loads the resource named exactly `version` through `ResourceLoader.getResourceAsStream("version")`, parses Java `.properties` key `build`, logs `Slick Build #${build}`, and returns the parsed integer. On any failure it logs `Unable to determine Slick build number` and returns `-1`, matching Java Slick2D.
- Store a reference to the `Game`, `Input`, and primary `Graphics`.
- `getWidth` and `getHeight` return logical game size, not necessarily CSS pixel size.
- `getScreenWidth` and `getScreenHeight` return the actual canvas backing size.
- `setClearEachFrame` controls whether the canvas is cleared before each render.
- `setAlwaysRender` controls rendering while paused or unfocused.
- `setSmoothDeltas` can enable delta smoothing but must default to Java-like raw deltas.
- `setVSync` records requested behavior; browsers already sync `requestAnimationFrame`.
- `setSoundOn`, `setMusicOn`, and volume methods feed the audio subsystem.
- Mouse cursor overloads map to CSS cursor assets. `ImageData`, `Image`, and `Cursor` overloads must create an object URL or data URL from decoded pixels, then revoke old generated URLs when the cursor changes.
- `setAnimatedMouseCursor` must use the first frame as the browser-adapted cursor image and must preserve the delay array for diagnostics because CSS animated cursor support is not portable.
- `sleep(milliseconds)` is a browser-adapted compatibility no-op: record the requested delay in diagnostics and return immediately. It must never busy-wait or block the event loop.
- `enableStencil`, `setMultiSample`, and `supportsMultiSample` are browser-adapted compatibility functions. `enableStencil()` must request `{ stencil: true }` before WebGL context creation; multisample maps to WebGL context attributes or renderbuffer setup when available.

### `slick.AppGameContainer`

```ts
export type AppGameContainerErrorHandler = (error: Error) => void;

export class AppGameContainer extends GameContainer {
    public constructor(game: Game);
    public constructor(game: Game, width: number, height: number, fullscreen: boolean);
    public setErrorHandler(handler: AppGameContainerErrorHandler | null): void;
    public supportsAlphaInBackBuffer(): boolean;
    public setTitle(title: string): void;
    public setDisplayMode(width: number, height: number, fullscreen: boolean): void | Promise<void>;
    public isFullscreen(): boolean;
    public setFullscreen(fullscreen: boolean): void | Promise<void>;
    public reinit(): void | Promise<void>;
    public start(): Promise<void>;
    public setUpdateOnlyWhenVisible(updateOnlyWhenVisible: boolean): void;
    public isUpdatingOnlyWhenVisible(): boolean;
    public setIcon(ref: string): void;
    public setIcons(refs: string[]): void;
    public setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(data: ImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setAnimatedMouseCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): void | Promise<void>;
    public setMouseGrabbed(grabbed: boolean): void | Promise<void>;
    public isMouseGrabbed(): boolean;
    public hasFocus(): boolean;
    public getScreenHeight(): number;
    public getScreenWidth(): number;
    public destroy(): void;
    public setDefaultMouseCursor(): void;
}
```

Implementation instructions:

- Required by the games: constructor, `setAlwaysRender`, `setClearEachFrame`, `setDisplayMode`, `setShowFPS`, `setSmoothDeltas`, `setSoundOn`, `setVSync`, and `start`.
- `start` creates or binds the canvas, initializes input/audio/rendering, calls `game.init`, resolves resources queued during init, and begins the browser loop.
- The RAF loop must match Java close behavior: check `Display.isCloseRequested()` first, and call `game.closeRequested()` only inside that branch.
- `start` focuses the canvas, routes input through `Input.bindToElement(window)`, and calls `Input.setPreventDefaultElement(canvas)` so game keys suppress browser defaults only during canvas-owned play.
- If resources are queued during a later `update`, the loop must finish rendering the current progress frame, wait for `ResourceLoader.waitForAll()`, reset `lastFrameTime`, and then resume. Rejections destroy the container and throw a `SlickException` or the original `Error`.
- `start()` must wrap canvas setup, renderer/audio initialization, `game.init()`, and the initial `ResourceLoader.waitForAll()` in cleanup/error handling. Startup failure must unbind input, remove browser listeners, dispose renderer state, reset `Display`, set `started=false`, and leave the same container retryable.
- `setErrorHandler(handler)` installs the host callback for startup and async frame/resource errors. When present, the container must destroy itself and call the handler instead of relying on a raw RAF exception. When absent during startup, `start()` rejects after cleanup.
- `setDisplayMode(width, height, fullscreen)` sets logical width and height, updates canvas sizing, then calls `setFullscreen(fullscreen)`. It returns the fullscreen promise when the browser starts one; ports that need immediate scale recalculation must await that promise.
- `setFullscreen(fullscreen)` updates browser fullscreen state, then applies actual browser display dimensions after the promise resolves. `fullscreenchange` and `resize` events must also refresh canvas/WebGL display sizing.
- `destroy` stops the loop, clears the input prevent-default element, releases event listeners, disposes the renderer backend, calls `Display.destroy()`, and unregisters the active container.
- `supportsAlphaInBackBuffer` returns whether the backing canvas supports alpha.
- `hasFocus()` must return false when `document.hasFocus()` is false; a stale canvas `activeElement` must not override browser focus loss.
- The constructor without dimensions must use Slick2D's default `640x480` unless project configuration overrides it.

### `slick.ApplicationGameContainer`

```ts
export class ApplicationGameContainer extends AppGameContainer {
    public constructor(game: Game);
    public constructor(game: Game, width: number, height: number, fullscreen: boolean);
    public setResizable(resizable: boolean): void;
    public isResizable(): boolean;
}
```

Implementation instructions:

- This class supports the custom desktop-style application container found in the source audit.
- It inherits all behavior from `AppGameContainer`.
- `setResizable` toggles whether browser resize events update the canvas/container size.
- Java's `setIcon(ref)` path uses `LoadableImageData` and `Display.setIcon`. In TS, load the same resource bytes through `ResourceLoader`, decode with `TGAImageData` for `.tga` or `ImageIOImageData` otherwise, then set the browser favicon or no-op when the host page owns icons.
- `start()` creates or attaches an `HTMLCanvasElement`, initializes WebGL, initializes controllers/input, calls `game.init`, then enters the fixed-step RAF game loop.
- `setDisplayMode(width, height, fullscreen)` updates the logical container size and fullscreen request state. It returns `Promise<void>` when a browser fullscreen enter or exit request is started; otherwise it returns `void`.

### `slick.ScalableGame`

```ts
export class ScalableGame implements Game {
    public constructor(held: Game, normalWidth: number, normalHeight: number);
    public constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    public init(container: GameContainer): void | Promise<void>;
    public update(container: GameContainer, delta: number): void;
    public render(container: GameContainer, g: Graphics): void;
    protected renderOverlay(container: GameContainer, g: Graphics): void;
    public recalculateScale(): void;
    public closeRequested(): boolean;
    public getTitle(): string;
}
```

Implementation instructions:

- Wrap a held `Game` and render it at a fixed logical size.
- Constructor `(held, normalWidth, normalHeight)` must delegate to `(held, normalWidth, normalHeight, false)`, matching Java Slick2D.
- `init` forwards to the held game.
- `update` must call `recalculateScale()` before forwarding when `targetHeight != container.getHeight()` or `targetWidth != container.getWidth()`, even though this causes repeated recalculation while letterboxed. Preserve the Java behavior.
- `render` recomputes local offsets from current target/container dimensions, calls `SlickCallable.enterSafeBlock`, clips to the target area, calls `GL.glTranslatef(xoffset, yoffset, 0)`, calls `g.scale(targetWidth / normalWidth, targetHeight / normalHeight)`, renders the held game between matrix push/pop, clears the clip, leaves the safe block, and then calls `renderOverlay`.
- `recalculateScale` recomputes scale and target bounds based on container size.
- If `maintainAspect` is true, use the Java wide-screen branch exactly: `normalIsWide = normalWidth / normalHeight > 1.6`, `containerIsWide = targetWidth / targetHeight > 1.6`, `wScale = targetWidth / normalWidth`, and `hScale = targetHeight / normalHeight`. Use min scale when both are wide or both are not wide, width scale when only the normal size is wide, and height scale when only the container is wide.
- Update `Input.setScale` and `Input.setOffset` so mouse coordinates map back to logical game coordinates.

### `slick.ScalableGame2`

```ts
export class ScalableGame2 extends ScalableGame {
    public constructor(held: Game, normalWidth: number, normalHeight: number);
    public constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    public containerSizeChanged(container: GameContainer): void;
}
```

Implementation instructions:

- This is required by the source projects that copy a custom `ScalableGame2`.
- Keep behavior equivalent to the copied Java class.
- Constructor `(held, normalWidth, normalHeight)` must delegate to `(held, normalWidth, normalHeight, false)`.
- During `init` and `containerSizeChanged`, start with `targetWidth = container.getWidth()` and `targetHeight = container.getHeight()`.
- When `maintainAspect` is true, use the copied Java aspect decision exactly: `normalIsWide = normalWidth / normalHeight > 1.6` and `containerIsWide = targetWidth / targetHeight > 1.6`. Choose the limiting scale with the same wide/not-wide branches as the source class.
- After aspect adjustment, initialize `xoffset` and `yoffset` to `0`; set `yoffset = (container.getHeight() - targetHeight) / 2` only when `targetHeight < container.getHeight()`, and set `xoffset = (container.getWidth() - targetWidth) / 2` only when `targetWidth < container.getWidth()`.
- Update input scale exactly as Java does: `container.getInput().setScale(normalWidth / targetWidth, normalHeight / targetHeight)`.
- Update input offset exactly as Java does: `container.getInput().setOffset(-xoffset / (targetWidth / normalWidth), -yoffset / (targetHeight / normalHeight))`.
- If the held game implements `InputListener`, add it to `container.getInput()` during `init`.
- The render path must preserve this sequence: `SlickCallable.enterSafeBlock`, `g.setClip(xoffset, yoffset, targetWidth, targetHeight)`, `GL.glTranslatef(xoffset, yoffset, 0)`, `GL.glScalef(targetWidth / normalWidth, targetHeight / normalHeight, 0)`, `GL.glPushMatrix`, held `render`, `GL.glPopMatrix`, `g.clearClip`, `SlickCallable.leaveSafeBlock`, then `renderOverlay`.

### `slick.util.FastTrig`

```ts
export class FastTrig {
    public static sin(radians: number): number;
    public static cos(radians: number): number;
}
```

Implementation instructions:

- Required by the games: `sin` and `cos`.
- Delegate to `Math.sin` and `Math.cos`.
- Keep arguments in radians.

### `slick.util.Log`

```ts
export class Log {
    public static setVerbose(verbose: boolean): void;
    public static checkVerboseLogSetting(): void;
    public static error(message: string): void;
    public static error(cause: unknown): void;
    public static error(message: string, cause: unknown): void;
    public static warn(message: string): void;
    public static warn(message: string, cause: unknown): void;
    public static info(message: string): void;
    public static debug(message: string): void;
}
```

Implementation instructions:

- Required by copied container/helper code: `error` and `info`.
- Route to `console.error`, `console.warn`, `console.info`, and `console.debug`.
- Respect the verbose flag for `info` and `debug` if the Java code would have done so.

### `slick.util.ResourceLoader`

```ts
export class ResourceLoader {
    public static addResourceLocation(location: unknown): void;
    public static removeResourceLocation(location: unknown): void;
    public static removeAllResourceLocations(): void;
    public static setCacheBust(value: string | number | null): void;
    public static setRetryOptions(retries: number, delayMs?: number): void;
    public static getResource(ref: string): URL | null;
    public static getResourceAsStream(ref: string): ArrayBuffer | null;
    public static resourceExists(ref: string): boolean;
    public static registerResource(ref: string, data: ArrayBuffer | Uint8Array): void;
    public static loadResource(ref: string): Promise<ArrayBuffer>;
    public static track<T>(promise: Promise<T>): Promise<T>;
    public static getPendingCount(): number;
    public static hasPending(): boolean;
    public static resourceFailed(ref: string): boolean;
    public static getResourceError(ref: string): unknown;
    public static waitForAll(): Promise<void>;
    public static clearCache(): void;
}
```

Implementation instructions:

- Keep the public Java method names for compatibility.
- Back these calls with the modern resource manager from `docs/RESOURCE-MANAGEMENT-SYSTEM.md`.
- Browser code cannot synchronously fetch new network resources. These methods may only return already loaded resources.
- `addResourceLocation(location)` appends a browser base location to the ordered search list. Use `""` for relative-to-current-page lookup, `/assets` for origin-root assets, `assets` for deployed-route-relative assets, and absolute URLs for CDN-style locations.
- `removeAllResourceLocations()` clears the list completely, matching Java. No network lookup occurs until another location is added.
- `getResource(ref)` returns the first syntactically resolvable candidate URL and is not proof that the resource exists.
- `loadResource(ref)` is the browser async fetch/decode-byte entry point. It must cache in-flight requests by the original Java ref string, but a previous failed record must not permanently block a retry.
- `loadResource(ref)` must generate every candidate URL from the ordered locations, apply cache-bust to each candidate, run configured retries for that candidate, and then try the next candidate before failing.
- `setCacheBust(value)` configures the network URL query parameter `v`. Passing `null` clears the setting. The cache key remains the original Java ref.
- `setRetryOptions(retries, delayMs)` configures fetch retries. Clamp negative values to zero and wait `delayMs` between attempts when greater than zero.
- `track(promise)` adds browser-only preparation work, such as `ImageBitmap` decode, to `waitForAll()` without changing Java method names.
- `getPendingCount()` returns queued byte fetches plus tracked browser preparation promises that have not settled.
- `hasPending()` returns `getPendingCount() > 0` and is used by the container loop to catch dynamic Java-style loading steps after startup.
- `waitForAll()` is the preload barrier that must be awaited before code constructs classes that synchronously parse bytes, including `PackedSpriteSheet`, `XMLPackedSheet`, and game-local `BinaryReader`/map loaders.
- Provide additional modern async helpers in this class only if they do not replace the Java-named methods.

### `slick.opengl.SlickCallable`

```ts
export class SlickCallable {
    public static enterSafeBlock(): void;
    public static leaveSafeBlock(): void;
}
```

Implementation instructions:

- Required by `ScalableGame2`.
- Treat `enterSafeBlock` as a graphics state save and batch flush boundary.
- Treat `leaveSafeBlock` as the matching restore boundary.
- Nesting must be supported.

### `slick.opengl.ImageData`

```ts
export interface ImageData {
    getDepth(): number;
    getWidth(): number;
    getHeight(): number;
    getTexWidth(): number;
    getTexHeight(): number;
    getImageBufferData(): Uint8Array;
}
```

Implementation instructions:

- Required by cursor compatibility methods.
- This is not the browser DOM `ImageData` type. Use the `slick.opengl.ImageData` name for Java parity.
- `getImageBufferData` returns RGBA bytes in the same orientation expected by cursor creation.

### `slick.opengl.LoadableImageData`

```ts
export interface LoadableImageData extends ImageData {
    configureEdging(edging: boolean): void;
    loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
}
```

Implementation instructions:

- Java Slick2D counterpart: `org.newdawn.slick.opengl.LoadableImageData`.
- Browser code passes bytes that were already loaded by the resource manager; this interface must not fetch.
- `transparent` is a Java-style `int[3]` RGB triplet. Supplying it forces an alpha channel.
- `loadImage` returns byte data equivalent to Java's `ByteBuffer` result and updates `getDepth`, `getWidth`, `getHeight`, `getTexWidth`, and `getTexHeight`.
- `configureEdging` controls whether loaders duplicate edge pixels into power-of-two padding where the Java loader does so.

### `slick.opengl.ImageIOImageData`

```ts
export class ImageIOImageData implements LoadableImageData {
    public constructor();
    public getDepth(): number;
    public getWidth(): number;
    public getHeight(): number;
    public getTexWidth(): number;
    public getTexHeight(): number;
    public configureEdging(edging: boolean): void;
    public loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    public loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    public loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    public imageToByteBuffer(image: ImageBitmap | HTMLImageElement | OffscreenCanvas, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    public getImageBufferData(): Uint8Array;
}
```

Implementation instructions:

- Java Slick2D counterpart: `org.newdawn.slick.opengl.ImageIOImageData`.
- Decode browser-supported formats such as PNG, JPEG, and GIF using `createImageBitmap` or `HTMLImageElement`.
- `loadImage(data)` must behave like Java's no-argument overload and use `flipped = true`.
- `loadImage(data, flipped, transparent)` delegates to the four-argument overload with `forceAlpha = false`.
- If `transparent` is supplied, force an alpha channel and set matching RGB pixels to alpha `0`.
- Compute `texWidth` and `texHeight` as the smallest powers of two greater than or equal to the decoded image dimensions, starting from `2`.
- Use depth `32` when the source has alpha, `forceAlpha` is true, or `transparent` is supplied; otherwise use depth `24`.
- Default edging is `true`. When edging is enabled and the image is smaller than the power-of-two texture, duplicate the edge pixels according to the Java loader's padding behavior.
- The copied `ApplicationGameContainer.setIcons` path calls `loadImage(bytes, false, false, null)` for non-TGA icons.
- `getImageBufferData()` throws because this Java loader does not retain a separate source buffer.

### `slick.opengl.TGAImageData`

```ts
export class TGAImageData implements LoadableImageData {
    public constructor();
    public getDepth(): number;
    public getWidth(): number;
    public getHeight(): number;
    public getTexWidth(): number;
    public getTexHeight(): number;
    public configureEdging(edging: boolean): void;
    public loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    public loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    public loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    public getImageBufferData(): Uint8Array;
}
```

Implementation instructions:

- Java Slick2D counterpart: `org.newdawn.slick.opengl.TGAImageData`.
- Implement the minimal TGA decoder used by Slick2D: uncompressed image type `2`, pixel depth `24` or `32`, little-endian width and height.
- Reject compressed, color-mapped, or unsupported-depth TGA files with `SlickException`.
- Read TGA pixel data in BGR or BGRA order and output RGB or RGBA bytes.
- If `forceAlpha` or `transparent` is supplied, output RGBA.
- If the TGA descriptor bit `0x20` is unset, invert the caller's `flipped` flag, matching Java's origin handling.
- For alpha pixels with alpha `0`, zero the output RGB channels, matching the Java loader.
- Expand to power-of-two `texWidth` and `texHeight` and fill edge padding using the Java loader behavior.
- `configureEdging(edging)` is a compatibility no-op for this loader.
- `getImageBufferData()` throws because the Java loader does not expose a retained source buffer.

### `slick.opengl.CursorLoader`

```ts
export class CursorLoader {
    public static get(): CursorLoader;
    public getCursor(ref: string, x: number, y: number): Promise<Cursor>;
    public getCursor(buf: Uint8Array, x: number, y: number, width: number, height: number): Cursor;
    public getCursor(imageData: ImageData, x: number, y: number): Cursor;
    public getAnimatedCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): Promise<Cursor>;
}
```

Implementation instructions:

- Required by `ApplicationGameContainer` and by legacy container code during source ports.
- `get()` returns a singleton, matching Java.
- `getCursor(ref, x, y)` loads an image resource and creates a cursor with the supplied hotspot.
- Buffer and `ImageData` overloads create a cursor from already available RGBA pixel data.
- Animated cursor support uses the first frame as the browser-adapted cursor image and stores `cursorDelays` for diagnostics.

### `slick.opengl.InternalTextureLoader`

```ts
export class InternalTextureLoader {
    public static get(): InternalTextureLoader;
    public setHoldTextureData(holdTextureData: boolean): void;
    public setDeferredLoading(deferred: boolean): void;
    public isDeferredLoading(): boolean;
    public clear(): void;
    public clear(name: string): void;
    public set16BitMode(): void;
    public static get2Fold(fold: number): number;
    public static createIntBuffer(size: number): Int32Array;
    public reload(): void | Promise<void>;
}
```

Implementation instructions:

- Required by copied container code: `get().clear()` and `get().set16BitMode()`.
- This is a compatibility facade over WebGL texture resource caching.
- `clear()` invalidates image/texture cache entries owned by the active rendering context and releases their WebGL texture objects.
- `clear(name)` invalidates only cache entries whose resource reference or texture name equals `name`.
- `set16BitMode()` records the requested mode for parity diagnostics. The WebGL backend continues to use RGBA8 textures unless a tested browser-specific 16-bit path is explicitly implemented and documented.
- `get2Fold` returns the smallest power of two greater than or equal to `fold`.

### `slick.opengl.renderer.SGL`

```ts
export interface SGL {
    readonly GL_TEXTURE_2D: number;
    readonly GL_RGBA: number;
    readonly GL_RGB: number;
    readonly GL_UNSIGNED_BYTE: number;
    readonly GL_LINEAR: number;
    readonly GL_NEAREST: number;
    readonly GL_TEXTURE_MIN_FILTER: number;
    readonly GL_TEXTURE_MAG_FILTER: number;
    readonly GL_POINT_SMOOTH: number;
    readonly GL_POLYGON_SMOOTH: number;
    readonly GL_LINE_SMOOTH: number;
    readonly GL_SCISSOR_TEST: number;
    readonly GL_MODULATE: number;
    readonly GL_TEXTURE_ENV: number;
    readonly GL_TEXTURE_ENV_MODE: number;
    readonly GL_QUADS: number;
    readonly GL_POINTS: number;
    readonly GL_LINES: number;
    readonly GL_LINE_STRIP: number;
    readonly GL_TRIANGLES: number;
    readonly GL_TRIANGLE_FAN: number;
    readonly GL_SRC_ALPHA: number;
    readonly GL_ONE: number;
    readonly GL_ONE_MINUS_DST_ALPHA: number;
    readonly GL_DST_ALPHA: number;
    readonly GL_ONE_MINUS_SRC_ALPHA: number;
    readonly GL_COMPILE: number;
    readonly GL_MAX_TEXTURE_SIZE: number;
    readonly GL_COLOR_BUFFER_BIT: number;
    readonly GL_DEPTH_BUFFER_BIT: number;
    readonly GL_BLEND: number;
    readonly GL_COLOR_CLEAR_VALUE: number;
    readonly GL_LINE_WIDTH: number;
    readonly GL_CLIP_PLANE0: number;
    readonly GL_CLIP_PLANE1: number;
    readonly GL_CLIP_PLANE2: number;
    readonly GL_CLIP_PLANE3: number;
    readonly GL_COMPILE_AND_EXECUTE: number;
    readonly GL_RGBA8: number;
    readonly GL_RGBA16: number;
    readonly GL_BGRA: number;
    readonly GL_MIRROR_CLAMP_TO_EDGE_EXT: number;
    readonly GL_TEXTURE_WRAP_S: number;
    readonly GL_TEXTURE_WRAP_T: number;
    readonly GL_CLAMP: number;
    readonly GL_COLOR_SUM_EXT: number;
    readonly GL_ALWAYS: number;
    readonly GL_DEPTH_TEST: number;
    readonly GL_NOTEQUAL: number;
    readonly GL_EQUAL: number;
    readonly GL_SRC_COLOR: number;
    readonly GL_ONE_MINUS_SRC_COLOR: number;
    readonly GL_MODELVIEW_MATRIX: number;

    flush(): void;
    initDisplay(width: number, height: number): void;
    enterOrtho(xsize: number, ysize: number): void;
    glClearColor(r: number, g: number, b: number, a: number): void;
    glClipPlane(plane: number, buffer: Float64Array): void;
    glScissor(x: number, y: number, width: number, height: number): void;
    glLineWidth(width: number): void;
    glClear(mask: number): void;
    glColorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean): void;
    glLoadIdentity(): void;
    glGetInteger(id: number, ret: Int32Array): void;
    glGetFloat(id: number, ret: Float32Array): void;
    glEnable(id: number): void;
    glDisable(id: number): void;
    glBindTexture(target: number, id: number): void;
    glGetTexImage(target: number, level: number, format: number, type: number, pixels: Uint8Array): void;
    glDeleteTextures(buffer: Int32Array): void;
    glColor4f(r: number, g: number, b: number, a: number): void;
    glTexCoord2f(u: number, v: number): void;
    glVertex3f(x: number, y: number, z: number): void;
    glVertex2f(x: number, y: number): void;
    glRotatef(angle: number, x: number, y: number, z: number): void;
    glTranslatef(x: number, y: number, z: number): void;
    glBegin(geomType: number): void;
    glEnd(): void;
    glTexEnvi(target: number, mode: number, value: number): void;
    glPointSize(size: number): void;
    glScalef(x: number, y: number, z: number): void;
    glPushMatrix(): void;
    glPopMatrix(): void;
    glBlendFunc(src: number, dest: number): void;
    glGenLists(count: number): number;
    glNewList(id: number, option: number): void;
    glEndList(): void;
    glCallList(id: number): void;
    glCopyTexImage2D(target: number, level: number, internalFormat: number, x: number, y: number, width: number, height: number, border: number): void;
    glReadPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: Uint8Array): void;
    glTexParameteri(target: number, param: number, value: number): void;
    getCurrentColor(): number[];
    glDeleteLists(list: number, count: number): void;
    glDepthMask(mask: boolean): void;
    glClearDepth(value: number): void;
    glDepthFunc(func: number): void;
    setGlobalAlphaScale(alphaScale: number): void;
    glLoadMatrix(buffer: Float32Array): void;
    glGenTextures(ids: Int32Array): void;
    glGetError(): void;
    glTexImage2D(target: number, level: number, dstPixelFormat: number, width: number, height: number, border: number, srcPixelFormat: number, type: number, textureBuffer: Uint8Array): void;
    glTexSubImage2D(target: number, level: number, pageX: number, pageY: number, width: number, height: number, format: number, type: number, scratchByteBuffer: Uint8Array): void;
    canTextureMirrorClamp(): boolean;
    canSecondaryColor(): boolean;
    glSecondaryColor3ubEXT(b: number, c: number, d: number): void;
}
```

Implementation instructions:

- Java Slick2D counterpart: `org.newdawn.slick.opengl.renderer.SGL`.
- This is the full Slick2D `SGL` compatibility shape needed if internal Slick classes are retained.
- Implement in terms of the active `WebGLRenderer`, current `Graphics` transform, viewport, clip, and batch state.
- Java `ByteBuffer`, `IntBuffer`, `FloatBuffer`, and `DoubleBuffer` parameters map to `Uint8Array`, `Int32Array`, `Float32Array`, and `Float64Array`.
- `flush()` must flush the active WebGL batch.
- `enterOrtho(width, height)` sets Slick's top-left 2D projection for the active render target.
- `glTranslatef`, `glScalef`, and `glRotatef` ignore `z` except for preserving Java call shape.
- Immediate-mode calls `glBegin`, `glTexCoord2f`, `glVertex2f`, `glVertex3f`, and `glEnd` must accumulate a transient batch, then emit equivalent WebGL primitives.
- Display-list calls `glGenLists`, `glNewList`, `glEndList`, `glCallList`, and `glDeleteLists` must record and replay the same transient command stream.

### `slick.opengl.renderer.Renderer`

```ts
export class Renderer {
    public static readonly IMMEDIATE_RENDERER: number;
    public static readonly VERTEX_ARRAY_RENDERER: number;
    public static readonly DEFAULT_LINE_STRIP_RENDERER: number;
    public static readonly QUAD_BASED_LINE_STRIP_RENDERER: number;

    public static get(): SGL;
    public static setRenderer(type: number): void;
    public static setRenderer(renderer: SGL): void;
    public static setLineStripRenderer(type: number): void;
    public static setLineStripRenderer(renderer: unknown): void;
    public static getLineStripRenderer(): unknown;
}
```

Implementation instructions:

- Required by copied Slick2D classes that call `Renderer.get()`.
- Return the active `SGL` compatibility object.
- Renderer type setters are compatibility switches. They keep one WebGL implementation internally until another renderer is documented, but the constants and methods must exist so copied Java code ports without structural changes.

### `slick.openal.SoundStore`

```ts
export interface AudioPlaybackHandle {
    stop(): void;
    pause?(): void;
    suspend?(): void;
    resume?(): void;
    playing(): boolean;
}

export class SoundStore {
    public static get(): SoundStore;
    public clear(): void;
    public disable(): void;
    public setDeferredLoading(deferred: boolean): void;
    public isDeferredLoading(): boolean;
    public setMusicOn(music: boolean): void;
    public isMusicOn(): boolean;
    public setMusicVolume(volume: number): void;
    public getMusicVolume(): number;
    public setSoundVolume(volume: number): void;
    public getSoundVolume(): number;
    public setSoundsOn(sounds: boolean): void;
    public soundsOn(): boolean;
    public musicOn(): boolean;
    public soundWorks(): boolean;
    public init(): void | Promise<void>;
    public poll(delta: number): void;
    public isMusicPlaying(): boolean;
    public stopSoundEffect(id: number): void;
    public getSourceCount(): number;
    public getAudioContext(): AudioContext | null;
    public getSoundBus(): GainNode | null;
    public getMusicBus(): GainNode | null;
    public loadAudioBuffer(ref: string): Promise<AudioBuffer>;
    public preloadAudioBuffer(ref: string): Promise<void>;
    public playSound(ref: string, pitch: number, volume: number, loop: boolean, onEnded?: () => void): AudioPlaybackHandle | null;
    public track(handle: AudioPlaybackHandle): void;
    public untrack(handle: AudioPlaybackHandle): void;
}
```

Implementation instructions:

- Required by copied applet/container code: `SoundStore.get().clear()`.
- The broader methods must delegate to the same audio subsystem used by `Sound` and `Music`.
- `get()` returns a singleton, matching Java.
- `clear` stops active audio and releases cached audio resources owned by the active container scope.
- `setMusicOn(false)` calls `suspend()` on tracked music handles when available and stores enough state for `setMusicOn(true)` to resume. This mirrors Java `pauseLoop()`/`restartLoop()` behavior, must not call public `Music.pause()` semantics for `Music` handles, and must not be implemented as volume-only muting.
- `setSoundsOn(false)` prevents future sound effects from starting; active effect handles may continue unless `clear()` or `stop()` is called, matching the narrower Java sound toggle behavior used by the games.
- `loadAudioBuffer(ref)` loads bytes through `ResourceLoader.loadResource(ref)`, decodes them through the shared `AudioContext`, caches the in-flight/completed decode promise, deletes failed cache entries, and rejects with `SlickException`.
- `preloadAudioBuffer(ref)` tracks `loadAudioBuffer(ref)` through `ResourceLoader.track()` and is what `Sound` and `Music` constructors must call.
- `playSound(ref, pitch, volume, loop, onEnded)` is the shared effect playback helper. It keeps `Sound.play()` non-async, starts after the decode promise resolves, clamps playback rate and gain to supported ranges, and logs load/playback errors.
- `track(handle)` and `untrack(handle)` register externally-created music handles so `clear`, `isMusicPlaying`, and music toggles can operate over both effects and music.
- Source IDs are compatibility-only numbers. `getSourceCount()` returns the number of currently tracked browser audio voices.

### `lwjgl.openal.AL`

```ts
export class AL {
    public static create(): void;
    public static destroy(): void;
    public static isCreated(): boolean;
}
```

Implementation instructions:

- Java counterpart: `org.lwjgl.openal.AL`.
- Required by copied Slick2D `AppGameContainer.destroy()` and `SoundStore.init()` paths.
- `create()` marks the browser audio subsystem as requested and initializes the shared `AudioContext` when possible. If autoplay rules prevent immediate resume, keep the context in a suspended/unlocked-pending state and let `Sound`/`Music` complete unlock on the next user gesture.
- `destroy()` stops active sounds/music, releases audio nodes owned by the active container scope, and marks AL as not created.
- `isCreated()` returns the state set by `create()` and `destroy()`.

### `lwjgl.Sys`

```ts
export class Sys {
    public static getTime(): number;
    public static getTimerResolution(): number;
    public static getVersion(): string;
}
```

Implementation instructions:

- Required by project helper code that schedules frame timing.
- `getTimerResolution()` must return `1000`.
- `getTime()` must return integer milliseconds from `performance.now()`.
- `getVersion()` returns a descriptive compatibility string such as `slick2d-ts`.

### `lwjgl.LWJGLException`

```ts
export class LWJGLException extends Error {
    public constructor(message: string);
    public constructor(message: string, cause: unknown);
}
```

Implementation instructions:

- Required by copied container code that catches display or cursor creation failures.
- Use this only for compatibility shims. Core Slick APIs must expose `SlickException`.

### `lwjgl.opengl.GL11`

```ts
export class GL11 {
    public static readonly GL_COLOR_BUFFER_BIT: number;
    public static readonly GL_DEPTH_BUFFER_BIT: number;

    public static glClear(mask: number): void;
    public static glClearColor(r: number, g: number, b: number, a: number): void;
    public static glLoadIdentity(): void;
    public static glPushMatrix(): void;
    public static glPopMatrix(): void;
    public static glTranslatef(x: number, y: number, z: number): void;
    public static glScalef(x: number, y: number, z: number): void;
    public static glRotatef(angle: number, x: number, y: number, z: number): void;
    public static glViewport(x: number, y: number, width: number, height: number): void;
    public static glScissor(x: number, y: number, width: number, height: number): void;
}
```

Implementation instructions:

- Required by `ScalableGame2` and copied container code.
- Delegate to `Renderer.get()`.
- Ignore `z` in the 2D WebGL affine stack except to preserve Java call shape.

### `lwjgl.opengl.DisplayMode`

```ts
export class DisplayMode {
    public constructor(width: number, height: number);
    public constructor(width: number, height: number, bitsPerPixel: number);
    public getWidth(): number;
    public getHeight(): number;
    public getBitsPerPixel(): number;
    public getFrequency(): number;
}
```

Implementation instructions:

- Provide enough parity for display-mode selection helpers.
- Instances are immutable value objects.
- `bitsPerPixel` defaults to `32` when omitted.
- `getFrequency()` returns `60` when browser display refresh cannot be queried.

### `lwjgl.opengl.Display`

```ts
export class Display {
    public static create(): void | Promise<void>;
    public static create(pixelFormat: PixelFormat): void | Promise<void>;
    public static create(pixelFormat: PixelFormat, sharedContext: unknown): void | Promise<void>;
    public static destroy(): void;
    public static isCreated(): boolean;
    public static update(): void;
    public static sync(frameRate: number): void;
    public static setParent(parent: unknown): void;
    public static setVSyncEnabled(enabled: boolean): void;
    public static setTitle(title: string): void;
    public static setIcon(icons: unknown[]): void;
    public static setResizable(resizable: boolean): void;
    public static isResizable(): boolean;
    public static getDisplayMode(): DisplayMode;
    public static getAvailableDisplayModes(): DisplayMode[];
    public static setDisplayMode(mode: DisplayMode): void;
    public static setFullscreen(fullscreen: boolean): void | Promise<void>;
    public static isFullscreen(): boolean;
    public static isActive(): boolean;
    public static isVisible(): boolean;
    public static isCloseRequested(): boolean;
    public static requestClose(): void;
    public static wasResized(): boolean;
    public static getWidth(): number;
    public static getHeight(): number;
}
```

Implementation instructions:

- This is a compatibility shim, not the primary app API.
- Delegate to the active `AppGameContainer` when possible.
- `getAvailableDisplayModes` returns a deterministic list of immutable `DisplayMode` values: the browser screen size when available, the active canvas backing size when available, `640x480`, and `800x600`, with duplicates removed in that order. All generated modes use `32` bits per pixel and `60` Hz.
- `getDisplayMode` returns the active container/canvas mode when a container exists; otherwise it returns the browser screen mode when available; otherwise it returns `640x480`.
- `setDisplayMode(mode)` updates the active container logical size and records `mode` as the current display mode.
- `create`, `destroy`, and `update` map to active canvas lifecycle state rather than constructing a native display.
- `create()`, `destroy()`, and registering a new active container clear stale close-request state.
- `create(pixelFormat, sharedContext)` must accept the shared-context argument used by Slick2D and route it to the same renderer resource owner used by `GameContainer.enableSharedContext()`.
- `sync(frameRate)` records the requested frame cap for diagnostics and for the container loop's scheduling policy. It must return immediately and must never block the browser thread.
- `setParent` records the DOM host element or browser canvas owner when supplied.
- `setVSyncEnabled` records the requested flag; browser animation frames are already display-synchronized.
- `setTitle` maps to `document.title` when a document is available.
- `setIcon` maps through `GameContainer.setIcons` or records the request as a compatibility no-op.
- `setResizable` controls whether resize events alter the active container.
- `requestClose()` is the browser helper used by `GameContainer.exit()` to emulate LWJGL's window close flag. `AppGameContainer` must call `game.closeRequested()` only after `isCloseRequested()` returns true.

### `lwjgl.input.Mouse`

```ts
export class Mouse {
    public static setGrabbed(grabbed: boolean): void | Promise<void>;
    public static isGrabbed(): boolean;
    public static setNativeCursor(cursor: Cursor | null): void;
    public static getNativeCursor(): Cursor | null;
}
```

Implementation instructions:

- Required by copied container cursor code.
- `setGrabbed` maps to Pointer Lock.
- Native cursor methods map to CSS cursor state.

### `lwjgl.input.Cursor`

```ts
export class Cursor {
    public constructor(width: number, height: number, xHotspot: number, yHotspot: number, numImages: number, images: unknown, delays: unknown);
}
```

Implementation instructions:

- Provide a compatibility value object for cursor loader code.
- Store hotspot and image data. `Mouse.setNativeCursor` maps it to a CSS cursor URL when the browser accepts the image dimensions and hotspot, otherwise it records the cursor and leaves the CSS cursor unchanged.

### `lwjgl.BufferUtils`

```ts
export class BufferUtils {
    public static createByteBuffer(size: number): Uint8Array;
    public static createIntBuffer(size: number): Int32Array;
}
```

Implementation instructions:

- Required only for helper-code compatibility.
- Return typed arrays with the requested element count.

### `lwjgl.opengl.PixelFormat`

```ts
export class PixelFormat {
    public constructor();
    public constructor(alpha: number, depth: number, stencil: number);
    public constructor(alpha: number, depth: number, stencil: number, samples: number);
    public constructor(bpp: number, alpha: number, depth: number, stencil: number, samples: number);
}
```

Implementation instructions:

- Compatibility value object only.
- Verified against bundled LWJGL bytecode: default delegates to alpha `0`, depth `8`, stencil `0`; the three-argument form is `(alpha, depth, stencil)`; the four-argument form is `(alpha, depth, stencil, samples)`; the five-argument form is `(bpp, alpha, depth, stencil, samples)`.
- Store requested bpp, alpha, depth, stencil, and sample values for diagnostics.

## Legacy Container Mapping

The Java projects contain applet-era wrappers and desktop container subclasses. Do not expose applet classes as first-class TS library APIs. Browser applets do not exist, and a blocking LWJGL-style `runloop()` is the wrong model for the web.

The library must expose `AppGameContainer`, `ApplicationGameContainer`, `GameContainer`, `ScalableGame`, and `ScalableGame2`. Legacy applet classes must be removed during ports and mapped as follows:

```text
Legacy Java method                              TS port mapping
Applet wrapper constructor(Game)                create AppGameContainer or ApplicationGameContainer
Applet wrapper.init()                           browser bootstrap creates canvas and container
Applet wrapper.start()                          container.resume() or start once if not started
Applet wrapper.startLWJGL()                     container.start()
Applet wrapper.stop()                           container.pause()
Applet wrapper.destroy()                        container.destroy()
Applet wrapper.destroyLWJGL()                   container.destroy()
Applet wrapper.addNotify()                      no exported API; call start from bootstrap
Applet wrapper.removeNotify()                   no exported API; call destroy from teardown
Applet wrapper.getContainer()                   keep a direct AppGameContainer reference
ContainerPanel.createDisplay()                  AppGameContainer canvas/context creation
ContainerPanel.start()                          AppGameContainer.start()
ContainerPanel.initGL()                         renderer/audio/input initialization inside start()
inner Container(Game)                           AppGameContainer(game)
inner Container.initApplet()                    game.init through AppGameContainer.start()
inner Container.isRunning()                     container diagnostics/state
inner Container.stopApplet()                    container.exit() or container.pause()
inner Container.getScreenWidth/Height()         GameContainer.getScreenWidth/getScreenHeight
inner Container.supportsAlphaInBackBuffer()     AppGameContainer.supportsAlphaInBackBuffer()
inner Container.hasFocus()                      GameContainer.hasFocus()
inner Container.getApplet()                     no TS equivalent; remove call site
inner Container.setIcon/setIcons()              GameContainer.setIcon/setIcons()
inner Container.setMouseCursor(...)             GameContainer.setMouseCursor(...)
inner Container.setMouseGrabbed(...)            GameContainer.setMouseGrabbed(...)
inner Container.isMouseGrabbed()                GameContainer.isMouseGrabbed()
inner Container.setDefaultMouseCursor()         GameContainer.setDefaultMouseCursor()
inner Container.isFullscreen()                  GameContainer.isFullscreen()
inner Container.setFullscreen(boolean)          GameContainer.setFullscreen(boolean)
inner Container.setDisplayMode(boolean)         port-local helper around setDisplayMode(width,height,fullscreen)
inner Container.runloop()                       no direct port; handled by requestAnimationFrame loop
```

Implementation instructions:

- No file named `AppletGameContainer2.ts` or browser applet wrapper may be added to the library.
- No file named `ScalableGameContainer.ts` may be added to the core library. Its useful behavior is covered by `AppGameContainer` plus `ScalableGame` or `ScalableGame2`.
- If a game port wants a temporary local migration adapter, keep it in that game port, not in `slick2d-ts`.
- The docs still list the legacy methods because each has a required migration path.

## Game Helper Porting Layer

The source projects contain small helper abstractions built on top of Slick2D. The library can provide neutral support classes for the helpers that are truly reusable. It must not expose APIs named after source game titles.

### Helper Audit Result

Implement neutral support for these helper families:

- `IInput`: common input contract with a superset of all observed helper methods.
- `HumanInput`: neutral configurable implementation with constructor overloads matching the observed Java shapes.
- `RecordedInput`: neutral replay/demo byte-stream implementation.
- `IMode`: neutral mode lifecycle interface.
- `Song`: neutral intro/loop music sequencer.
- Binary resource reading: replacement for `ClassLoader.getResourceAsStream` plus `DataInputStream`.
- Bitmap text drawing: replacement for source glyph-array `drawString` and `drawNumber` helpers.
- Sprite drawing recipes: exact mappings for source `Main` helper methods that wrap `Image`, `Graphics`, and `GL11`.
- Geometry math recipes: replacement for source unit-vector and point-rotation helpers.
- Java-compatible random numbers: replacement for seeded `java.util.Random` usage in deterministic demo, AI, and ending paths.

Do not implement shared library versions of these source classes:

- `Thing`: same name, incompatible fields and movement rules.
- `Stage`: same name, project-specific data layouts.
- `Main`, `LoadingMode`, `IntroMode`, `Flame`, and `Ghost`: game-domain classes, not Slick abstraction.
- `IFadeListener`: game-local callback with exact signature `fadeCompleted(): void`.
- `IMenuListener`: game-local menu callback with exact signatures `selectionChanged(selectedIndex: number): void` and `optionSelected(selectedIndex: number): void`.

### `slick.support.IMode`

```ts
export interface IMode<TMain = unknown> {
    init(main: TMain, gc: GameContainer): void | Promise<void>;
    update(gc: GameContainer): void;
    render(gc: GameContainer, g: Graphics): void;
}
```

Implementation instructions:

- Java counterpart: project `IMode` helper interfaces.
- The Java methods throw `SlickException`; TS implementations must throw `SlickException` for parity failures.
- Use a generic `TMain` because each game has a different `Main` class.
- `update` has no `delta` argument because the mode is driven by its owning game object's timing policy.

### `slick.support.IInput`

```ts
export interface IInput {
    snap(): void;
    reset(): void;
    isFire(): boolean;
    isShoot(): boolean;
    isSpace(): boolean;
    isUp(): boolean;
    isDown(): boolean;
    isLeft(): boolean;
    isRight(): boolean;
    isEnter(): boolean;
    isF12(): boolean;
    isEscape(): boolean;
    isPause(): boolean;
    clearKeyPressedRecord(): void;
    update(): boolean;
}
```

Implementation instructions:

- Java counterpart: the union of the observed project `IInput` helper methods.
- This is intentionally a neutral superset. Game ports may ignore actions they do not use.
- `snap` captures held state for ports that sample input once per frame. `HumanInput(mapping, gc)` stores state during `snap`; `HumanInput(gc)` and `RecordedInput` return immediately.
- Direction methods return held state.
- In mapping mode, `isFire` and `isShoot` return the held state captured by `snap`. Menu/navigation actions such as `isSpace`, `isEnter`, `isF12`, `isEscape`, and `isPause` return one-shot pressed state unless a source helper explicitly stored them during `snap`.
- Unbound optional actions return `false`.
- `clearKeyPressedRecord` delegates to Slick `Input.clearKeyPressedRecord`.
- `update` returns `true` for `HumanInput`; `RecordedInput.update()` increments the byte index and returns `false` when the stream is exhausted.

### `slick.support.ButtonMapping`

```ts
export class ButtonMapping {
    public keyUp: number;
    public keyDown: number;
    public keyLeft: number;
    public keyRight: number;
    public keyGrenade: number;
    public keyGun: number;
    public gunKeyMapped: boolean;
    public controller: boolean;
    public controllerIndex: number;
    public controllerGrenade: number;
    public controllerGun: number;

    public constructor();
}
```

Implementation instructions:

- Java counterpart: project button-mapping objects that expose public key and controller fields.
- Defaults must be:
  - `keyUp = Input.KEY_UP`
  - `keyDown = Input.KEY_DOWN`
  - `keyLeft = Input.KEY_LEFT`
  - `keyRight = Input.KEY_RIGHT`
  - `keyGrenade = Input.KEY_X`
  - `keyGun = Input.KEY_Z`
  - `controller = false`
  - `controllerIndex = 0`
  - `controllerGrenade = 0`
  - `controllerGun = 1`
  - `gunKeyMapped = false`
- Keep the field names public and mutable.
- Game ports may still pass a structural object with the same fields to `HumanInput`.
- `HumanInput.isFire()` reads the grenade mapping. `HumanInput.isShoot()` reads the gun mapping. Do not add title-specific action names to this class.

### `slick.support.HumanInput`

```ts
export interface HumanInputBindings {
    upKeys?: number[];
    downKeys?: number[];
    leftKeys?: number[];
    rightKeys?: number[];
    fireKeys?: number[];
    shootKeys?: number[];
    spaceKeys?: number[];
    enterKeys?: number[];
    f12Keys?: number[];
    escapeKeys?: number[];
    pauseKeys?: number[];
    controllerIndex?: number;
    controllerFireButtons?: number[];
    controllerShootButtons?: number[];
}

export class HumanInput implements IInput {
    public constructor(gc: GameContainer);
    public constructor(mapping: ButtonMapping, gc: GameContainer);
    public constructor(gc: GameContainer, bindings: HumanInputBindings);
    public snap(): void;
    public reset(): void;
    public isFire(): boolean;
    public isShoot(): boolean;
    public isSpace(): boolean;
    public isUp(): boolean;
    public isDown(): boolean;
    public isLeft(): boolean;
    public isRight(): boolean;
    public isEnter(): boolean;
    public isF12(): boolean;
    public isEscape(): boolean;
    public isPause(): boolean;
    public clearKeyPressedRecord(): void;
    public update(): boolean;
}
```

Implementation instructions:

- Java counterpart: project `HumanInput` helper classes.
- `constructor(gc)` uses the observed four-way keyboard defaults:
  - up: `KEY_UP`, `KEY_W`, `KEY_I`, `KEY_8`
  - down: `KEY_DOWN`, `KEY_S`, `KEY_K`, `KEY_2`
  - left: `KEY_LEFT`, `KEY_A`, `KEY_J`, `KEY_4`
  - right: `KEY_RIGHT`, `KEY_D`, `KEY_L`, `KEY_6`
  - enter: `KEY_ENTER`
  - space: `KEY_SPACE`
  - escape: `KEY_ESCAPE`
  - pause: `KEY_P`
- `constructor(mapping, gc)` uses the mapping object's direction fields, action fields, and controller fields.
- Stored controller button mappings must be zero-based. The observed key-binding mode receives one-based `controllerButtonPressed(controllerIndex, buttonIndex)` callbacks, decrements `buttonIndex`, stores the decremented value, then `HumanInput.snap()` passes that value to `Input.isButtonPressed`.
- When `mapping.gunKeyMapped` is false, `isShoot` must use the observed fallback keys: `KEY_Z`, `KEY_Y`, `KEY_W`, and `KEY_K`.
- `snap` stores directional, fire, and shoot state when a mapping constructor is used. All mapped keyboard fields for direction, fire, and shoot must use `Input.isKeyDown`, not `Input.isKeyPressed`.
- Controller directions must call `Input.isControllerUp/Down/Left/Right`.
- Controller action buttons must call `Input.isButtonPressed`.
- `isPause` uses configured pause keys; mapping mode defaults to `KEY_P` and `KEY_ENTER`.
- `reset` is a no-op and `update` returns `true`, matching the human-input Java implementations.

### `slick.support.RecordedInput`

```ts
export class RecordedInput implements IInput {
    public constructor(data: Uint8Array, gc: GameContainer);
    public snap(): void;
    public reset(): void;
    public isFire(): boolean;
    public isShoot(): boolean;
    public isSpace(): boolean;
    public isUp(): boolean;
    public isDown(): boolean;
    public isLeft(): boolean;
    public isRight(): boolean;
    public isEnter(): boolean;
    public isF12(): boolean;
    public isEscape(): boolean;
    public isPause(): boolean;
    public clearKeyPressedRecord(): void;
    public update(): boolean;
}
```

Implementation instructions:

- Java counterpart: recorded/demo input helper that implements `IInput` over a byte array.
- `reset` sets the byte index to `0`.
- Direction bits in the current byte must be:
  - up: `data[index] & 1`
  - down: `data[index] & 2`
  - left: `data[index] & 4`
  - right: `data[index] & 8`
- If `index >= data.length`, every direction returns `false`.
- `isEnter` delegates to `Input.isKeyPressed(Input.KEY_ENTER)` so a human can interrupt or advance demo playback.
- `isFire`, `isShoot`, `isSpace`, `isF12`, `isEscape`, and `isPause` return `false` unless a port supplies extra recorded bits.
- `clearKeyPressedRecord` delegates to `Input.clearKeyPressedRecord`.
- `snap` is a no-op.
- `update` increments the index first and returns `index < data.length`.

### `slick.support.JavaRandom`

```ts
export class JavaRandom {
    public constructor();
    public constructor(seed: number | bigint);
    public setSeed(seed: number | bigint): void;
    public nextInt(): number;
    public nextInt(bound: number): number;
    public nextFloat(): number;
    public nextBoolean(): boolean;
}
```

Implementation instructions:

- Java counterpart: `java.util.Random` methods used by the source games.
- Required because all three source games use `Random`, and two ports reset seeded instances with `0xCAFEBABE` or `0xDEADBEEF` for deterministic behavior.
- Use Java's exact 48-bit linear congruential generator: multiplier `0x5DEECE66D`, addend `0xB`, mask `(1n << 48n) - 1n`.
- `setSeed(seed)` stores `(BigInt(seed) ^ 0x5DEECE66Dn) & mask`.
- Private `next(bits)` advances `seed = (seed * multiplier + addend) & mask`, then returns the high `bits` bits as a non-negative `number`.
- `nextInt()` returns the signed 32-bit result of `next(32)`.
- `nextInt(bound)` throws `Error` when `bound <= 0`. For powers of two it returns `Number((BigInt(bound) * BigInt(next(31))) >> 31n)`. For other bounds it repeats Java's rejection loop: read `bits = next(31)`, set `value = bits % bound`, retry while the signed 32-bit value of `bits - value + (bound - 1)` is less than `0`, then return `value`.
- `nextFloat()` returns `next(24) / (1 << 24)`.
- `nextBoolean()` returns `next(1) !== 0`.
- Constructor without a seed uses `(BigInt(Date.now()) << 16n) ^ BigInt(Math.floor(performance.now() * 1000))` when `performance.now()` exists, or `BigInt(Date.now())` otherwise, then delegates to `setSeed`.
- Keep this helper in `slick.support` because it is a neutral porting helper, not a Slick2D public API class.

### `slick.support.Song`

```ts
export class Song {
    public static readonly STREAMING: boolean;
    public intro: Music | null;
    public intro2: Music | null;
    public loop: Music | null;
    public playing: boolean;
    public playedIntro2: boolean;

    public constructor(intro: string);
    public constructor(intro: Music);
    public constructor(intro: string | null, loop: string);
    public constructor(intro: Music | null, loop: Music);
    public constructor(intro: string | null, intro2: string | null, loop: string);
    public constructor(intro: Music | null, intro2: Music | null, loop: Music);
    public stop(): void;
    public play(): void;
    public update(): void;
}
```

Implementation instructions:

- Java counterpart: source project `Song` helper classes.
- Use the public-field, three-part `intro`/`intro2`/`loop` version as the shared superset.
- `STREAMING` must default to `false`, matching the source helper that passes a streaming hint.
- String constructors create `Music` instances with the same path strings supplied by the Java code.
- `play` is idempotent while already playing.
- If there is no intro and no intro2, `play` starts `loop.loop()`.
- If there is no intro but there is `intro2`, `play` starts `intro2.play()`.
- Otherwise `play` starts `intro.play()`.
- `update` starts `intro2` after `intro` finishes when `intro2` exists and has not played.
- `update` starts `loop.loop()` after the intro sequence finishes when `loop` exists.
- If there is no loop and the intro sequence finishes, `update` calls `stop`.

### `slick.support.BitmapText`

```ts
export interface BitmapTextOptions {
    glyphWidth: number;
    glyphHeight: number;
    xAdvance: number;
    nullGlyphSkips?: boolean;
    clampNegativeNumbers?: boolean;
    cullMinY?: number;
    cullMaxY?: number;
}

export class BitmapText {
    public constructor(glyphs: Array<Image | null>, options: BitmapTextOptions);
    public drawString(text: string, x: number, y: number): void;
    public drawString(text: string, x: number, y: number, length: number): void;
    public drawStringAlpha(text: string, x: number, y: number, alpha: number): void;
    public drawStringScaled(text: string, x: number, y: number, scale: number): void;
    public drawStringCentered(text: string, centerX: number, y: number): void;
    public drawNumber(value: number, digits: number, x: number, y: number): void;
    public measureWidth(text: string): number;
}
```

Implementation instructions:

- Java counterpart: source `Main.drawString`, `drawStringAlpha`, `drawStringCentered`, and `drawNumber` helpers that render text from `Image[]` glyph arrays.
- `glyphs[characterCode]` is the image for that character.
- `xAdvance` must match the source helper: `32` for 32-pixel glyph sets and `16` for 16-pixel glyph sets.
- `drawString(text, x, y)` draws every character in order and advances `x` by `xAdvance`.
- `drawString(text, x, y, length)` draws at most `length` characters, preserving the source helper that reveals text progressively.
- When `cullMinY` or `cullMaxY` is supplied, `drawString` variants skip rendering outside that inclusive vertical range, matching the source helper that ignores text below `-16` or above `600`.
- `drawStringAlpha` must save each glyph's original alpha, set the requested alpha, draw, then restore.
- `drawStringScaled` must push a transform, translate to `x, y`, scale uniformly, draw glyphs at local positions `i * xAdvance, 0`, then pop.
- `drawStringCentered(text, centerX, y)` starts at `centerX - (text.length * xAdvance) / 2`.
- `drawNumber(value, digits, x, y)` draws least-significant digits right-to-left and starts at `x + (digits - 1) * xAdvance`.
- When `clampNegativeNumbers` is true, clamp negative values to `0` before drawing. Leave this false for ports whose Java helper did not clamp.
- When `nullGlyphSkips` is true, missing glyphs are skipped and still advance. When false, missing glyphs throw `SlickException`.

### `slick.support.BinaryReader`

```ts
export class BinaryReader {
    public constructor(data: ArrayBuffer | Uint8Array);
    public read(): number;
    public readFully(target: Uint8Array): void;
    public readShort(): number;
    public readUnsignedShort(): number;
    public readInt(): number;
    public readLong(): bigint;
    public skipBytes(count: number): number;
    public available(): number;
    public close(): void;
}
```

Implementation instructions:

- Java counterpart: the subset of `DataInputStream` used by the source resource loaders.
- This class is the browser replacement after bytes have been acquired through `ResourceLoader`; it must not fetch data itself.
- Use Java `DataInputStream` byte order: big-endian.
- `read()` returns the next unsigned byte as `0..255`, or `-1` at EOF.
- `readFully(target)` fills the whole target buffer or throws `SlickException` on EOF.
- `readShort()` returns a signed 16-bit integer.
- `readUnsignedShort()` returns an unsigned 16-bit integer.
- `readInt()` returns a signed 32-bit integer.
- `readLong()` returns a signed 64-bit `bigint` so bitfield data remains exact.
- `skipBytes(count)` advances by up to `count` bytes and returns the number skipped.
- `close()` marks the reader closed; future reads throw `SlickException`.

### `slick.support.SpriteDrawing`

```ts
export class SpriteDrawing {
    public static draw(image: Image, x: number, y: number): void;
    public static drawAlpha(image: Image, x: number, y: number, alpha: number): void;
    public static drawOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number): void;
    public static drawOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number, alpha: number): void;
    public static drawFaded(image: Image, x: number, y: number, alpha: number): void;
    public static drawRotated(image: Image, x: number, y: number, angle: number): void;
    public static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number): void;
    public static drawRotated(image: Image, x: number, y: number, centers: number[], angle: number): void;
    public static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number): void;
    public static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number, alpha: number): void;
    public static drawRotatedAlpha(image: Image, x: number, y: number, angle: number, alpha: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, angle: number, scale: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, angle: number, scaleX: number, scaleY: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number, alpha: number): void;
    public static drawCentered(image: Image): void;
    public static drawCentered(image: Image, x: number, y: number): void;
    public static drawCentered(image: Image, x: number, y: number, scale: number): void;
    public static drawCentered(image: Image, x: number, y: number, scale: number, alpha: number): void;
    public static drawCenteredAlpha(image: Image, x: number, y: number, alpha: number): void;
    public static drawScaled(image: Image, x: number, y: number, scale: number): void;
    public static drawScaled(image: Image, x: number, y: number, scale: number, alpha: number): void;
    public static drawScaled(image: Image, x: number, y: number, width: number, height: number): void;
    public static withTranslation(x: number, y: number, callback: () => void): void;
    public static withRotation(x: number, y: number, angle: number, callback: () => void): void;
    public static withScale(x: number, y: number, scaleX: number, scaleY: number, callback: () => void): void;
}
```

Implementation instructions:

- Java counterpart: repeated source `Main` drawing helper methods that wrap `Image`, `Graphics`, and `GL11`.
- These helpers are neutral convenience functions. Game ports may keep exact local `Main.draw(...)` overload names and delegate to this class.
- `drawAlpha` must save the original image alpha, call `setAlpha(alpha)`, draw, then restore the original alpha.
- `drawOffset` draws at `x - offsetX, y - offsetY`. Game ports pass their camera or scroll offset explicitly.
- `drawFaded` is an alpha draw helper. Fade state, fade listeners, and mode transitions remain game-local.
- Rotation and scaling methods must use `Graphics.pushTransform`/`popTransform` or the `GL11` shim so transform state is restored after the draw.
- Overloads with explicit centers rotate or scale around `centerX, centerY`; overloads with `centers: number[]` read `[centerX, centerY]`.
- Centered methods draw around the image center using `image.getWidth()` and `image.getHeight()`.
- `withTranslation`, `withRotation`, and `withScale` provide a structured replacement for helper pairs such as `translateGraphics`, `rotateGraphics`, `scaleGraphics`, and `popGraphics`.

### `slick.support.GeometryMath`

```ts
export interface Point2D {
    x: number;
    y: number;
}

export class GeometryMath {
    public static readonly ISQRT2: number;
    public static createUnitVector2(angle: number): [number, number];
    public static createUnitVector2(angle: number, target: [number, number]): [number, number];
    public static createUnitVector(angle: number): [number, number];
    public static createUnitVector(angle: number, target: [number, number]): [number, number];
    public static rotate(x: number, y: number, angle: number): Point2D;
}
```

Implementation instructions:

- Java counterpart: source `Main.createUnitVector2`, `Main.createUnitVector`, and static `Main.rotate`.
- `ISQRT2` is `1 / Math.sqrt(2)`.
- `createUnitVector2(angle)` treats `angle` as radians and returns `[Math.cos(angle), Math.sin(angle)]`, matching the helper that uses `FastTrig`.
- `createUnitVector(angle)` is a discrete direction helper. It must recognize exactly `0`, `360`, `45`, `405`, `90`, `135`, `180`, `225`, `270`, `315`, and `-45`.
- Discrete vector results are `[1, 0]`, `[ISQRT2, ISQRT2]`, `[0, 1]`, `[-ISQRT2, ISQRT2]`, `[-1, 0]`, `[-ISQRT2, -ISQRT2]`, `[0, -1]`, and `[ISQRT2, -ISQRT2]` for the corresponding angles.
- For an unrecognized angle with a provided `target`, leave `target` unchanged, matching the Java switch with no `default`.
- `rotate(x, y, angle)` treats `angle` as radians and returns `{ x: x * cos(angle) - y * sin(angle), y: x * sin(angle) + y * cos(angle) }`.

### Source Helper Method Mapping

Use this table when porting source helper methods. These mappings are exact behavioral recipes, but not every source helper should become a library export.

```text
Java helper signature                           TS implementation recipe
IMode.init(Main, GameContainer)                 IMode.init(main, gc)
IMode.update(GameContainer)                     IMode.update(gc)
IMode.render(GameContainer, Graphics)           IMode.render(gc, g)
IInput.snap()                                   IInput.snap()
IInput.reset()                                  IInput.reset()
IInput.isFire()                                 IInput.isFire()
IInput.isShoot()                                IInput.isShoot()
IInput.isSpace()                                IInput.isSpace()
IInput.isUp/Down/Left/Right()                   IInput direction methods
IInput.isEnter/isF12/isEscape/isPause()         IInput one-shot action methods
IInput.clearKeyPressedRecord()                  Input.clearKeyPressedRecord()
IInput.update()                                 IInput.update()
HumanInput(GameContainer)                       new HumanInput(gc)
HumanInput(ButtonMapping, GameContainer)        new HumanInput(mapping, gc)
Recorded input byte array constructor           new RecordedInput(data, gc)
RecordedInput.reset()                           index = 0
RecordedInput.update()                          ++index < data.length
RecordedInput.isUp/Down/Left/Right()            bit tests 1, 2, 4, 8 on current byte
new Random()                                    new JavaRandom()
new Random(seed)                                new JavaRandom(seed)
Random.nextInt(bound)                           JavaRandom.nextInt(bound)
Random.nextFloat()                              JavaRandom.nextFloat()
Random.nextBoolean()                            JavaRandom.nextBoolean()
Song(String)                                    new Song(intro)
Song(Music)                                     new Song(intro)
Song(String, String)                            new Song(intro, loop)
Song(Music, Music)                              new Song(intro, loop)
Song(String, String, String)                    new Song(intro, intro2, loop)
Song(Music, Music, Music)                       new Song(intro, intro2, loop)
Song.stop/play/update()                         Song.stop/play/update()
ClassLoader.getResourceAsStream(path)           ResourceLoader.loadResource/registerResource, then getResourceAsStream(path)
new DataInputStream(stream)                     new BinaryReader(bytes)
DataInputStream.read()                          BinaryReader.read()
DataInputStream.readFully(byte[])               BinaryReader.readFully(target)
DataInputStream.readShort()                     BinaryReader.readShort()
DataInputStream.readInt()                       BinaryReader.readInt()
DataInputStream.readLong()                      BinaryReader.readLong()
BufferedReader.readLine() over resource stream  textHandler resource split into lines
URL.openStream()/BufferedReader over HTTP       game-local async fetch plus line parsing
FileOutputStream/BufferedOutputStream           game-local Blob, IndexedDB, or localStorage export
new Thread() applet loop                        AppGameContainer RAF loop
new Thread() HTTP upload/download               game-local Promise from fetch; set completion flag in finally
System.exit(0)                                  GameContainer.exit() or game-local state transition
System.currentTimeMillis()                      Sys.getTime() or performance.now() for elapsed throttles
java.awt.Toolkit.getDefaultToolkit()            remove call; browser bootstrap owns environment readiness
Collections.synchronizedMap(...)                normal Map unless the port introduces Workers
Main.drawNumber(...)                            BitmapText.drawNumber(...)
Main.drawString(String, x, y)                   BitmapText.drawString(...)
Main.drawString(String, x, y, length)           BitmapText.drawString(..., length)
Main.drawStringAlpha(...)                       BitmapText.drawStringAlpha(...)
Main.drawString(String, y, color)               BitmapText.drawStringCentered(text, 400, y)
Main.drawString(String, x, y, color, scale)     BitmapText.drawStringScaled(...)
Main.drawStringCentered(...)                    BitmapText.drawStringCentered(...)
Main.draw(Image, x, y)                          image.draw(x, y), after game-local camera offset
Main.draw(Image, x, y, alpha)                   SpriteDrawing.drawAlpha(image, x, y, alpha)
Main.drawOffset(Image, x, y)                    SpriteDrawing.drawOffset(image, x, y, cameraX, cameraY)
Main.drawFaded(Image, x, y, alpha)              SpriteDrawing.drawFaded(image, x, y, alpha)
Main.drawRotated(...)                           SpriteDrawing.drawRotated(...)
Main.drawRotatedScaled(...)                     SpriteDrawing.drawRotatedScaled(...)
Main.drawCentered(...)                          SpriteDrawing.drawCentered(...)
Main.drawScaled(...)                            SpriteDrawing.drawScaled(...)
Main.drawLine(Graphics, ...)                    save color, set red, draw camera-offset line, restore color
Main.drawVehicle(...)                           game-local sprite selection by 45-degree sectors, then SpriteDrawing
Main.translateGraphics(...)                     SpriteDrawing.withTranslation(...) or Graphics.translate
Main.rotateGraphics(...)                        SpriteDrawing.withRotation(...) or Graphics.rotate
Main.scaleGraphics(...)                         SpriteDrawing.withScale(...) or Graphics.scale
Main.popGraphics()                              callback boundary or Graphics.popTransform()
Main.createUnitVector2(angle)                   GeometryMath.createUnitVector2(angle)
Main.createUnitVector(angle)                    GeometryMath.createUnitVector(angle)
Main.rotate(x, y, angle)                        GeometryMath.rotate(x, y, angle)
Main.playSound(Sound)                           Sound.play()
Main.playSound(Sound, volume)                   Sound.play(1, volume)
Main.playSoundAlways(Sound)                     Sound.play()
Main.playSoundIfNotPlaying(Sound)               if (!sound.playing()) sound.play()
Main.playSound with minimum-time throttle        game-local timestamp gate plus Sound.play()
Main.stopSound(Sound)                           Sound.stop()
Main.isSoundPlaying(Sound)                      Sound.playing()
Main.stopSong(Song)                             Song.stop()
Main.requestSong(Song)                          game-local current-song state plus Song.play/update
Main.requestMusic(Music)                        game-local current-music state plus Music.play/loop
Main.fadeMusic(...)                             Music.fade(...) or game-local volume ramp using Music.setVolume
Main.playMusic(Music)                           Music.play()
Main.loopMusic(Music)                           Music.loop()
Main.stopMusic()/stopAllSoundEffects()          stop tracked Music/Sound instances; SoundStore.clear() for global reset
Main.stopAllSounds()/stopAllSound()             stop tracked Music/Sound instances; SoundStore.clear() for global reset
Main.startFade/removeFadeListener               game-local fade state and listener collection, not Slick library API
IFadeListener.fadeCompleted()                   game-local callback invoked when fade state reaches completion
IMenuListener.selectionChanged(index)           game-local menu callback when selected index changes
IMenuListener.optionSelected(index)             game-local menu callback when an option is chosen
Main.resetNextFrameTime()                       Sys.getTime(), or reset fixed-step loop timing
while(nextFrameTime <= Sys.getTime()) update    fixed-step game loop adapter from GAME-LOOP.md
Display.sync(targetFPS)                         Display.sync(targetFPS), nonblocking recorded frame-cap request
GameContainer.getBuildVersion()                 parse ResourceLoader bytes for version/build, else return -1
GameContainer.enableSharedContext()             record shared WebGL resource owner before Display.create(...)
AL.create()/AL.destroy()                        initialize or tear down browser audio subsystem state
```

`Thing`, `Stage`, `Main`, and concrete mode classes must remain in each game port. They are not library abstractions even when they share class names.

## Implementation Order

1. Create the package/file structure exactly as listed above.
2. Implement `SlickException`, `Color`, `FastTrig`, and `Log`.
3. Implement resource manager integration through `ResourceLoader`.
4. Implement `LoadableImageData`, `ImageIOImageData`, and `TGAImageData` over already-loaded resource bytes.
5. Implement `Image` and `Graphics` on the WebGL2 render backend.
6. Implement `Input` with keyboard, pointer, and gamepad state.
7. Implement `Sound` and `Music`.
8. Implement `GameContainer` and `AppGameContainer`.
9. Implement `ScalableGame`, `ScalableGame2`, and `ApplicationGameContainer`.
10. Implement packed-sheet parsing for `.def` and XML sprite atlases.
11. Add `slick.support.IMode`, `IInput`, `ButtonMapping`, `HumanInput`, `RecordedInput`, `JavaRandom`, `Song`, `BitmapText`, `BinaryReader`, `SpriteDrawing`, and `GeometryMath`.
12. Add the narrow `lwjgl`, `lwjgl.openal.AL`, `slick.openal.SoundStore`, and `opengl` shims needed by copied helper code.

## Parity Verification Checklist

Before considering the library compatible with the three Java projects, verify:

- Every public class and interface listed in this document exists in its own file.
- Every listed public method has a Javadoc-style comment.
- Method names and argument order match the Java counterpart.
- Java overloads are represented with TypeScript overload signatures.
- Key constants used by the games have the exact LWJGL numeric values.
- `LoadableImageData`, `ImageIOImageData`, and `TGAImageData` can decode already-loaded bytes for icon/cursor compatibility paths.
- The games can construct `Image`, `Sound`, `Music`, `PackedSpriteSheet`, and `XMLPackedSheet` with their original resource path strings.
- `ScalableGame2.containerSizeChanged` updates input scale and offset.
- Legacy applet/container methods have explicit migration mappings and are not exported as applet APIs.
- `ApplicationGameContainer` exposes every desktop-style public method used by the Java helper code, including cursor and fullscreen methods.
- `slick.support.IMode`, `IInput`, `ButtonMapping`, `HumanInput`, `RecordedInput`, `JavaRandom`, `Song`, `BitmapText`, `BinaryReader`, `SpriteDrawing`, and `GeometryMath` cover the neutral reusable helper methods found in the three projects.
- `Image.FILTER_NEAREST` produces crisp pixel-art rendering.
- `Game.update` receives integer millisecond deltas.
- `Game.render` can draw images, rectangles, lines, and clipped world regions without changing game code semantics.
- Audio calls survive browser autoplay restrictions without crashing the game loop.
- Seeded `JavaRandom` output matches Java for `nextInt(bound)`, `nextFloat()`, and `nextBoolean()` in deterministic mode paths.
- Browser-adapted compatibility no-ops are documented in Javadoc comments and do not break the three source games.
