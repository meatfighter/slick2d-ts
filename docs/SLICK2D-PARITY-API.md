# Slick2D Parity API for TypeScript

This document specifies the TypeScript library we want to build from the Slick2D abstraction layer used by:

- `C:\NetBeansProjects\SlickJackal`
- `C:\NetBeansProjects\stickvania`
- `C:\NetBeansProjects\SlickMsPacMan`
- `C:\java-projects\slick2d`

The target is a pure modern TypeScript library for the web that preserves Slick2D's Java-facing shape closely enough that the game code can be ported with direct, mechanical substitutions. The API names, class boundaries, overload shapes, argument order, public constants, and expected side effects should map back to the Java counterparts one-to-one whenever the browser platform allows it.

The existing project docs remain authoritative for the browser-specific subsystems:

- `docs/RESOURCE-MANAGEMENT-SYSTEM.md`
- `docs/GAME-LOOP.md`

This file defines the Slick2D parity layer that should sit above those systems.

## Compatibility Goal

Implement the exact API surface used by the three source games first. Add broader Slick2D methods only when they are public dependencies of those classes or are cheap compatibility shims. Every public method listed here must have a Javadoc-style block comment in TypeScript that states:

- the Java Slick2D counterpart,
- whether the behavior is exact, browser-adapted, or intentionally unsupported,
- the important side effects.

Where Java returns `void`, TypeScript should also return `void` unless browser resource loading or startup genuinely requires a `Promise<void>`. `update` and `render` must remain synchronous.

## Project Layout

Use a TypeScript-native source layout that drops the Java vendor package roots `org` and `newdawn`, but keeps `slick` as the library namespace. This repo is already named `slick2d-ts`, so keeping `src/slick` gives us the useful part of the Java package identity without making every import carry Java-era ceremony.

Keep one TypeScript file per Java class or interface.

```text
src/
    slick/
        AppGameContainer.ts
        AppletGameContainer2.ts
        AppletGameContainer2Container.ts
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
        ScalableGameContainer.ts
        SlickException.ts
        Sound.ts
        SpriteSheet.ts
        XMLPackedSheet.ts
        util/
            FastTrig.ts
            Log.ts
            ResourceLoader.ts
        support/
            IInputBase.ts
            JackalInput.ts
            JackalHumanInput.ts
            JackalButtonMappingLike.ts
            MsPacManInput.ts
            MsPacManHumanInput.ts
            IMode.ts
            Song.ts
            ThingLike.ts
        opengl/
            CursorLoader.ts
            ImageData.ts
            InternalTextureLoader.ts
            SlickCallable.ts
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
jackal.Song / stickvania.Song        src/slick/support/Song.ts
org.newdawn.slick.opengl.GL wrapper  src/slick/opengl/*
org.lwjgl.Sys                        src/lwjgl/Sys.ts
org.lwjgl.opengl.GL11                src/lwjgl/opengl/GL11.ts
```

The `src/lwjgl` files are compatibility shims for project helper code that reaches below Slick2D. They should be thin wrappers around browser services and should not become the primary rendering API. Public Javadoc-style comments should still name the complete Java counterpart, for example `Java Slick2D counterpart: org.newdawn.slick.Image`.

## TypeScript Style Rules

- Use modern TypeScript with ES modules.
- Keep Java class and method names, including Java-style casing.
- Preserve the original misspelling `ControlledInputReciever`.
- Use one TS file per Java class or interface.
- Use overload signatures when Java has constructor or method overloads.
- Implement overloaded functions with one runtime implementation.
- End statements with semicolons.
- Indent with 4 spaces.
- Prefer `number` for Java `int`, `float`, `double`, and `long`.
- Prefer `string` for Java `String` and one-character Java `char`.
- Use mutable public fields when the Java class exposes mutable public fields.
- Use `static readonly` for Java public constants that should not be reassigned.
- Do not convert Java-like APIs to idiomatic web APIs at the public boundary.
- Keep `Game.init`, `Game.update`, and `Game.render` synchronous from the game author's point of view. `Game.init` may optionally return `Promise<void>` so `AppGameContainer.start()` can await browser resource preparation.

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

Implement these rules:

