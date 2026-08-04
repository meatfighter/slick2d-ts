# Implementation Audit

Date: 2026-08-02

This audit compares the current TypeScript implementation against the Java Slick2D source and the three audited game projects:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick`
- `C:\NetBeansProjects\SlickJackal`
- `C:\NetBeansProjects\stickvania`
- `C:\NetBeansProjects\SlickMsPacMan`

## Validation Commands

```text
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test
```

All commands pass after the audit fixes.

## Direct API Coverage

The implementation covers the direct Slick2D/LWJGL calls observed in the game source:

- Rendering: `Image.draw`, `getFlippedCopy`, `getSubImage`, `getWidth`, `getHeight`, `setAlpha`, `setRotation`, `Graphics.setColor`, `fillRect`, `drawRect`, `drawLine`, `setClip`, `clearClip`, `setWorldClip`, `clearWorldClip`, `drawImage`, `flush`, `getArea`, `getColor`.
- Containers: `GameContainer` and `AppGameContainer` setters/getters used by copied code, including fullscreen, display mode, icons, cursor overloads, sound/music toggles, FPS/clear/vsync flags, focus, screen size, reinit, multisample, and stencil shims.
- Input: all observed `Input.KEY_*` constants, edge/held key state, `clearKeyPressedRecord`, `clearControlPressedRecord`, controller directions, controller button polling, and listener add/remove methods.
- Audio: `Sound.play`, `play(pitch, volume)`, `playing`, `stop`; `Music.play`, `loop`, `playing`, `setVolume`, `stop`; neutral `Song` helper sequencing.
- Atlases/resources: `PackedSpriteSheet(def, filter)`, `XMLPackedSheet(imageRef, xmlRef)`, `getSprite`, and Java-style `ResourceLoader.getResourceAsStream`.
- LWJGL shims: direct game/copy usage of `Display`, `DisplayMode`, `PixelFormat`, `GL11`, `Mouse`, `Cursor`, `BufferUtils`, `Sys`, and `AL`.
- Reusable helpers: neutral `ButtonMapping`, `HumanInput`, `IInput`, `BitmapText`, `BinaryReader`, `JavaRandom`, `JavaNumbers`, `GeometryMath`, and `SpriteDrawing`.

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
- Added `ResourceLoader.setCacheBust`, retry configuration, and pending-work counters so PWA fetch behavior can be configured without changing Java ref strings.
- Added `ResourceLoader.preloadResources(...)` as the manifest-style pre-init barrier for browser ports that must fetch/register Java resource refs before synchronous XML/DEF/binary parsing in `init`.
- Added `JavaNumbers` for shared Java primitive numeric semantics in converted game logic: int wrapping, double-to-int saturation, int division/remainder, byte/short/char narrowing, float narrowing, and Java round behavior.
- Added `SoundStore.unlock()` so PWA Start-button handlers can create/resume Web Audio explicitly before gameplay playback, while preserving already-initialized sound/music toggles.
- Added eager Web Audio decode readiness for `Sound` and `Music` constructors through `ready()`/`load()` promises while preserving synchronous Java call sites.
- Restored Java `Music.currentMusic` semantics: starting one track stops/swaps the previous current track, `playing()` is tied to the current channel, and pending async starts are invalidated by `stop()`/`pause()`.
- Fixed `GameContainer.setMusicOn(false)` / `SoundStore.setMusicOn(false)` to pause active music and resume it from the stored position when music is enabled again.
- Added a runtime resource barrier in `AppGameContainer` so resources queued after `game.init()` can render loading progress once, then pause the loop until queued fetch/decode work settles.
- Added game-key `preventDefault()` handling scoped to the active canvas so arrows, Space, Enter, Escape, WASD/IJKL, and number-pad-style top-row controls do not scroll or trigger browser UI during play.
- Updated fullscreen/display sizing to use the browser Fullscreen API promise, `fullscreenchange`, and `resize` before recalculating WebGL display dimensions.
- Fixed `AppGameContainer` close-request ordering so `game.closeRequested()` is called only after `Display.isCloseRequested()` is true, matching Java and avoiding per-frame game shutdown side effects.
- Reset static `Display` close state on create/destroy/new active container registration, and destroy the Display shim with `AppGameContainer.destroy()`.
- Added `AppGameContainer.setErrorHandler()` so async frame/resource failures queued after `start()` can be delivered to the host PWA instead of requiring a raw RAF exception.
- Fixed `Input.pause()` and paused `poll()` to clear one-shot key, mouse, and controller records like Java.
- Split browser default prevention from Slick input acceptance so focused DOM controls can use Space/Enter/arrows without leaking one-shot keys or pointer clicks into the game.
- Added browser lost-focus cleanup for Slick input on `window.blur`, hidden `visibilitychange`, and inactive `poll()` so held movement keys cannot stick after a missed `keyup`.
- Fixed global music-off handling so `SoundStore.setMusicOn(false)` suspends audible Web Audio playback without invoking public `Music.pause()` semantics or clearing `Music.playing()`.
- Allowed `Music.play()` / `loop()` while global music is off to become the current suspended music and resume audibly when music is enabled again, matching Java `playAsMusic`.
- Wrapped initial `AppGameContainer.start()` init/preload work in cleanup/error handling so failed starts unbind listeners, reset Display/renderer state, and can be retried.
- Fixed `ResourceLoader` location handling to try ordered browser locations, preserve root-relative paths like `/assets`, clear all locations on `removeAllResourceLocations()`, and refetch failed records on retry.
- Fixed fullscreen/display-mode failures to reject with `SlickException`, restore previous canvas/container dimensions on denied fullscreen, and notify resize-aware games after browser-applied size changes.
- Added internal observation for returned fullscreen/display-mode promises so Java-style callers that ignore `setDisplayMode(..., true)` or `setFullscreen(true)` do not create unhandled promise rejections; denied fullscreen is routed to `AppGameContainer.setErrorHandler()` or `Log.error` after state restoration.
- Restored transparent/native cursors when fullscreen entry is denied after game code has already hidden the cursor, covering Java-style update paths that hide first and request fullscreen second.
- Added a Java-style resize compatibility hook: if the wrapped game exposes `containerSizeChanged(container)`, `AppGameContainer` calls it after canvas/fullscreen/browser resize changes and marks `Display.wasResized()`.
- Made `AppGameContainer.destroy()` call `AL.destroy()` so active Web Audio handles are stopped/cleared on host teardown, load failure, retry, or menu return paths.
- Implemented transparent/native cursor parity for byte-buffer cursors: all-zero/transparent cursor data maps to CSS `cursor: none`, and non-transparent RGBA cursor bytes become a CSS cursor data URL.
- Added last-windowed-display tracking so browser-forced fullscreen exits restore the Java windowed canvas mode instead of preserving the fullscreen viewport size.
- Made destroy-while-fullscreen restore windowed canvas CSS/size, request `document.exitFullscreen()` fire-and-forget, restore transparent native cursors, and clear stale static `Display` fullscreen state.
- Added Node regression tests for forced fullscreen exit, explicit fullscreen exit notification de-duplication, and fullscreen teardown cleanup.
- Made `AppGameContainer` default to Java's visible-only update policy and reset frame timing across hidden/visible transitions so hidden time is not fed into the next visible update.
- Modeled Java `SoundStore` initialization gating: pre-init `setSoundOn`/`setMusicOn` calls are ignored, and successful init enables sound effects and music.
- Added a finite Java-style logical sound-effect source pool with source 0 reserved for music, source capacity diagnostics, and drop-on-exhaustion behavior.
- Changed `Sound.playing()` and `Sound.stop()` to track only the latest logical source for that `Sound`, while `SoundStore.clear()` / `AL.destroy()` remain the global cleanup paths.
- Matched Java sound-effect volume behavior: `Sound` applies global sound volume before `SoundStore.playSound`, `SoundStore` applies it again when creating the source, and later `setSoundVolume` calls do not retroactively change already-playing sound-effect gain.
- Fixed failed `Sound.play()` / `Sound.loop()` attempts to clear the remembered latest source, matching Java `AudioImpl` when `SoundStore` returns `-1`.
- Matched Java's `findFreeSource()` loop bound by keeping both source 0 and the last logical source unavailable to sound effects.
- Implemented `SoundStore.stopSoundEffect(id)` for logical source IDs and made `setMaxSources(...)` stop any effect that would land in the newly unavailable last slot.
- Fixed no-argument `Music.play()` and `Music.loop()` to reset the individual music volume to `1`, matching Java's `play(1.0f, 1.0f)` and `loop(1.0f, 1.0f)` delegates.
- Replaced direct `FastTrig` `Math.sin`/`Math.cos` calls with Java Slick2D's angle-reduction implementation and `cos(x) = sin(x + PI/2)` rule.
- Updated `docs/SLICK2D-PARITY-API.md` to match the implementation and verified Java behavior.

## External Audit Verification

The follow-up audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_FULL_AUDIT_FOR_FIXES.md` was checked against the Java Slick2D source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- `Image(String, boolean)` now treats the boolean as Slick's y-axis load flip, not a horizontal mirror.
- `Image(String, Color)` and `Image(String, boolean, filter, Color)` now apply transparent-color alpha during browser decode.
- `Image(ArrayBuffer | Blob, ref, flipped, filter)` now decodes the supplied bytes instead of ignoring them and loading by ref.
- `Image(ImageData)` now uploads the supplied Slick image bytes instead of creating a blank canvas.
- `Image(int, int)` defaults to `FILTER_NEAREST`, matching Java.
- `Image.getScaledCopy` now changes logical display size without changing the sampled source rectangle.
- `Image.ensureInverted` is now idempotent.
- `Image.getColor` now reads cached texture pixel data instead of the current framebuffer.
- `Image.bind`, `startUse`, and `endUse` now bind/check WebGL texture state through the renderer.
- `Image.setRotation`, `rotate`, and `setAlpha` now follow Slick's modulo/no-clamp behavior.
- `Image.setColor`/`setImageColor` now affect rendering through WebGL per-vertex color attributes.
- `PackedSpriteSheet` now defaults to nearest filtering and validates malformed `.def` sections.
- `XMLPackedSheet` now caches subimages at construction and wraps malformed XML or attributes in `SlickException`.
- `SpriteSheet` now extends `Image`, uses nearest filtering for string constructors, caches tile subimages, performs Java-style bounds checks, and preserves `startUse`/`renderInUse`/`endUse` call shape.
- `Color` constants, copy/decode constructors, `add`, `scale`, `brighter`, `darker`, byte getters, copy helpers, and `hashCode` now match the Slick source.
- `Sound` and `Music` Blob constructors now register bytes with the resource loader; `SoundStore.isMusicPlaying()` now ignores sound-effect handles.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT.md` was also checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- `Sound` and `Music` constructors now queue fetch plus Web Audio decode, and that decode is tracked through `ResourceLoader.waitForAll()` instead of waiting for first playback.
- Audio load/decode failures now reject the tracked readiness promise and are surfaced as `SlickException`/logged playback errors rather than being silently swallowed.
- `Music` now has Java's single current-music channel behavior, including swap listener notifications and non-overlap between direct `Music.play()` calls.
- `Music.stop()` and `pause()` invalidate pending async starts so a track cannot begin after a mode transition stops it.
- `SoundStore.setMusicOn(false)` now pauses tracked music handles, matching Java `pauseLoop()` behavior; setting it back to true resumes from the stored music position.
- `ResourceLoader` now supports retry count/delay, cache-version query strings, `hasPending()`, and `getPendingCount()` while keeping the original Java ref as the logical cache key.
- `Input` now prevents browser defaults for mapped game keys only when the game canvas owns input and not when an editable/menu control has focus.
- `AppGameContainer` now updates display size after fullscreen promises, `fullscreenchange`, and `resize` events, and dynamic resource work queued during loading frames blocks the next frame until it completes.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_2.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- `AppGameContainer` now checks `Display.isCloseRequested()` before calling `game.closeRequested()`, matching Java's loop and preventing game-specific close side effects during ordinary frames.
- `Display.create()`, `Display.destroy()`, and registering a new active container now clear stale static close requests so PWA menu/restart flows do not inherit a previous exit flag.
- `AppGameContainer.destroy()` now calls `Display.destroy()` so `Display.isCreated()` and close-state lifecycle match the active container.
- `AppGameContainer.setErrorHandler(handler)` lets the host receive async frame/resource failures after `start()` has resolved. Without a handler, errors are still surfaced asynchronously instead of being swallowed.
- `Input.pause()` and paused `Input.poll()` now clear pressed key, mouse, and controller records, matching Java Slick2D.
- Keyboard events from focused DOM controls are ignored by Slick input state, and pointer/wheel events outside the game surface are ignored, so menu buttons/sliders do not enqueue stale game actions.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_3.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- Lost browser focus now clears held key/mouse state and one-shot input records so movement keys cannot remain down after a missed `keyup`.
- `AppGameContainer.hasFocus()` no longer treats a stale canvas `activeElement` as focused when `document.hasFocus()` is false.
- Global `setMusicOn(false)` now performs a Java-style music-store suspension rather than a public `Music.pause()`, preserving current music and `playing()` semantics.
- A music start requested while global music is off now becomes the current suspended track and starts audibly when music is enabled again.
- Initial `game.init()` or startup `ResourceLoader.waitForAll()` failures now clean up container state and either call `setErrorHandler()` or reject `start()` after cleanup.
- `ResourceLoader` now fetches candidate locations in order, retries each candidate, applies cache-bust to every attempted URL, preserves `/assets` as origin-root absolute, and lets failed records be fetched again on retry.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_4.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- Fullscreen entry/exit failures now reject as `SlickException` instead of being swallowed.
- A failed fullscreen display-mode request restores the previous logical and canvas dimensions instead of leaving a huge non-fullscreen canvas.
- Browser-applied fullscreen and resize changes now mark `Display.wasResized()` and call a Java-style `containerSizeChanged(container)` hook when the active game exposes it, which keeps scalable render/input transforms current.
- `AppGameContainer.destroy()` now mirrors Java teardown by calling `AL.destroy()`, stopping tracked sounds/music and clearing decoded audio buffers.
- `Mouse.setNativeCursor(cursor)` now honors cursor pixel data for `Uint8Array` cursors, including all-zero transparent buffers used by the game to hide the pointer.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_5.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- `AppGameContainer` now tracks the last successful non-fullscreen display mode separately from requested fullscreen dimensions.
- Browser-forced fullscreen exit restores the last windowed canvas backing size and CSS size, sets the container fullscreen flag false, marks `Display.wasResized()`, and calls `containerSizeChanged(container)` when the active game exposes that helper.
- Explicit `setDisplayMode(width, height, false)` paths do not double-notify resize-aware games when the later browser `fullscreenchange` observes the same restored size.
- `AppGameContainer.destroy()` now restores the windowed canvas size and cursor before clearing the Mouse element, requests `document.exitFullscreen()` when the canvas owns fullscreen, then tears down renderer/audio/display state.
- `Display.destroy()` and `Display.setActiveContainer(null)` now clear stale static fullscreen state so `Display.isFullscreen()` is false between PWA sessions.
- `Mouse` now remembers the visible native cursor before an all-transparent cursor hide and can restore it when fullscreen is exited by the browser or container teardown instead of by game code.
- Added regression coverage for forced fullscreen exit, explicit exit notification count, and destroy-while-fullscreen cleanup.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_6.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- `AppGameContainer` now defaults `updateOnlyWhenVisible` to true, matching Java `AppGameContainer`, while preserving the public setter/getter override.
- Hidden frames skip update/render by default, and visibility restoration resets frame timing so the first visible update receives only visible elapsed time.
- `SoundStore` now has Java-style `inited`/`soundWorks` gating: pre-init sound/music toggle calls are no-ops, and the first successful init enables both sound effects and music.
- `SoundStore` now exposes `setMaxSources(max)` and uses a finite logical source pool for effects, with source 0 reserved for music and no-play return when all effect sources are occupied.
- `SoundStore.getSourceCount()` now returns logical source capacity instead of the number of currently active browser handles.
- `Sound.stop()` and `Sound.playing()` now operate on the latest handle/source for that `Sound`, matching Java `AudioImpl`, instead of stopping/reporting every overlapping handle spawned by the same `Sound`.
- Sound-effect gain now follows the checked Slick2D Java source's double global-volume application and does not retroactively alter active sound effects when `setSoundVolume(...)` changes later.
- Added regression coverage for visible-only updates, hidden-frame delta reset, pre-init audio toggles, source-pool exhaustion/reuse, latest-source stop semantics, and sound-effect gain.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_7.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- A failed `Sound.play(...)`, `playAt(...)`, or `loop(...)` now clears the remembered latest source/handle, so `Sound.playing()` and `Sound.stop()` see no current source just like Java `AudioImpl.index = -1`.
- `SoundStore` now uses Java's exact effect-source search bound, equivalent to `for (i = 1; i < sourceCount - 1; i++)`, so source 0 and the final logical source are unavailable for effects.
- Regression tests now encode that `setMaxSources(3)` gives one effect slot, while `setMaxSources(4)` gives two effect slots.
- The additional source-pool audit found and fixed `setMaxSources(...)` preserving a handle in the new last/unavailable slot after resizing down.
- The additional public API audit found and fixed `SoundStore.stopSoundEffect(id)`, which now stops the matching logical source instead of no-oping.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_8.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- No-argument `Music.play()` now starts with pitch `1` and volume `1` instead of reusing the instance's previous volume.
- No-argument `Music.loop()` now starts with pitch `1` and volume `1` instead of reusing the instance's previous volume.
- Explicit overloads such as `play(1, 0.25)` and `loop(1, 0.25)` continue to preserve the supplied volume.
- Added regression coverage for no-argument music volume reset and explicit-volume overload behavior.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_9.md` was checked against Java Slick2D and the game source before code changes. Confirmed browser-relevant bugs fixed in this pass:

