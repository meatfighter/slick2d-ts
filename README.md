# slick2d-ts

`slick2d-ts` is a TypeScript/WebGL browser port of [Slick2D](https://github.com/joshmarcus/slick2d), built for porting Java Slick2D and LWJGL-style games to modern browsers.

The goal is API and behavior parity for Java game ports that already depend on Slick2D shapes such as `Game`, `BasicGame`, `AppGameContainer`, `Graphics`, `Image`, `Input`, `Sound`, `Music`, sprite sheets, and a small set of LWJGL/OpenGL/OpenAL shims. It is not a full Slick2D port, a complete desktop runtime, or a general-purpose game engine.

## Features

- Slick-style container lifecycle with browser `requestAnimationFrame` timing.
- WebGL2 rendering backend with logical CSS-pixel coordinates and high-DPI backing stores.
- Optional native-resolution buffered scaling with crisp, smooth, and pixel-perfect presentation modes.
- Web Audio-backed `Sound`, `Music`, and `SoundStore` compatibility.
- Keyboard, mouse, touch-style pointer, and browser Gamepad API input mapping.
- Java parity helpers for numeric behavior, random numbers, binary reads, bitmap text, songs, and sprite drawing.
- Browser resource preload/cache helpers with abortable batches, structured failures, and Java resource reference strings.
- Exact Java `Random` state capture/restoration for save states, replays, and deterministic tests.
- Optional calibrated secondary gamepad axes that feed Slick controller-direction queries once per input poll.

## Install

```sh
npm install git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.4.0
```

## Example

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

For browser pages that need stable whole-scene scaling, wrap a fixed-resolution game with `BufferedScalableGame`:

```ts
import { BufferedScalableGame, BufferedScalingMode } from "slick2d-ts";

const game = new BufferedScalableGame(new DemoGame(), 640, 480, {
    maintainAspect: true,
    scalingMode: BufferedScalingMode.Integer
});
```

## Browser Preloading

Resource and audio batches accept an optional `AbortSignal`. Batch promises settle all work started by that batch before rejecting, so a host application can present a Retry action without leaving an earlier loading attempt running underneath it.

```ts
import { ResourceLoader, SoundStore } from "slick2d-ts";

const controller = new AbortController();
await Promise.all([
    ResourceLoader.preloadResources(imageAndDataRefs, {
        signal: controller.signal,
        onProgress: ({ loaded, total }) => updateProgress(loaded, total)
    }),
    SoundStore.get().preloadAudioBuffers(audioRefs, {
        signal: controller.signal
    })
]);
```

Failures from resource fetches and browser decoding use `ResourceLoadException`, whose `kind`, `phase`, `status`, `ref`, and `url` fields let the host distinguish network, HTTP, abort, and decode failures without parsing error messages.

## Deterministic Java Random State

`JavaRandom.getState()`, `setState(...)`, and `JavaRandom.fromState(...)` preserve the internal 48-bit Java LCG state exactly. The state is intentionally distinct from the public Java constructor seed: restoring it does not apply Java's seed scrambling a second time.

## Browser Boundaries

Java Slick2D APIs are synchronous in places where browsers are not. Image, audio, XML, atlas, and binary assets should be preloaded through `ResourceLoader` before code paths that synchronously parse or consume those bytes.

Fullscreen, audio unlock, and canvas sizing follow browser security and lifecycle rules. Host pages should call audio unlock helpers from a user gesture when reliable first-play audio matters.

See [COMPATIBILITY.md](COMPATIBILITY.md) for known browser boundaries and intentional compatibility no-ops.

## Development

```sh
npm install
npm run format:check
npm run lint
npm run typecheck
npm test
```

Use `npm run format` to apply the project Prettier style.

## License

BSD-3-Clause. See [LICENSE](LICENSE). Slick2D upstream attribution is included
in [NOTICE.md](NOTICE.md).