- The Slick parity layer must sit on top of the resource manager architecture from `docs/RESOURCE-MANAGEMENT-SYSTEM.md`.
- `Image`, `Sound`, `Music`, `PackedSpriteSheet`, and `XMLPackedSheet` should hold `ResourceHandle` objects internally, not raw browser resources acquired ad hoc.
- `AppGameContainer.start()` should create a startup `ResourceScope`, make it active while `Game.init` runs, then wait for `scope.ready()` before the first real frame.
- Dynamic resources created after startup should acquire handles from either the current active scope or an explicit long-lived container scope.
- Releasing a container or scene must release the associated resource scope so images, audio buffers, object URLs, and decoded data can be disposed deterministically.
- Cache keys must include handler kind plus every option that changes the runtime value, for example image path, filter mode, transparent color, atlas metadata path, and audio streaming mode.
- The manager must cache in-flight requests as well as completed values so two `new Image("images/foo.png")` calls share one network/decode operation.
- `ResourceLoader` is a Java compatibility adapter over the same manager. It must not maintain a second cache.
- Resource failures should produce structured errors with enough data to identify the path, handler kind, HTTP status when available, and original cause.
- Resource progress and diagnostics should come from the resource manager, not from individual Slick wrapper classes.
- Constructing `Image`, `Sound`, `Music`, `PackedSpriteSheet`, or `XMLPackedSheet` registers or retrieves a resource from the shared resource manager.
- Resource paths use the exact Java string values where possible, for example `images/player.png` and `sound/start.ogg`.
- `AppGameContainer.start()` must await all resources queued during `Game.init`.
- Resources created after startup must begin loading immediately and expose a ready state internally.
- Drawing an unloaded image must not crash the loop. It should either skip drawing and log once, or throw `SlickException` only in an explicit strict/debug mode.
- Playing unloaded audio should fail softly and log once.
- Missing or failed required resources must surface as `SlickException`.
- `.def` packed-sheet files must be loaded as text and parsed according to `PackedSpriteSheet`.
- XML packed-sheet files must be loaded as text and parsed with `DOMParser`.

### Timing

Java Slick2D passes integer millisecond deltas into `Game.update`. The TS library must do the same.

Implement these rules:

- Implement the Slick container loop as an adapter over the fixed-timestep game loop from `docs/GAME-LOOP.md`.
- The lower-level loop may use seconds internally, but the Slick adapter must convert each fixed step to Java-style integer milliseconds before calling `Game.update(container, delta)`.
- Use a default update rate of `60` updates per second unless the container configuration changes it.
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
- `Sys.getTime()` and `Sys.getTimerResolution()` should be available for ported helper code. Use a timer resolution of `1000` unless a compatibility reason requires another value.
- Fixed-timestep behavior should follow `docs/GAME-LOOP.md`.

### Rendering

The preferred backend is `CanvasRenderingContext2D`. A WebGL backend may be added later, but the public Slick2D API should not change.

Implement these rules:

- Coordinates use Slick2D's top-left origin.
- `Graphics` owns the current drawing state: color, font, clip, world clip, transform, anti-alias flag, draw mode, and line width.
- `Image` owns image state: alpha, rotation in degrees, center of rotation, source rectangle, flipped flags, filter, and name.
- `Graphics.pushTransform` and `Graphics.popTransform` map to canvas `save` and `restore`.
- `Graphics.scale`, `Graphics.rotate`, and `Graphics.translate` must affect later draw calls.
- `Image.draw` must respect both its own image state and the current `Graphics` state.
- `SlickCallable.enterSafeBlock` and `leaveSafeBlock` become state-save boundaries for compatibility with code that mixes `GL11` calls and `Graphics`.

### Audio

Use Web Audio where practical and HTML audio as a fallback for streaming music.

Implement these rules:

- `Sound` represents short effects.
- `Music` represents longer tracks and can loop.
- `Sound.play(pitch, volume)` maps pitch to playback rate where possible.
- `Music.setVolume` persists across future `play` and `loop` calls.
- Browser autoplay restrictions must be handled by deferring playback until audio is unlocked by a user gesture.
- `playing()` must report whether the sound or music instance is currently active.

### Fullscreen, Cursor, and Input

Implement these rules:

- `setFullscreen` maps to the browser Fullscreen API.
- `setMouseGrabbed` maps to Pointer Lock where available.
- Cursor methods should use CSS cursor values or browser cursor assets.
- Keyboard constants must retain the original LWJGL numeric values.
- Input polling methods must preserve Slick2D's difference between "pressed once" and "currently down".
- Controller methods should use the Gamepad API and preserve Slick2D's listener method names.

## Required API Surface

The following sections are the required public API. Every method listed here should be implemented or explicitly marked as a browser-adapted no-op where that is the correct parity behavior.

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
- Polling APIs such as `Input.isButtonPressed` may use zero-based indexes because the source games map buttons before polling.

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

