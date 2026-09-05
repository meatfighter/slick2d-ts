# slick2d-ts

`slick2d-ts` is a TypeScript/WebGL2 compatibility layer for porting Java games built on Slick2D and LWJGL-style APIs to modern browsers.

The project focuses on the APIs and behaviors needed by maintained Java-to-TypeScript game ports. It is not a complete Slick2D implementation, a desktop runtime, or a general-purpose browser game engine.

## What it provides

- Slick-style `Game`, `BasicGame`, and `AppGameContainer` lifecycle behavior.
- WebGL2 rendering with Java/Slick-style `Graphics`, `Image`, sprite-sheet, shape, transform, clip, and draw-mode APIs.
- Native-resolution buffered rendering with Smooth, Crisp, and Pixel Perfect presentation modes.
- High-DPI canvas backing stores while gameplay coordinates remain logical CSS pixels.
- Web Audio-backed `Sound`, `Music`, and `SoundStore` compatibility.
- Keyboard, mouse, pointer, and Gamepad API input support.
- Resource preloading and browser-cache helpers for Java-style resource references.
- Java numeric, random-number, binary-read, bitmap-text, and sprite-drawing helpers used by parity-sensitive ports.
- Exact Java `Random` state capture and restoration.
- Browser lifecycle support for same-page container recreation and WebGL context loss/restoration.

## Installation

The repository is not published to npm. For experimentation, install directly from GitHub:

```sh
npm install git+https://github.com/meatfighter/slick2d-ts.git#main
```

Production game repositories should pin an **exact qualified commit**, not a moving branch. For example:

```text
https://codeload.github.com/meatfighter/slick2d-ts/tar.gz/<40-character-commit-sha>
```

The package and lockfile should agree on the same immutable revision.

## Minimal example

```ts
import { AppGameContainer, BasicGame, Color, type GameContainer, type Graphics } from "slick2d-ts";

class DemoGame extends BasicGame {
    public constructor() {
        super("Demo");
    }

    public init(_container: GameContainer): void {}

    public update(_container: GameContainer, _delta: number): void {}

    public render(container: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, container.getWidth(), container.getHeight());
    }
}

const app = new AppGameContainer(new DemoGame(), 640, 480, false);
await app.start();
```

If `Display.setParent(...)` is not used, the container creates a canvas and appends it to `document.body`.

For a fixed-resolution game that should scale as one scene, wrap it with `BufferedScalableGame`:

```ts
import { BufferedScalableGame, BufferedScalingMode } from "slick2d-ts";

const game = new BufferedScalableGame(new DemoGame(), 640, 480, {
    maintainAspect: true,
    scalingMode: BufferedScalingMode.Integer
});
```

## Resource preloading

Browser APIs are asynchronous in places where Java Slick2D APIs were synchronous. Image, audio, XML, atlas, and binary resources should therefore be preloaded before synchronous game code consumes them.

Resource and audio batches accept an `AbortSignal`, a concurrency limit, and progress reporting. Batch work settles before rejection so a host can safely present Retry without leaving an earlier load attempt running underneath it.

```ts
import { ResourceLoader, SoundStore } from "slick2d-ts";

const controller = new AbortController();
await Promise.all([
    ResourceLoader.preloadResources(imageAndDataRefs, {
        signal: controller.signal,
        concurrency: 8,
        onProgress: ({ loaded, total }) => updateProgress(loaded, total)
    }),
    SoundStore.get().preloadAudioBuffers(audioRefs, {
        signal: controller.signal,
        concurrency: 3
    })
]);
```

`ResourceLoadException` exposes structured failure information such as failure kind, phase, HTTP status, resource reference, and URL.

## Deterministic Java random state

`JavaRandom.getState()`, `setState(...)`, and `JavaRandom.fromState(...)` preserve the internal 48-bit Java LCG state exactly. The saved state is deliberately different from the public Java constructor seed: restoring it must not apply Java's seed scrambling a second time.

## Browser boundaries

Fullscreen, audio unlock, canvas sizing, context loss, and resource loading follow browser security and lifecycle rules. Host applications should unlock audio from a user gesture when reliable first-play sound matters.

See [`COMPATIBILITY.md`](COMPATIBILITY.md) for intentional compatibility no-ops and browser-specific boundaries.

## Development

Install dependencies from the lockfile:

```sh
npm ci
```

Run the normal source/build verification gate:

```sh
npm run verify
```

Run the real-browser suite separately:

```sh
npm run verify:browser
```

Useful focused commands include:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run check:dist
```

Use `npm run format` to apply the repository's Prettier rules.

## Compatibility philosophy

The goal is behavioral compatibility for the Java games that depend on this project. Java-shaped APIs and seemingly unusual semantics should not be “cleaned up” merely for style when they encode observable Slick2D/LWJGL behavior.

Engine changes should be qualified in both `slick2d-ts` and the downstream games that exercise the affected feature. Rendering, input, timing, audio, lifecycle, and persistence-related changes are behavioral dependencies, not ordinary package bumps.

## License

`slick2d-ts` is licensed under the **BSD 3-Clause License**. See [`LICENSE`](LICENSE).

Upstream Slick2D attribution is included in [`NOTICE.md`](NOTICE.md).
