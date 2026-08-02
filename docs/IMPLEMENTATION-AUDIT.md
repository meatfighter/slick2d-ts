# Implementation Audit

Date: 2026-08-01

This audit compares the current TypeScript implementation against the Java Slick2D source and the three audited game projects:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick`
- `C:\NetBeansProjects\SlickJackal`
- `C:\NetBeansProjects\stickvania`
- `C:\NetBeansProjects\SlickMsPacMan`

## Validation Commands

```text
npm.cmd run lint
npm.cmd run typecheck
```

Both commands pass after the audit fixes.

## Direct API Coverage

The implementation covers the direct Slick2D/LWJGL calls observed in the game source:

- Rendering: `Image.draw`, `getFlippedCopy`, `getSubImage`, `getWidth`, `getHeight`, `setAlpha`, `setRotation`, `Graphics.setColor`, `fillRect`, `drawRect`, `drawLine`, `setClip`, `clearClip`, `setWorldClip`, `clearWorldClip`, `drawImage`, `flush`, `getArea`, `getColor`.
- Containers: `GameContainer` and `AppGameContainer` setters/getters used by copied code, including fullscreen, display mode, icons, cursor overloads, sound/music toggles, FPS/clear/vsync flags, focus, screen size, reinit, multisample, and stencil shims.
- Input: all observed `Input.KEY_*` constants, edge/held key state, `clearKeyPressedRecord`, `clearControlPressedRecord`, controller directions, controller button polling, and listener add/remove methods.
- Audio: `Sound.play`, `play(pitch, volume)`, `playing`, `stop`; `Music.play`, `loop`, `playing`, `setVolume`, `stop`; neutral `Song` helper sequencing.
- Atlases/resources: `PackedSpriteSheet(def, filter)`, `XMLPackedSheet(imageRef, xmlRef)`, `getSprite`, and Java-style `ResourceLoader.getResourceAsStream`.
- LWJGL shims: direct game/copy usage of `Display`, `DisplayMode`, `PixelFormat`, `GL11`, `Mouse`, `Cursor`, `BufferUtils`, `Sys`, and `AL`.
- Reusable helpers: neutral `ButtonMapping`, `HumanInput`, `IInput`, `BitmapText`, `BinaryReader`, `JavaRandom`, `GeometryMath`, and `SpriteDrawing`.

No game-title-specific modules are exported. The project names appear only as audited source references in docs.

## Audit Fixes Applied

- Added ESLint with TypeScript support and a `lint` npm script.
- Replaced HTML audio usage with Web Audio API playback through `AudioContext`, decoded `AudioBuffer`s, `AudioBufferSourceNode`s, and gain nodes.
- Fixed `PixelFormat` constructor parity using bundled LWJGL bytecode: 3/4 argument forms are `(alpha, depth, stencil[, samples])`; 5 argument form is `(bpp, alpha, depth, stencil, samples)`.
- Fixed `ScalableGame` default constructor parity to `maintainAspect=false`, restored the Java wide-screen scale branches, Java update recalculation condition, and render-time offset calculation.
- Fixed `ScalableGame2` to mirror the copied Java helper for `init`, `containerSizeChanged`, render sequencing, offset calculation, and input transform.
- Fixed `HumanInput(mapping, gc)` so mapped fire/shoot keyboard state uses held `isKeyDown`, matching Java `snap()`.
- Changed packed atlas loader failures to `SlickException`.
- Added `ResourceLoader.track()` and connected image decode promises to `ResourceLoader.waitForAll()` so browser decode work participates in the preload barrier.
- Updated `docs/SLICK2D-PARITY-API.md` to match the implementation and verified Java behavior.

## Browser-Specific Boundaries

These differences are intentional and must be kept during game ports:

- WebGL2 is the rendering backend. Do not port Slick's desktop renderer internals or add Phaser/Pixi/Three to the core library.
- Web Audio API is the audio backend. The Slick `streamingHint` constructor parameter is accepted for parity but does not switch to `HTMLAudioElement`.
- Gamepad API backs controller polling and callbacks. Listener button callbacks stay one-based; stored polling mappings stay zero-based.
- Browser resource fetch/decode is asynchronous. Any Java code that synchronously parses resource bytes must preload those refs before construction, then read through `ResourceLoader.getResourceAsStream`.
- Applets/AWT/Swing/native window concepts are not library APIs. Use `AppGameContainer`/`ApplicationGameContainer`, DOM canvas, Fullscreen API, and Pointer Lock API.

## Port Readiness

The library is ready as a parity base for TS ports of the three games, provided each game port:

- preloads atlas XML/DEF files, image files, binary map files, and audio refs before Java-style synchronous constructors/readers need them;
- ports game-domain classes locally rather than adding them to `slick2d-ts`;
- replaces Java file/network side effects such as `FileOutputStream`, `URL.openStream`, `System.exit`, and applet lifecycle calls with game-local browser code;
- keeps one TypeScript file per Java class for the game source, matching the library style.