- `FastTrig.sin(...)` now mirrors Java Slick2D's `reduceSinAngle(...)` algorithm before dispatching to `Math.sin` or `Math.cos`.
- `FastTrig.cos(...)` now mirrors Java Slick2D by returning `FastTrig.sin(radians + Math.PI / 2)` instead of direct `Math.cos`.
- Added regression coverage for the Java-style expected values over small, branch-switching, large, and negative radian samples, plus the explicit cosine offset rule.

The re-audit in `C:\js-projects\ms-pac-man-2010-js\SLICK2D_TS_MSPACMAN_REAUDIT_10.md` was checked after the follow-up placeholder audit. It reported no new game-relevant Slick2D TypeScript repair items for the `SlickMsPacMan` browser port. Its remaining cautions are game-port concerns, not library defects: preserve Java integer division/truncation when porting game arithmetic, and keep the browser PWA shell/start-menu/audio-unlock behavior outside the Slick compatibility library.

The Stickvania follow-up audit in `C:\js-projects\stickvania-js\SLICK2D_TS_STICKVANIA_REAUDIT_2026-08-03.md` was checked against the current library. Confirmed browser-relevant bug fixed in this pass:

- Failed fullscreen entry now restores any transparent cursor hide when the final state is not fullscreen, so a Java-style Stickvania port that hides the cursor before calling `setDisplayMode(..., true)` does not leave the windowed canvas at CSS `cursor: none` if the browser denies fullscreen.