- The default implementation may wrap a CSS font on `CanvasRenderingContext2D`.
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
    public add(c: Color): Color;
    public scale(value: number): Color;
    public addToCopy(c: Color): Color;
    public scaleCopy(value: number): Color;
}
```

Implementation instructions:

- Store `r`, `g`, `b`, and `a` as normalized floats from `0` to `1`, matching Slick2D.
- Integer constructors accept Java byte-like channel values from `0` to `255`.
- The single-number constructor interprets packed integer color values like Java Slick2D.
- Static color constants must be independent `Color` instances.
- `bind` applies this color to the current `Graphics` context or acts as a no-op when no context is active.
- Mutating methods must match Java behavior: methods without `Copy` mutate this instance and return it; `addToCopy` and `scaleCopy` return new instances.

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
- `Image(width, height)` creates an offscreen canvas-backed image.
- `getSubImage` returns a new `Image` view over the same source resource with a different source rectangle.
- `copy` returns a new `Image` object sharing the source pixels but with independent alpha, rotation, filter, name, and center state.
- `getFlippedCopy` composes the requested flip flags with the current image's flip state.
- `rotate(angle)` adds degrees to the current rotation.
- `setRotation(angle)` sets absolute degrees.
- `setAlpha(alpha)` stores persistent per-image alpha.
- `getGraphics()` returns a `Graphics` instance drawing into the image's offscreen canvas. Throw `SlickException` when the image is not writable.
- Texture/OpenGL methods such as `bind`, `startUse`, `endUse`, `clampTexture`, and `flushPixelData` may be compatibility no-ops for the canvas backend, but they must exist.
- Unsupported advanced draw modes such as `drawWarped` and `drawSheared` may throw `SlickException` until implemented, but the method signatures must exist.

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
- `setWorldClip` clips in current world coordinates and should be affected by the active transform.
- `clearClip` removes the screen clip.
- `clearWorldClip` removes the world clip.
- `getArea` returns an offscreen `Image` containing pixels copied from the current render target.
- `getArea(..., target)` writes RGBA bytes into the supplied buffer for cursor compatibility code.
- `flush` is a no-op for Canvas2D unless deferred batching is added.
- Shape-fill overloads may be unsupported initially, but the overload signature must exist.

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

    public constructor(height: number);
    public initControllers(): void;
    public addListener(listener: InputListener): void;
    public removeListener(listener: InputListener): void;
    public removeAllListeners(): void;
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
    public isButtonPressed(index: number, controller: number): boolean;
    public isButtonDown(index: number, controller: number): boolean;
    public isControllerLeft(controller: number): boolean;
    public isControllerRight(controller: number): boolean;
    public isControllerUp(controller: number): boolean;
    public isControllerDown(controller: number): boolean;
    public isControllerLeftPressed(controller: number): boolean;
    public isControllerRightPressed(controller: number): boolean;
    public isControllerUpPressed(controller: number): boolean;
    public isControllerDownPressed(controller: number): boolean;
    public getMouseX(): number;
    public getMouseY(): number;
    public isMouseButtonDown(button: number): boolean;
    public isMousePressed(button: number): boolean;
    public poll(width: number, height: number): void;
    public pause(): void;
    public resume(): void;
}
```

Implementation instructions:

- Required by the games: key constants listed above, `clearControlPressedRecord`, `clearKeyPressedRecord`, `isButtonPressed`, `isControllerDown`, `isControllerLeft`, `isControllerRight`, `isControllerUp`, `isKeyDown`, and `isKeyPressed`.
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
- `setScale` and `setOffset` are required by `ScalableGame` and `ScalableGame2`; they transform browser pointer coordinates into game coordinates.
- Gamepad direction methods must support `Input.ANY_CONTROLLER`.

### `slick.Sound`

```ts
export class Sound {
    public constructor(ref: string);
    public constructor(url: URL);
    public constructor(input: ArrayBuffer | Blob, ref: string);
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
- `play()` uses pitch `1` and volume `1`.
- `play(pitch, volume)` clamps volume to `0..1` and maps pitch to playback rate.
- `playAt` should ignore positional coordinates in the first implementation and behave like `play(pitch, volume)`.
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
    public setPosition(position: number): void;
}
```

Implementation instructions:

- Required by the games: `constructor(ref)`, `constructor(ref, streamingHint)`, `loop`, `play`, `playing`, `setVolume`, and `stop`.
- `streamingHint` selects streaming playback when supported, but must not alter public behavior.
- `play()` uses pitch `1` and the instance's current volume.
- `loop()` loops indefinitely.
- `Music.poll(delta)` dispatches end-of-track listener events and may otherwise be a no-op.

### `slick.MusicListener`

```ts
export interface MusicListener {
    musicEnded(music: Music): void;
    musicSwapped(music: Music, newMusic: Music): void;
}
```

Implementation instructions:

- Notify listeners when a non-looping track ends.
- `musicSwapped` is optional unless a global music handoff API is added.

### `slick.PackedSpriteSheet`

```ts
export class PackedSpriteSheet {
    public constructor(def: string);
    public constructor(def: string, trans: Color);
    public constructor(def: string, filter: number);
    public constructor(def: string, filter: number, trans: Color);
    public getFullImage(): Image;
    public getSprite(name: string): Image | null;
    public getSpriteSheet(name: string): SpriteSheet | null;
}
```

