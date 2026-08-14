# slick2d-ts High-DPI Canvas Handoff

Date: 2026-08-14

## Purpose

`slick2d-ts` now renders browser canvases with a high-DPI backing store while keeping public Slick-style coordinates logical.

This change was made in `C:\js-projects\slick2d-ts` only. Dependent projects such as Jackal, Ms. Pac-Man, and Stickvania should generally update their `slick2d-ts` dependency/build output, then verify rendering and input. They should not need game-logic changes.

## What Changed In slick2d-ts

`AppGameContainer` now separates:

- Logical display size: CSS pixels used by Slick APIs, game logic, input, and `ScalableGame`.
- Backing size: physical/device pixels used by the canvas drawing buffer and WebGL default framebuffer.

High-DPI rendering is enabled by default and capped at DPR `2`.

New browser helper APIs on `AppGameContainer`:

```ts
setHighDpiEnabled(enabled: boolean): void;
isHighDpiEnabled(): boolean;
setMaxDevicePixelRatio(maxDevicePixelRatio: number): void;
getDevicePixelRatio(): number;
getBackingWidth(): number;
getBackingHeight(): number;
```

Important defaults:

```text
highDpiEnabled = true
maxDevicePixelRatio = 2
```

Example on a DPR 2 display:

```text
Logical size:        1024 x 960
Canvas CSS size:     1024px x 960px
Canvas backing size: 2048 x 1920
WebGL viewport:      2048 x 1920
Slick coordinates:   0..1024, 0..960
Input coordinates:   0..1024, 0..960
```

## Public API Behavior To Preserve

Dependent projects should continue treating these as logical CSS-pixel APIs:

- `GameContainer.getWidth()`
- `GameContainer.getHeight()`
- `GameContainer.getScreenWidth()`
- `GameContainer.getScreenHeight()`
- `Display.getWidth()`
- `Display.getHeight()`
- `Input.getMouseX()`
- `Input.getMouseY()`
- `ScalableGame` target dimensions and offsets

Do not multiply input coordinates by `window.devicePixelRatio`.

Do not use `canvas.width` / `canvas.height` as the app layout size anymore. Those are now backing pixels. For layout, use the container logical size, CSS size, host bounds, or `getWidth()` / `getHeight()`.

If a dependent project truly needs backing pixels, use:

```ts
appContainer.getBackingWidth();
appContainer.getBackingHeight();
appContainer.getDevicePixelRatio();
```

## Renderer Details

The WebGL renderer now uses:

- Backing dimensions for `gl.viewport(...)`.
- Logical dimensions for vertex projection.
- Logical-to-backing conversion for default-framebuffer scissor clips.
- Logical-to-backing conversion for `Graphics.getPixel(...)`, `Graphics.getArea(...)`, and `Graphics.copyArea(...)`.
- DPR-neutral render targets.

This means normal game rendering should look sharper on high-DPI displays without changing world size, scaling, collision logic, input mapping, or fullscreen aspect-fit behavior.

## What Dependent Projects Usually Need

1. Update or rebuild against the latest local `slick2d-ts`.
2. Refresh bundled/vendor `slick2d-ts` output if the project checks built dependency files into its tree.
3. Update tests that assert `canvas.width === logicalWidth` or `canvas.height === logicalHeight`; backing size may now be `logical * effectiveDpr`.
4. Keep existing viewport/aspect-fit code unchanged unless it directly reads `canvas.width` / `canvas.height`.
5. Keep existing input code unchanged unless it manually applies DPR compensation.
6. Manually verify windowed mode, fullscreen mode, menu overlays, pointer input, and gamepad/keyboard input.

## Things Not To Do

- Do not add project-local DPR scaling on top of this engine fix.
- Do not multiply mouse/touch coordinates by DPR.
- Do not change `ScalableGame` math to use backing pixels.
- Do not change Java-port game logic dimensions to backing pixels.
- Do not replace app CSS layout sizing with canvas backing sizing.
- Do not force global texture filtering changes as part of this update.

## Suggested Dependent-Project Checks

On DPR 1:

- Visual size should match previous behavior.
- Canvas backing size should match logical size.

On DPR 1.5 or DPR 2:

- Visual CSS size should match previous behavior.
- Canvas backing size should be larger than CSS size, capped by `maxDevicePixelRatio`.
- The game should fill the same visible area as before.
- Pixel art should be sharper, subject to the existing Slick texture filter settings.
- Pointer/click input should still land in the expected logical location.
- Fullscreen aspect-fit and black bars should be unchanged.
- PWA menus and overlays should still align with the canvas.

## If A Project Needs To Opt Out

Call this before starting or resizing the container:

```ts
appContainer.setHighDpiEnabled(false);
```

To reduce GPU cost without fully disabling high-DPI:

```ts
appContainer.setMaxDevicePixelRatio(1.5);
```

## Verification Already Run In slick2d-ts

The `slick2d-ts` change was verified with:

```text
npm.cmd run build
npm.cmd test
```

Result:

```text
119 passed, 0 failed
```

Covered by tests:

- High-DPI canvas backing size with logical display APIs.
- Fullscreen enter/exit restore with high-DPI backing sizes.
- Logical projection unaffected by high-DPI backing size.
- High-DPI scissor conversion.
- High-DPI `Graphics.getPixel(...)` readback.
- High-DPI `Graphics.copyArea(...)` source resolve into logical render targets.

