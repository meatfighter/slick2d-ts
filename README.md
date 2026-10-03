# Slick2D-ts

A TypeScript/WebGL2 compatibility layer for bringing Java games built on selected [Slick2D](https://github.com/nguillaumin/slick2d-maven) and [LWJGL](https://www.lwjgl.org/) APIs to browsers. It supports the maintained game ports; it is not a complete Slick2D implementation or a desktop runtime.

See [COMPATIBILITY.md](COMPATIBILITY.md) for supported APIs, browser extensions, intentional no-ops, and differences from Java. Integration examples are available in [Ms. Pac-Man](https://github.com/meatfighter/ms-pac-man-2010-js), [Stickvania](https://github.com/meatfighter/stickvania-js), and [Jackal](https://github.com/meatfighter/jackal-js).

## Using the library

The package is not published to npm. Install an immutable archive of a qualified engine commit, replacing the placeholder with its full SHA:

```sh
npm install "https://codeload.github.com/meatfighter/slick2d-ts/tar.gz/<commit-sha>"
```

Keep `package.json` and `package-lock.json` on the same revision. The archive includes committed `dist/` output, so consumers do not need to compile the engine. Use an ES-module/bundler-capable browser application with WebGL2.

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

Run after the document body exists. Without `Display.setParent(...)`, the container creates a canvas in `document.body`. Use `BufferedScalableGame` for a fixed-resolution scene rendered to a native-size framebuffer and scaled as a whole.

Preload resources before synchronous gameplay consumes them: `ResourceLoader.preloadResources(...)` for images/data and `SoundStore.get().preloadAudioBuffers(...)` for audio. Coordinate cancellation and settlement across parallel preload batches before offering Retry. Request audio unlock from a user gesture and respect browser fullscreen/lifecycle restrictions. See [COMPATIBILITY.md](COMPATIBILITY.md) and [ResourceLoader.ts](src/slick/util/ResourceLoader.ts) for contracts and options.

## Development

Use Node.js 24 and Git. A JDK is not required for this library.

```sh
npm ci
npm run build
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

| Path                                      | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `src/index.ts`                            | Public exports                                      |
| `src/slick/`, `src/lwjgl/`                | Compatibility APIs and browser implementation       |
| `src/slick/rendering/`, `src/slick/util/` | Rendering and resource utilities                    |
| `test/`, `test/browser/`, `scripts/`      | Behavioral checks, browser fixtures, and tooling    |
| `dist/`                                   | Committed JavaScript, declarations, and source maps |

| Task                      | Command                                                 |
| ------------------------- | ------------------------------------------------------- |
| Format / lint / typecheck | `npm run format` / `npm run lint` / `npm run typecheck` |
| Build distribution        | `npm run build`                                         |
| Behavioral tests          | `npm test`                                              |
| Check committed output    | `npm run check:dist`                                    |
| Full local qualification  | `npm run qualify`                                       |

`build` and `test` regenerate `dist/`. After source changes, review and commit source and generated output together before qualification. `check:dist` requires a clean committed distribution; merely staging output is insufficient. Do not edit generated files by hand.

Browser verification needs Chrome or Chromium. Set `CHROMIUM_PATH` when discovery fails; Linux can use a display or Xvfb, or `CHROMIUM_HEADLESS=1`. See [scripts/run-browser-tests.mjs](scripts/run-browser-tests.mjs).

## Maintenance and releases

Preserve Java/Slick2D numeric semantics, random state, timing, event ordering, and resource ownership. Document browser-only extensions in [COMPATIBILITY.md](COMPATIBILITY.md), and avoid allocations or repeated work in hot paths.

Qualify consuming games before advancing their engine pins; engine tests alone do not establish game compatibility. Documentation-only engine changes do not require repinning consumers.

See [RELEASING.md](RELEASING.md) for generated-output qualification, archives, and immutable consumer pins. The source uses the [BSD 3-Clause License](LICENSE); upstream attribution is in [NOTICE.md](NOTICE.md).