Implementation instructions:

- Required by the games: `constructor(def, Image.FILTER_NEAREST)` and `getSprite(name)`.
- Parse Slick2D `.def` packed-sheet files exactly enough to map sprite names to image rectangles.
- Load the sheet image referenced by the `.def` file.
- `getSprite` returns a subimage preserving the parent image filter and transparency.
- Return `null` for unknown sprite names, matching Java Slick2D behavior.

### `slick.XMLPackedSheet`

```ts
export class XMLPackedSheet {
    public constructor(imageRef: string, xmlRef: string);
    public getSprite(name: string): Image | null;
}
```

Implementation instructions:

- Required heavily by `SlickJackal`.
- Load `imageRef` as the backing image and `xmlRef` as XML text.
- Parse sprite entries by name and rectangle.
- `getSprite` returns an `Image` subimage or `null` when missing.

### `slick.SpriteSheet`

```ts
export class SpriteSheet {
    public constructor(ref: string, tw: number, th: number);
    public constructor(ref: string, tw: number, th: number, spacing: number);
    public constructor(ref: string, tw: number, th: number, spacing: number, margin: number);
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
- `getSubImage` and `getSprite` return a tile image by sheet index, not pixel coordinate.
- `spacing` and `margin` use Slick2D tile layout rules.
- `startUse`, `renderInUse`, and `endUse` may be compatibility no-ops around direct draw calls.

### `slick.GameContainer`

```ts
export abstract class GameContainer {
    public constructor(game: Game);
    public getGame(): Game;
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
    public enableStencil(): void;
    public setMultiSample(samples: number): void;
    public supportsMultiSample(): boolean;
    public getSamples(): number;
    public setVerbose(verbose: boolean): void;
}
```

Implementation instructions:

- Required by the games: `getHeight`, `getInput`, `getWidth`, `isFullscreen`, `setAlwaysRender`, `setClearEachFrame`, `setFullscreen`, `setIcon`, `setMusicOn`, `setShowFPS`, `setSmoothDeltas`, and `setVSync`.
- Store a reference to the `Game`, `Input`, and primary `Graphics`.
- `getWidth` and `getHeight` return logical game size, not necessarily CSS pixel size.
- `getScreenWidth` and `getScreenHeight` return the actual canvas backing size.
- `setClearEachFrame` controls whether the canvas is cleared before each render.
- `setAlwaysRender` controls rendering while paused or unfocused.
- `setSmoothDeltas` can enable delta smoothing but should default to Java-like raw deltas.
- `setVSync` records requested behavior; browsers already sync `requestAnimationFrame`.
- `setSoundOn`, `setMusicOn`, and volume methods feed the audio subsystem.
- Mouse cursor overloads map to CSS cursor assets. `ImageData`, `Image`, and `Cursor` overloads should create an object URL or data URL where possible.
- `setAnimatedMouseCursor` may use the first frame as a browser-adapted fallback because CSS animated cursor support is limited.
- `sleep` should be a compatibility no-op or a debug-only busy-wait must never be used in production.
- `enableStencil`, `setMultiSample`, and `supportsMultiSample` are browser-adapted compatibility functions. Canvas2D may report unsupported.

### `slick.AppGameContainer`

```ts
export class AppGameContainer extends GameContainer {
    public constructor(game: Game);
    public constructor(game: Game, width: number, height: number, fullscreen: boolean);
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
- `setDisplayMode` sets logical width and height, updates canvas sizing, and optionally requests fullscreen.
- `destroy` stops the loop and releases event listeners.
- `supportsAlphaInBackBuffer` returns whether the backing canvas supports alpha.
- The constructor without dimensions should use Slick2D's default `640x480` unless project configuration overrides it.

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

- This class supports `SlickJackal`'s custom application container usage.
- It should inherit all behavior from `AppGameContainer`.
- `setResizable` toggles whether browser resize events update the canvas/container size.

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
- `init` forwards to the held game.
- `update` forwards to the held game.
- `render` scales the `Graphics` transform, clips to the target area, calls held render, clears the clip, restores transform, and then calls `renderOverlay`.
- `recalculateScale` recomputes scale and target bounds based on container size.
- If `maintainAspect` is true, preserve the normal width/height aspect ratio and letterbox or pillarbox as needed.
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

- This is required by `stickvania` and `SlickMsPacMan`, which copy a custom `ScalableGame2`.
- Keep behavior equivalent to the copied Java class.
- `containerSizeChanged` recalculates target width, target height, target X, target Y, scale X, and scale Y from the current container dimensions.
- The method must update `container.getInput().setScale(scaleX, scaleY)` and `container.getInput().setOffset(targetX, targetY)`.
- The render path must preserve the `SlickCallable.enterSafeBlock` and `leaveSafeBlock` state boundary behavior.

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
    public static getResource(ref: string): URL | null;
    public static getResourceAsStream(ref: string): ArrayBuffer | null;
    public static resourceExists(ref: string): boolean;
}
```

Implementation instructions:

- Keep the public Java method names for compatibility.
- Back these calls with the modern resource manager from `docs/RESOURCE-MANAGEMENT-SYSTEM.md`.
- Browser code cannot synchronously fetch new network resources. These methods may only return already loaded resources.
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

- Required by `ApplicationGameContainer`, `ScalableGameContainer`, and duplicated `AppletGameContainer2`.
- `get()` returns a singleton, matching Java.
- `getCursor(ref, x, y)` loads an image resource and creates a cursor with the supplied hotspot.
- Buffer and `ImageData` overloads create a cursor from already available RGBA pixel data.
- Animated cursor support may use the first frame as a browser-adapted fallback.

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
- This is a compatibility facade over image resource caching, not a real OpenGL texture loader in Canvas2D mode.
- `clear()` should invalidate image/texture cache entries owned by the active rendering context where possible.
- `set16BitMode()` records the requested mode for parity diagnostics; Canvas2D may ignore it visually.
- `get2Fold` returns the smallest power of two greater than or equal to `fold`.

### `slick.opengl.renderer.SGL`

```ts
export interface SGL {
    glPushMatrix(): void;
    glPopMatrix(): void;
    glTranslatef(x: number, y: number, z: number): void;
    glScalef(x: number, y: number, z: number): void;
    glRotatef(angle: number, x: number, y: number, z: number): void;
    glViewport(x: number, y: number, width: number, height: number): void;
}
```

Implementation instructions:

- This is a narrow compatibility interface for copied Slick2D internals.
- Implement in terms of the current `Graphics` transform and viewport state.

### `slick.opengl.renderer.Renderer`

```ts
export class Renderer {
    public static get(): SGL;
}
```

Implementation instructions:

- Required by copied Slick2D classes that call `Renderer.get()`.
- Return the active `SGL` compatibility object.

### `slick.openal.SoundStore`

```ts
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
}
```

Implementation instructions:

- Required by copied applet/container code: `SoundStore.get().clear()`.
- The broader methods should delegate to the same audio subsystem used by `Sound` and `Music`.
- `get()` returns a singleton, matching Java.
- `clear` stops active audio and releases cached audio resources owned by the active container scope where possible.
- Source IDs are compatibility-only numbers. The browser implementation may return `0` source count unless a source pool is modeled.

### `lwjgl.Sys`

```ts
export class Sys {
    public static getTime(): number;
    public static getTimerResolution(): number;
}
```

Implementation instructions:

- Required by project helper code that schedules frame timing.
- `getTimerResolution()` should return `1000`.
- `getTime()` should return integer milliseconds from `performance.now()`.

### `lwjgl.LWJGLException`

```ts
export class LWJGLException extends Error {
    public constructor(message: string);
    public constructor(message: string, cause: unknown);
}
```

Implementation instructions:

- Required by copied container code that catches display or cursor creation failures.
- Use this only for compatibility shims. Core Slick APIs should expose `SlickException`.

### `lwjgl.opengl.GL11`

```ts
export class GL11 {
    public static glPushMatrix(): void;
    public static glPopMatrix(): void;
    public static glTranslatef(x: number, y: number, z: number): void;
    public static glScalef(x: number, y: number, z: number): void;
    public static glRotatef(angle: number, x: number, y: number, z: number): void;
    public static glViewport(x: number, y: number, width: number, height: number): void;
}
```

Implementation instructions:

- Required by `ScalableGame2` and copied container code.
- Delegate to `Renderer.get()`.
- Ignore the `z` value in Canvas2D mode.

### `lwjgl.opengl.DisplayMode`

```ts
export class DisplayMode {
    public constructor(width: number, height: number);
    public constructor(width: number, height: number, bitsPerPixel: number);
    public getWidth(): number;
    public getHeight(): number;
    public getBitsPerPixel(): number;
}
```

Implementation instructions:

- Provide enough parity for display-mode selection helpers.
- Instances are immutable value objects.
- `bitsPerPixel` defaults to `32` when omitted.

### `lwjgl.opengl.Display`

```ts
export class Display {
    public static create(): void | Promise<void>;
    public static create(pixelFormat: PixelFormat): void | Promise<void>;
    public static destroy(): void;
    public static isCreated(): boolean;
    public static update(): void;
    public static setParent(parent: unknown): void;
    public static setVSyncEnabled(enabled: boolean): void;
    public static getDisplayMode(): DisplayMode;
    public static getAvailableDisplayModes(): DisplayMode[];
    public static setDisplayMode(mode: DisplayMode): void;
    public static setFullscreen(fullscreen: boolean): void | Promise<void>;
    public static isFullscreen(): boolean;
    public static isActive(): boolean;
    public static isVisible(): boolean;
    public static isCloseRequested(): boolean;
    public static wasResized(): boolean;
    public static getWidth(): number;
    public static getHeight(): number;
}
```

Implementation instructions:

- This is a compatibility shim, not the primary app API.
- Delegate to the active `AppGameContainer` when possible.
- `getAvailableDisplayModes` may return the current screen size plus common game sizes.
- `create`, `destroy`, and `update` should map to active canvas lifecycle state rather than constructing a native display.
- `setParent` records the DOM host element or browser canvas owner when supplied.
- `setVSyncEnabled` records the requested flag; browser animation frames are already display-synchronized.

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
- Store hotspot and image data, then let `Mouse.setNativeCursor` map it to CSS where possible.

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
}
```

