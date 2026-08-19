# Compatibility Notes

`slick2d-ts` is a browser compatibility layer for selected Slick2D and LWJGL APIs. It keeps Java-style names and behavior where that makes sense for browser game ports, but it is not a full desktop runtime.

## Browser Runtime Boundaries

- Rendering uses WebGL2. If the browser loses and restores the WebGL context, GPU objects are recreated from retained decoded image data where possible. Framebuffer-backed render target contents are not preserved by the browser and must be redrawn by the game.
- The main loop is owned by `AppGameContainer` and browser `requestAnimationFrame`. `Display.update()` is intentionally a no-op for copied Java loops that still call it.
- Fullscreen, pointer lock, audio unlock, high-DPI backing stores, visibility throttling, and gamepad polling follow browser security and lifecycle rules.
- Keyboard, pointer, wheel, context-menu, touch-action, and gamepad input are mapped to Slick/LWJGL-style APIs. Browser-reserved keys or gestures may still be intercepted by the user agent.

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