The same Stickvania follow-up audit also calls for real-browser proof that a trusted Space key press can drive `Input.isKeyPressed(Input.KEY_SPACE)` in the RAF update path and still satisfy transient activation for `requestFullscreen()`. The current Node fake-DOM suite cannot prove that browser security condition. No game-specific fullscreen shortcut was added to `slick2d-ts`; the correct verification is a Chromium/Playwright or equivalent browser test in the app/test harness.

The Jackal handoff in `C:\js-projects\jackal-js\SLICK2D_TS_JACKAL_FIX_HANDOFF.md` was checked against the current library. Confirmed browser-relevant library work added in this pass:

- `ResourceLoader.preloadResources(...)` now provides the neutral manifest pre-init barrier the Jackal bootstrap can call before `AppGameContainer.start()`, with retry/cache-bust behavior inherited from `loadResource` and progress over original Java refs.
- `JavaNumbers` now provides the shared Java numeric helper set needed by Jackal's converted collision, timer, map, projectile, and packed-value logic.
- `SoundStore.unlock()` now provides the explicit Start-button Web Audio unlock/restart hook; `AL.destroy()`/`SoundStore.destroy()` still own return-to-menu teardown.
- WebGL world-clip regression coverage now verifies transformed scissor conversion under camera translation and scalable-game-style scale.