Implementation instructions:

- Compatibility value object only.
- Store requested format values for diagnostics.

## Container Compatibility Facades

Some source projects include custom classes that are not part of vanilla Slick2D but are part of the abstraction layer being ported.

### `AppletGameContainer2`

```ts
export class AppletGameContainer2 {
    public constructor(game: Game);
    public init(): Promise<void>;
    public start(): void;
    public startLWJGL(): void;
    public stop(): void;
    public destroy(): void;
    public addNotify(): void;
    public removeNotify(): void;
    public getContainer(): AppletGameContainer2Container;
}

export class AppletGameContainer2Container extends GameContainer {
    public constructor(game: Game);
    public initApplet(): void | Promise<void>;
    public isRunning(): boolean;
    public stopApplet(): void;
    public getScreenHeight(): number;
    public getScreenWidth(): number;
    public supportsAlphaInBackBuffer(): boolean;
    public hasFocus(): boolean;
    public getApplet(): AppletGameContainer2;
    public setIcon(ref: string): void;
    public setMouseGrabbed(grabbed: boolean): void | Promise<void>;
    public isMouseGrabbed(): boolean;
    public setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(data: ImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setIcons(refs: string[]): void;
    public setDefaultMouseCursor(): void;
    public isFullscreen(): boolean;
    public setDisplayMode(fullscreen: boolean): void | Promise<void>;
    public setFullscreen(fullscreen: boolean): void | Promise<void>;
    public runloop(): Promise<void>;
}
```

