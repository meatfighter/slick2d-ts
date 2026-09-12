# Slick2D-ts

A TypeScript/WebGL2 compatibility layer for bringing Java games built on selected [Slick2D](https://github.com/nguillaumin/slick2d-maven) and [LWJGL](https://www.lwjgl.org/) APIs to browsers. It supports the behavior required by the maintained game ports; it is not a complete Slick2D implementation or a desktop runtime.

See [COMPATIBILITY.md](COMPATIBILITY.md) for supported browser extensions, intentional no-ops, and differences from Java APIs. Integration examples are available in [Ms. Pac-Man](https://github.com/meatfighter/ms-pac-man-2010-js), [Stickvania](https://github.com/meatfighter/stickvania-js), and [Jackal](https://github.com/meatfighter/jackal-js).

The game about pages also reference [JInput](https://jinput.github.io/jinput/), the controller library used by their Java implementations.

## Repository layout

| Path                   | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `src/index.ts`         | Public package exports                                         |
| `src/slick/`           | Slick-style lifecycle, graphics, images, input, and audio APIs |
| `src/slick/rendering/` | WebGL rendering implementation                                 |
| `src/slick/util/`      | Resource loading and Java-port utilities                       |
| `src/lwjgl/`           | Selected LWJGL-style compatibility APIs                        |
| `dist/`                | Committed JavaScript, TypeScript declarations, and source maps |
| `test/`                | Node-based behavioral and regression tests                     |
| `test/browser/`        | Real-browser integration fixtures                              |
| `scripts/`             | Build checks, browser-test runner, and release archiving       |

## Using the library

The package is not published to npm. Install an immutable archive of a qualified engine commit, replacing the placeholder with its full 40-character SHA:

```sh
npm install "https://codeload.github.com/meatfighter/slick2d-ts/tar.gz/<commit-sha>"
```

Keep `package.json` and `package-lock.json` on the same revision. The archive contains the committed `dist/` files; consumers do not need to compile the engine. Use a browser application with ES-module/bundler support and WebGL2.

A minimal game in a browser module:

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

Run after the document body exists. Without `Display.setParent(...)`, the container creates a canvas in `document.body`. Use `BufferedScalableGame` when a fixed-resolution scene should be rendered to a native-size framebuffer and scaled as a whole; its modes are described in [COMPATIBILITY.md](COMPATIBILITY.md).

Browser resource loading is asynchronous. Preload image/data resources with `ResourceLoader.preloadResources(...)` and audio with `SoundStore.get().preloadAudioBuffers(...)` before synchronous gameplay consumes them. Use cancellation, bounded concurrency, and progress callbacks as needed. Individual resource requests have a finite default deadline; see [ResourceLoader.ts](src/slick/util/ResourceLoader.ts) for load options and structured failure details.

Each preload batch settles its own started work before rejecting. If a host starts several batches together, it must also coordinate cancellation and settlement across those batches before allowing Retry. See the shared-request cancellation rules in [COMPATIBILITY.md](COMPATIBILITY.md). Request audio unlock from a user gesture and follow browser fullscreen and lifecycle restrictions.

## Local development

Use Node.js 24 and Git. JDK tools are not required to build this TypeScript library.

Run commands from the repository root:

```sh
npm ci
npm run build
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

| Task                                | Command                                   | Behavior                                                                    |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Build distribution                  | `npm run build`                           | Cleans and regenerates `dist/` from TypeScript                              |
| Check formatting / apply formatting | `npm run format:check` / `npm run format` | Repository Prettier rules                                                   |
| Lint / check types                  | `npm run lint` / `npm run typecheck`      | Source checks                                                               |
| Run behavioral tests                | `npm test`                                | Rebuilds `dist/`, then runs `test/*.mjs`                                    |
| Check committed distribution        | `npm run check:dist`                      | Requires no staged, unstaged, or untracked changes under `dist/`            |
| Run complete source verification    | `npm run verify`                          | Formatting, lint, types, behavioral tests, and committed-distribution check |
| Run browser verification            | `npm run verify:browser`                  | Rebuilds and runs the real Chromium suite                                   |
| Qualify local commit                | `npm run qualify`                         | Full local pre-push verification, including browser tests                   |

For browser tests, install Chrome or Chromium and set `CHROMIUM_PATH` when it is not found in the runner's Linux locations. For example, in PowerShell, adjust this path to your installation:

```powershell
$env:CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run verify:browser
```

The runner uses headless mode on Windows and macOS. On Linux it can use an existing display or Xvfb; `CHROMIUM_HEADLESS=1` selects headless mode. Browser coverage lives in [test/browser/](test/browser/) and [scripts/run-browser-tests.mjs](scripts/run-browser-tests.mjs). Run `npm run qualify` before pushing release-affecting changes; GitHub Actions is an optional manual Linux check.

## Maintaining the engine

- Preserve observable Java/Slick2D behavior, including numeric semantics, random state, timing, event ordering, and resource ownership. Java-shaped APIs should not be rewritten solely for style.
- Keep browser-only extensions and compatibility limitations documented in [COMPATIBILITY.md](COMPATIBILITY.md). Prefer explicit supported APIs over requiring consumers to use reflection or reach into internals.
- Avoid unnecessary allocations and repeated work in rendering, input polling, and other frequently executed paths. Add focused regression coverage for changed behavior.
- Build after source changes, review the generated `dist/` diff, and commit source and distribution together. Do not edit generated files directly. The `check:dist` step intentionally fails until changed distribution files are committed; staging them is not sufficient.
- Run the full source verification on the resulting commit and run real-browser checks for browser-facing changes. Validate affected features in the consuming games before advancing their engine pins; engine tests alone do not establish game compatibility.

## Releases and attribution

See [RELEASING.md](RELEASING.md) for the generated-`dist`, exact-commit qualification, archive, consumer-pin, and tagging procedure. Archiving requires a clean checkout and Node.js, Git, and tar.

The source is licensed under the [BSD 3-Clause License](LICENSE). Upstream Slick2D attribution is in [NOTICE.md](NOTICE.md).