The same Jackal handoff includes app-port responsibilities that are intentionally not added to `slick2d-ts`: PWA splash UI, user-facing loader screens, a 126-file Jackal asset manifest, game-source numeric-cast auditing, and real-browser menu/start/restart automation. `CursorLoader.getCursor(String, ...)` remains async because browser image decode is async; Jackal's observed hide-cursor path uses the synchronous byte-buffer overload. The `ScalableGame2` z-scale remains `0` because the copied Java `ScalableGame2` classes use `GL.glScalef(..., ..., 0)`.

The Jackal re-audit in `C:\js-projects\jackal-js\SLICK2D_TS_JACKAL_REAUDIT_2026-08-03.md` was checked against the current library and the Java Slick2D behavior. Confirmed browser-relevant library fixes added in this pass:

- `WebGLRenderer` now keeps separate screen and world clip state, applies their intersection to WebGL scissor, and lets `clearWorldClip()` preserve an outer `ScalableGame` clip while `clearClip()` preserves an active world clip.
- Sound-effect gain now clamps only to `>= 0`, so global sound volume `0` or per-sound volume `0` produces exact Web Audio gain `0` while preserving Java's double global-volume multiplication for nonzero values.
- Controller polling now treats standard Gamepad D-pad buttons `12..15` as Slick POV equivalents, suppresses duplicate button listener edges for those POV stand-ins, and tracks down state separately from one-shot `isControlPressed(...)` records so release and repeat press callbacks are delivered.
- `ResourceLoader.track(promise, refOrLabel)` now retains failed image/audio decode or other browser preparation errors until `clearCache()`. `getTrackedErrors()`, `hasFailed()`, and `waitForAll()` expose those failures even after the failed promise has settled.
- `Color.fromInts(...)` and `Color.fromFloats(...)` provide explicit Java overload mappings for ports. Internal framebuffer/image byte reads now use the int path so byte channel `1` means `1 / 255`.