Implementation instructions:

- Required by source projects that expose a Java applet entry point.
- Browser TS should implement this as a thin facade over `AppGameContainer`.
- `getContainer` must return the underlying container.
- `init` creates the underlying container and canvas target.
- `start` resumes the loop if it was stopped.
- `startLWJGL` starts the browser container loop or returns immediately if already running.
- `stop` pauses the loop without destroying resources.
- `addNotify` and `removeNotify` are applet lifecycle aliases. In browser mode they should call `startLWJGL` and the cleanup path respectively.
- `initApplet` initializes rendering, input controllers, the held game, and delta timing.
- `setDisplayMode(fullscreen)` is the project-local boolean overload used by the copied applet containers.
- Cursor and icon methods follow the same browser-adapted behavior as `GameContainer`.
- `runloop` delegates to the `AppGameContainer` game loop and should not implement a blocking `while` loop in TS.

### `ScalableGameContainer`

```ts
export class ScalableGameContainer {
    public destroy(): void;
    public start(): void;
    public startLWJGL(): void;
    public stop(): void;
    public init(): Promise<void>;
    public addNotify(): void;
    public removeNotify(): void;
    public getContainer(): GameContainer;
}
```

Implementation instructions:

- This supports `SlickJackal` helper code.
- It is an applet-style wrapper similar to `AppletGameContainer2`, not a vanilla Slick2D class.
- It should behave like an `AppGameContainer` facade with resize-aware scaling support.
- Prefer composing `ScalableGame` or `ScalableGame2` rather than duplicating scaling logic.
- Its inner container should expose the same public methods listed for `AppletGameContainer2Container` except for the project-specific `setDisplayMode(boolean)` behavior where Jackal's source differs.

## Game Port Support Layer

The three Java games also contain small project-level abstractions built on top of Slick2D. These are not vanilla Slick2D classes, but they are common enough to document as optional support modules for TS ports.

Keep these under `src/slick/support`. Do not put game-domain classes such as enemies, stages, actors, or title screens into the Slick core.

### Common Class Name Audit

The shared Java source names found across two or more projects are:

- `AppletGameContainer2`: common browser/applet container wrapper; document and support as a facade.
- `ScalableGame2`: common scalable game wrapper; document and support.
- `IInput`: common input abstraction with project-specific extensions.
- `HumanInput`: common implementation idea with different constructor and controls per game.
- `IMode`: identical mode lifecycle interface in Jackal and MsPacMan.
- `Song`: common intro/loop music sequencer, with Jackal having the superset API.
- `Thing`: shared name, but not a shared abstraction. stickvania uses platform/collision physics; MsPacMan uses maze movement helpers.
- `Stage`: shared name, but data-only and project-specific.
- `Main`, `LoadingMode`, `IntroMode`, `Flame`, and `Ghost`: shared names, but game-domain classes with different behavior.

Document `AppletGameContainer2`, `ScalableGame2`, `IInput`, `HumanInput`, `IMode`, and `Song` as support targets. Leave `Thing`, `Stage`, `Main`, `LoadingMode`, `IntroMode`, `Flame`, and `Ghost` to each game port unless a later extraction identifies a genuinely identical helper method.

### `slick.support.IMode`

```ts
export interface IMode<TMain = unknown> {
    init(main: TMain, gc: GameContainer): void | Promise<void>;
    update(gc: GameContainer): void;
    render(gc: GameContainer, g: Graphics): void;
}
```

Implementation instructions:

- Java counterparts: `jackal.IMode` and `mspacman.IMode`.
- The Java methods throw `SlickException`; TS implementations should throw `SlickException` for parity failures.
- Use a generic `TMain` because each game has a different `Main` class.
- `update` has no `delta` argument because the Java modes are driven by each game's `Main.update` timing policy.

### `slick.support.IInputBase`

```ts
export interface IInputBase {
    reset(): void;
    isUp(): boolean;
    isDown(): boolean;
    isLeft(): boolean;
    isRight(): boolean;
    isEnter(): boolean;
    isEscape(): boolean;
    isPause(): boolean;
    clearKeyPressedRecord(): void;
    update(): boolean;
}
```

Implementation instructions:

- Java counterparts: shared subset of `jackal.IInput` and `mspacman.IInput`.
- Direction methods return held state.
- `isEnter`, `isEscape`, and `isPause` return one-shot pressed state.
- `clearKeyPressedRecord` delegates to Slick `Input.clearKeyPressedRecord`.
- `update` returns `true` for human input and may return `false` for replay/robot input when no more input is available.

### `slick.support.JackalInput`

```ts
export interface JackalInput extends IInputBase {
    snap(): void;
    isFire(): boolean;
    isShoot(): boolean;
    isF12(): boolean;
}
```

Implementation instructions:

- Java counterpart: `jackal.IInput`.
- `snap` captures held directional and weapon state for the current frame.
- `isFire` maps to grenade/fire action.
- `isShoot` maps to gun/shoot action.
- `isF12` is a one-shot fullscreen/debug key check.

### `slick.support.MsPacManInput`

```ts
export interface MsPacManInput extends IInputBase {
    isSpace(): boolean;
}
```

Implementation instructions:

- Java counterpart: `mspacman.IInput`.
- `isSpace` is a one-shot spacebar check.

### `slick.support.JackalButtonMappingLike`

```ts
export interface JackalButtonMappingLike {
    keyUp: number;
    keyDown: number;
    keyLeft: number;
    keyRight: number;
    keyGrenade: number;
    keyGun: number;
    gunKeyMapped: boolean;
    controller: boolean;
    controllerIndex: number;
    controllerGrenade: number;
    controllerGun: number;
}
```

Implementation instructions:

- Java counterpart: the public field shape used by `jackal.ButtonMapping`.
- Keep this as a structural interface so the Jackal port can keep its exact `ButtonMapping` class locally.

### `slick.support.JackalHumanInput`

```ts
export class JackalHumanInput implements JackalInput {
    public constructor(buttonMapping: JackalButtonMappingLike, gc: GameContainer);
    public snap(): void;
    public reset(): void;
    public isUp(): boolean;
    public isDown(): boolean;
    public isLeft(): boolean;
    public isRight(): boolean;
    public isFire(): boolean;
    public isShoot(): boolean;
    public isEnter(): boolean;
    public isF12(): boolean;
    public isEscape(): boolean;
    public isPause(): boolean;
    public clearKeyPressedRecord(): void;
    public update(): boolean;
}
```

Implementation instructions:

- Java counterpart: `jackal.HumanInput`.
- `snap` stores directional and action held state from `GameContainer.getInput()`.
- When `gunKeyMapped` is false, `isShoot` should be based on `Input.KEY_Z`, `Input.KEY_Y`, `Input.KEY_W`, or `Input.KEY_K`.
- When `controller` is true, include controller directions and one-shot controller button presses.
- `isPause` returns true for `Input.KEY_P` or `Input.KEY_ENTER`.
- `reset` is a no-op and `update` returns `true`, matching Java.

### `slick.support.MsPacManHumanInput`

```ts
export class MsPacManHumanInput implements MsPacManInput {
    public constructor(gc: GameContainer);
    public reset(): void;
    public isUp(): boolean;
    public isDown(): boolean;
    public isLeft(): boolean;
    public isRight(): boolean;
    public isEnter(): boolean;
    public isSpace(): boolean;
    public isEscape(): boolean;
    public isPause(): boolean;
    public clearKeyPressedRecord(): void;
    public update(): boolean;
}
```

Implementation instructions:

- Java counterpart: `mspacman.HumanInput`.
- `isUp` checks `KEY_UP`, `KEY_W`, `KEY_I`, and `KEY_8`.
- `isDown` checks `KEY_DOWN`, `KEY_S`, `KEY_K`, and `KEY_2`.
- `isLeft` checks `KEY_LEFT`, `KEY_A`, `KEY_J`, and `KEY_4`.
- `isRight` checks `KEY_RIGHT`, `KEY_D`, `KEY_L`, and `KEY_6`.
- `isEnter`, `isSpace`, `isEscape`, and `isPause` are one-shot checks.
- `reset` is a no-op and `update` returns `true`, matching Java.

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

- Java counterparts: `jackal.Song` and `stickvania.Song`.
- Use Jackal's public-field, three-part intro/intro2/loop version as the shared superset.
- `STREAMING` must default to `false`, matching Jackal.
- String constructors create `Music` instances with the same path strings supplied by the Java code.
- `play` is idempotent while already playing.
- If there is no intro and no intro2, `play` starts `loop.loop()`.
- If there is no intro but there is `intro2`, `play` starts `intro2.play()`.
- Otherwise `play` starts `intro.play()`.
- `update` starts `intro2` after `intro` finishes when `intro2` exists and has not played.
- `update` starts `loop.loop()` after the intro sequence finishes when `loop` exists.
- If there is no loop and the intro sequence finishes, `update` calls `stop`.

### `slick.support.ThingLike`

```ts
export interface ThingLike {
    update(gc: GameContainer): void | boolean;
    render(gc: GameContainer, g: Graphics): void;
}
```

Implementation instructions:

- Java counterparts: the minimal shared shape of `stickvania.Thing` and `mspacman.Thing`.
- Do not implement a shared concrete `Thing` class in the Slick library. The two Java classes have incompatible fields, movement rules, collision semantics, and `update` return types.
- Use this interface only for generic containers or test helpers that need to call `update` and `render` on game objects.

## Implementation Order

1. Create the package/file structure exactly as listed above.
2. Implement `SlickException`, `Color`, `FastTrig`, and `Log`.
3. Implement resource manager integration through `ResourceLoader`.
4. Implement `Image` and `Graphics` on Canvas2D.
5. Implement `Input` with keyboard, pointer, and gamepad state.
6. Implement `Sound` and `Music`.
7. Implement `GameContainer` and `AppGameContainer`.
8. Implement `ScalableGame`, `ScalableGame2`, `ApplicationGameContainer`, and applet/container facades.
9. Implement packed-sheet parsing for `.def` and XML sprite atlases.
10. Add `slick.support.IMode`, input support interfaces/adapters, `Song`, and `ThingLike`.
11. Add the narrow `lwjgl`, `openal`, and `opengl` shims needed by copied helper code.

## Parity Verification Checklist

Before considering the library compatible with the three Java projects, verify:

- Every public class and interface listed in this document exists in its own file.
- Every listed public method has a Javadoc-style comment.
- Method names and argument order match the Java counterpart.
- Java overloads are represented with TypeScript overload signatures.
- Key constants used by the games have the exact LWJGL numeric values.
- The games can construct `Image`, `Sound`, `Music`, `PackedSpriteSheet`, and `XMLPackedSheet` with their original resource path strings.
- `ScalableGame2.containerSizeChanged` updates input scale and offset.
- `AppletGameContainer2`, `ScalableGameContainer`, and `ApplicationGameContainer` expose every public method used by the Java helper code, including cursor and fullscreen methods.
- `slick.support.IMode`, `JackalInput`, `MsPacManInput`, `JackalHumanInput`, `MsPacManHumanInput`, and `Song` cover the common game-side helper methods found in the three projects.
- `Image.FILTER_NEAREST` produces crisp pixel-art rendering.
- `Game.update` receives integer millisecond deltas.
- `Game.render` can draw images, rectangles, lines, and clipped world regions without changing game code semantics.
- Audio calls survive browser autoplay restrictions without crashing the game loop.
- Unsupported compatibility no-ops are documented in Javadoc comments and do not break the three source games.