The same re-audit's pre-init resource barrier concern remains a documented port/bootstrap contract rather than an automatic container rewrite: when a port synchronously parses XML, DEF, text, or binary bytes inside `game.init(...)`, the browser bootstrap must call `ResourceLoader.preloadResources(...)` before `AppGameContainer.start()`. The container's post-init `waitForAll()` still covers image/audio decode work queued during Java-shaped constructors, but it cannot retroactively satisfy synchronous parsers that never received preloaded bytes.

The Jackal re-audit pass 2 in `C:\js-projects\jackal-js\SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS2.md` was checked against `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java`. Confirmed browser-relevant helper bug fixed in this pass:

- `SpriteDrawing.drawRotated(...)`, `drawRotatedScaled(...)`, `drawCentered(...)`, and Jackal-style `drawScaled(...)` now use the renderer/graphics transform stack to match Java's `glPushMatrix -> glTranslatef -> glRotatef -> glScalef -> image.draw(localOffset) -> glPopMatrix` sequence. Explicit center arguments are treated as local draw offsets, not `Image` rotation pivots.
- These helpers no longer mutate image rotation or center-of-rotation state, and alpha overloads reset image alpha to exactly `1`, matching Jackal's helper methods.
- `SpriteDrawing.withRotation(...)` now matches Jackal's `rotateGraphics(...)` helper by translating to the local origin before rotation instead of performing a screen-space pivot rotation, and transform wrappers pop in `finally`.
- Regression tests now cover centered rotation, explicit negative offsets, 90-degree rotation, non-uniform scaled rotation, Jackal centered scaling, nested outer transforms, alpha reset, and non-mutation of image rotation/center state.

The same pass noted that Ms. Pac-Man's `drawScaled` helper uses a different top-left-anchored translate-to-center convention. That remains a game-local wrapper concern; the shared `SpriteDrawing.drawScaled(...)` is documented as the Jackal-style centered-origin helper.

The Jackal re-audit pass 3 in `C:\js-projects\jackal-js\SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS3.md` was checked against the support helpers and parity docs. Confirmed browser-relevant helper bugs fixed in this pass:

- `SpriteDrawing.drawScaled(image, x, y, scale, alpha)` is now unambiguously the Jackal centered scale/alpha helper for all scale values, including `scale > 1`; explicit top-left width/height drawing moved to `drawSized(...)`.
- `SpriteDrawing.drawOffset(...)` now matches Jackal's local-coordinate helper, including the alpha overload's reset-to-`1` behavior. The old camera-subtraction behavior is available only through the explicitly named `drawCameraOffset(...)`.
- `GeometryMath.ISQRT2`, `createUnitVector2(...)`, and `rotate(...)` now mirror Jackal's `Math.cos`/`Math.sin` plus Java `float` narrowing instead of Slick `FastTrig` double-precision behavior.
- `Song.play()`, `Song.update()`, and `Song.stop()` now preserve Jackal `Song.java` ordering, including `play()` calling `stop()` first, `playing = true` after the start call, no `playedIntro2` change in `play()`, and stopping only currently playing parts.
- `BitmapText.drawStringAlpha(...)` now resets glyph alpha to exactly `1` after each draw, matching Jackal's helper instead of restoring a prior non-`1` alpha.
- Regression tests were added for the scale/alpha overload trap, local-offset drawing, explicit camera-offset drawing, Java-float geometry, Song sequencing, and bitmap text alpha reset.

The Jackal re-audit pass 4 in `C:\js-projects\jackal-js\SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS4.md` was checked against Java Slick2D `GameContainer.updateAndRender(...)` and the browser RAF loop. Confirmed browser-relevant container timing bug fixed in this pass:

- `AppGameContainer` now keeps Java-style `storedDelta` state and treats `minimumLogicUpdateInterval` as an accumulation threshold, not a per-frame delta floor.
- `maximumLogicUpdateInterval` now splits large accumulated deltas into repeated fixed-size `game.update(...)` calls and handles the Java remainder rule exactly: update and clear only when `remainder > minimumLogicUpdateInterval`; otherwise retain the remainder.
- Paused containers now still poll input, call `Music.poll(delta)` and `SoundStore.get().poll(delta)`, and call `game.update(container, 0)` on processed frames.
- Smooth deltas now use Java's `1000 / getFPS()` integer timing when FPS is nonzero, instead of averaging browser timestamps.
- `targetFrameRate` is no longer inert: positive values pace the RAF loop without blocking the browser thread, and processed frames still call `Display.sync(targetFrameRate)` as the Slick/LWJGL compatibility record.
- Rendering now follows Java's `hasFocus() || getAlwaysRender()` condition instead of using paused state as the render gate.
- Regression tests now cover minimum accumulation, maximum catch-up splitting, retained remainders, paused zero-delta updates, paused audio polling, target-FPS pacing, smooth deltas, and the default Jackal raw-delta path.

The Jackal re-audit pass 5 in `C:\js-projects\jackal-js\SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS5.md` was checked against Java Slick2D `AppGameContainer.reinit()`, Java `GameContainer.initSystem()`, and Jackal's local `ApplicationGameContainer.reinit()`. Confirmed browser-relevant lifecycle bug fixed in this pass:

- `AppGameContainer.reinit()` now performs a Java-parity browser rebuild instead of only calling `game.init(...)`.
- Reinit cancels the active RAF callback, clears retained resource failures while preserving successful preloaded bytes, clears `InternalTextureLoader` texture resources, clears active audio through `SoundStore.clear()`, rebuilds renderer/display/audio state, resets music and sound volume to `1`, recreates `Graphics` and the default font, enters ortho mode, resets frame bookkeeping and resource-error state, then calls `game.init(...)` and awaits `ResourceLoader.waitForAll()`.
- `InternalTextureLoader.clear()` is no longer a no-op. `WebGLTextureResource` instances register with the texture loader, and `clear()` / `clear(name)` dispose the matching WebGL texture resources.
- `ResourceLoader.clearFailures()` now clears failed fetch records, tracked pending handles, and retained tracked decode/preparation errors without removing successfully preloaded bytes, so a PWA reinit can recover from stale failures without discarding the manifest preload cache.
- Regression tests now cover texture-loader disposal and the `reinit()` cleanup-before-init ordering, stale failure clearing, audio-handle clearing, volume reset, graphics/default-font recreation, frame-state reset, and RAF rescheduling.

The random performance handoff in `C:\js-projects\jackal-js\SLICK2D_TS_RANDOM_PERFORMANCE_ISSUE_2026-08-04.md` was checked against `JavaRandom` and Jackal's heavy gameplay use of `java.util.Random` parity. Confirmed browser-relevant hot-path performance bug fixed in this pass:

- `JavaRandom` now stores Java's 48-bit LCG seed as three numeric 16-bit limbs instead of a single BigInt.
- `next(bits)`, `nextInt()`, `nextInt(bound)`, `nextFloat()`, and `nextBoolean()` no longer perform BigInt arithmetic or allocate temporary objects in the hot path.
- Java behavior is preserved: `setSeed(...)` still applies `(seed ^ 0x5DEECE66D) & ((1 << 48) - 1)` at the API boundary, `nextInt(bound)` keeps Java's power-of-two fast path and signed-overflow rejection loop, and unbounded `nextInt()` still returns the signed 32-bit `next(32)` value.
- Regression tests now cover Java vectors for unbounded ints, bounded ints, rejection-loop stress bound `1073741825`, exact `nextFloat()` values, booleans, and nonpositive-bound errors.
- `BinaryReader.readLong()` intentionally remains BigInt-based because Jackal DAT direction data uses Java signed `long` bitfields and needs exact 64-bit parity.

The performance/parity audit on 2026-08-04 was checked against Java Slick2D `Image`, `Graphics`, `Input`, `Music`, `SoundStore`, `SGL`, the WebGL renderer, and the helper usages in the three source games. Confirmed browser-relevant efficiency and parity fixes added in this pass:

- `WebGLRenderer` now batches same-texture sprite/image quads into a reusable `Float32Array` and emits them at Slick flush boundaries, texture changes, render-target changes, clip changes, readbacks, clears, and solid/immediate drawing boundaries. Tint, alpha, corner colors, transforms, and global alpha are baked per vertex at queue time so later browser state changes do not rewrite the Java draw order.
- `WebGLRenderer` now reuses typed vertex buffers for solid quads, gradient lines, and immediate-mode geometry instead of allocating `Float32Array`, point arrays, and mapped vertex objects per draw.
- Renderer transforms now mutate the current matrix and pool pushed matrices; `translate`, `scale`, `rotate`, `glLoadIdentity`, `glLoadMatrix`, `setWorldClip`, and `glGetFloat(GL_MODELVIEW_MATRIX, ...)` no longer allocate short-lived matrices or point arrays on the normal path.
- `WebGLShaderProgram` now caches attribute and uniform locations after the first lookup, avoiding repeated WebGL reflection calls during sprite-heavy rendering.
- `Graphics` and `Image` now reuse an internal identity transform for draw delegation, and hot `Graphics` methods use explicit render-target enter/exit calls instead of allocating callback closures.
- `Input` controller polling now reuses its seen/stale collections, avoids cloning `navigator.getGamepads()`, uses numeric controller keys instead of string keys, and replaces per-frame `filter`, `some`, `forEach`, and `Array.from` work with loops.
- `Music.poll`, `SoundStore.clear`, `SoundStore.setMusicOn`, and `SoundStore.isMusicPlaying` no longer allocate arrays just to iterate active handles.
- `Image.copy()` now matches Java Slick2D's subimage-copy semantics: the copy shares pixels/source rectangle but resets alpha, rotation, user name, per-corner colors, and center state. `getScaledCopy(...)` inherits that reset through `copy()`.
- `Image.getTextureOffsetX/Y()` and `Image.getTextureWidth/Height()` are now implemented with normalized Slick texture-coordinate and flipped-axis sign parity.
- Regression tests now cover Java `Image.copy()` draw-state reset behavior, texture-coordinate accessors for subimages and flipped copies, and WebGL same-texture batching plus forced flush ordering before solid drawing.
- Remaining API-surface differences were checked against the three game source trees. The unimplemented `Graphics.draw/fill` shape hierarchy, `drawAnimation`, and `texture` methods were not found in the audited game calls and remain outside the current three-port scope.

The Jackal current-bug inventory in `C:\js-projects\jackal-js\SLICK2D_TS_CURRENT_BUGS_2026-08-04.md` was checked after the performance audit. It reported no Jackal-blocking `slick2d-ts` defect, but identified broader Slick2D parity gaps. Confirmed repairs added in this pass:

- `Graphics.drawImage(...)` now matches Java arity: no-color drawing uses `Color.white`, explicit color filters are preserved, source-rectangle overloads are implemented, destination/source-rectangle overloads are implemented, and the old TS-only width/height interpretation is removed from the `Graphics` facade.
- `Graphics.fillRect(x,y,width,height,pattern,offX,offY)` now implements Java patterned tiling with world-clip confinement and previous-world-clip restoration.
- `Graphics.getClip()`, `Graphics.getWorldClip()`, and `setWorldClip(clip|null)` now expose the Java-style clip record API using `ClipRect` copies.
- `Image.drawFlash(...)` now routes through a WebGL flash/silhouette shader mode instead of ordinary tint drawing. The shader uses sampled texture alpha and flash color RGB/alpha, and the batch splits when flash mode changes.
- `Graphics.setDrawMode(...)` now applies Java blend/color-mask state for normal, alpha-map, alpha-blend, color-multiply, add, and screen modes.
- `Graphics.clearAlphaMap()` now performs Java's alpha-map clear sequence and restores draw mode. The Java source leaves the current color as the transparent clear color after this call, and the TypeScript tests document that source-accurate behavior.
- Regression tests now cover these repairs: Java `Graphics.drawImage` overload arity/default tint, patterned `fillRect`, WebGL flash shader state, draw-mode WebGL state, and `clearAlphaMap`.

The follow-up post-repair bug inventory in `C:\js-projects\jackal-js\SLICK2D_TS_CURRENT_BUGS_2026-08-04.md` found three remaining full-library items. Confirmed repairs added in this pass:

- `Image.draw(x,y,scale,filter)` now exists as a public overload and dispatches without a rest array. It scales by the image's current logical width and height and preserves the supplied filter.
- `Image.drawEmbedded(...)` now includes Java's full-image and source-rectangle overloads. Embedded drawing no longer routes through ordinary `draw(...)`, so it does not apply image rotation or stored image alpha. The source-rectangle embedded path also suppresses per-corner image colors, matching Java's separate embedded vertex path.
- Internal WebGL image draw calls now accept `useCornerColors` and embedded-null-tint current-color flags so full-image draws keep Slick corner colors, source-rectangle `Image.draw(...)` and source-rectangle `drawEmbedded(...)` match Java's no-corner-color behavior, and embedded no-filter draws can inherit the current SGL color without changing ordinary `Image.draw(...)` white-filter semantics.
- `Graphics.drawImage(...)` now uses fixed optional parameters and `arguments.length` for overload dispatch, removing the per-call rest-array allocation while preserving Java arities and keeping the non-Java width/height convenience overload out of the `Graphics` facade.
- Regression tests now cover scale-plus-filter image drawing, source-rectangle corner-color behavior, embedded source-rectangle drawing without alpha/rotation, embedded null-tint current-color behavior, and `startUse`/`endUse` lifecycle errors.

Claims intentionally not converted into desktop-exact behavior:

- Native applet, AWT/Swing, LWJGL Display, filesystem, classpath, native OpenAL buffers/sources, and blocking timing behavior remain browser shims.
- `Music` accepts the Java streaming hint but uses Web Audio buffers. This is deliberate for the web desktop browser target and the three games' music handoff code.
- `PackedSpriteSheet` and `XMLPackedSheet` still require metadata bytes to be preloaded before their constructors when those constructors synchronously parse `.def` or XML text. This is an explicit browser contract, not a place to fake Java classpath I/O.
- `ResourceLoader` retry/cache-bust support does not replace a game PWA manifest or splash-screen loader; it gives the Slick parity layer the same hooks so assets loaded through Slick do not bypass those requirements.
- Fullscreen and pointer lock remain asynchronous browser APIs. The library updates its canvas and WebGL dimensions when the promise/events settle; game ports that immediately call scale recalculation after `setDisplayMode` should either await the returned promise or also recalculate from `resize`/`fullscreenchange`. Java-style ignored fullscreen calls are supported because the container observes and reports rejected fullscreen promises internally.
- Browser-forced fullscreen exits are handled by the library by restoring the last known non-fullscreen Slick mode. A port may still add game-local UI reactions, but it must not compensate by adding title-specific fullscreen state fixes to `slick2d-ts`.
- Shape rendering, warped/sheared image rendering, `Graphics.copyArea`, `Graphics.getArea(...): Image`, and gradient-line color interpolation are now implemented through the WebGL2 renderer even though the three audited game rendering paths do not call most of those APIs.
- Slick's `ShapeFill` hierarchy remains outside this library's current public surface, but this is separate from Java's patterned `fillRect(..., Image, offX, offY)` overload, which is now implemented.
- Raw SGL texture-name methods now maintain a simple WebGL texture ID map. Fixed-function calls without a WebGL2 equivalent, such as clip planes, texture-env state, point-size state, mirror-clamp extension checks, and secondary color, remain compatibility shims and are not used by the audited games.
- `Sound.playAt(...)` now routes coordinates through a Web Audio `PannerNode` when available; the audited games do not call it, but it no longer ignores `x/y/z` on capable browsers.

## Browser-Specific Boundaries

These differences are intentional and must be kept during game ports:

- WebGL2 is the rendering backend. Do not port Slick's desktop renderer internals or add Phaser/Pixi/Three to the core library.
- Web Audio API is the audio backend. The Slick `streamingHint` constructor parameter is accepted for parity but does not switch to `HTMLAudioElement`.
- Web Audio sources remain one-shot browser nodes, but `SoundStore` now provides Java-visible logical source slots, capacity, exhaustion/drop behavior, and source IDs for compatibility.
- Gamepad API backs controller polling and callbacks. Listener button callbacks stay one-based; stored polling mappings stay zero-based.
- Browser resource fetch/decode is asynchronous. Any Java code that synchronously parses resource bytes must preload those refs before construction, then read through `ResourceLoader.getResourceAsStream`.
- Dynamic Java-style loading screens may construct resources during `update`; `AppGameContainer` renders that progress frame, then waits for `ResourceLoader.hasPending()` work before the next update.
- `Display.sync(...)` remains nonblocking in the browser. `GameContainer.setTargetFrameRate(...)` is honored by RAF pacing in `AppGameContainer`, while `Display.sync(targetFPS)` records the processed-frame cap request for compatibility.
- Browser autoplay policy still requires a user gesture before reliable audio decode/playback. The host page should focus the canvas and call `SoundStore.get().unlock()` from the Start button handler before entering the game loop.
- Host pages should install `AppGameContainer.setErrorHandler()` when they need a splash/loading UI to display queued resource failures. The library still surfaces unhandled errors if no handler is installed.
- DOM controls used for a browser menu should live outside the active canvas focus path or pause the container; either way, Slick input now ignores their keyboard and pointer events.
- Cursor hiding now works at the canvas/native-cursor shim level, and forced fullscreen exit or denied fullscreen entry restores the visible cursor saved before the transparent hide. A PWA menu or hamburger overlay can still override cursor visibility with ordinary DOM/CSS outside the canvas.
- `ResourceLoader.getResource(ref)` remains a syntactic best-effort URL helper. Actual load success is determined by `loadResource(ref)`, which tries every configured location.
- `removeAllResourceLocations()` now matches Java and leaves no default browser location. Use `addResourceLocation("")` when a port intentionally wants relative-to-page lookup after clearing.
- Applets/AWT/Swing/native window concepts are not library APIs. Use `AppGameContainer`/`ApplicationGameContainer`, DOM canvas, Fullscreen API, and Pointer Lock API.

## Port Readiness

The library is ready as a parity base for TS ports of the three games, provided each game port:

- preloads atlas XML/DEF files, image files, binary map files, and audio refs before Java-style synchronous constructors/readers need them;
- uses `ResourceLoader.preloadResources(manifest, onProgress)` or an equivalent app loader before constructing code that synchronously parses XML/DEF/binary bytes;
- awaits `Sound.ready()` / `Music.ready()` or relies on the `AppGameContainer` dynamic resource barrier before leaving loading modes that construct audio after `init`;
- calls `SoundStore.get().unlock()` from a user gesture before expecting browser audio to play;
- uses `JavaNumbers` at converted Java integer division, remainder, cast, byte, char, float, round, and packed-value boundaries;
- treats fullscreen toggles as browser-async: await `setDisplayMode` when caller code needs post-fullscreen sequencing, while direct Java-style ignored calls are allowed because the container observes rejected promises internally; still handle resize/fullscreen events;
- installs an `AppGameContainer` error handler before `start()` when the PWA needs to show loading/resource errors inside the UI;
- focuses the game canvas when handing control from menu DOM to game input so browser key defaults are suppressed only during play;
- configures `ResourceLoader` locations deliberately for the deployed base path, for example `addResourceLocation("/assets")` for origin-root assets or `addResourceLocation("assets")` for route-relative assets;
- ports game-domain classes locally rather than adding them to `slick2d-ts`;
- replaces Java file/network side effects such as `FileOutputStream`, `URL.openStream`, `System.exit`, and applet lifecycle calls with game-local browser code;
- keeps one TypeScript file per Java class for the game source, matching the library style.
