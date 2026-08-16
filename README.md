# slick2d-ts

`slick2d-ts` is a TypeScript/WebGL compatibility layer for porting Java Slick2D and LWJGL-style games to modern browsers.

The goal is API and behavior parity for Java game ports that already depend on Slick2D shapes such as `Game`, `BasicGame`, `AppGameContainer`, `Graphics`, `Image`, `Input`, `Sound`, `Music`, sprite sheets, and a small set of LWJGL/OpenGL/OpenAL shims. It is not a complete desktop Slick2D runtime or a general-purpose game engine.

## Features

- Slick-style container lifecycle with browser `requestAnimationFrame` timing.
- WebGL2 rendering backend with logical CSS-pixel coordinates and high-DPI backing stores.
- Web Audio-backed `Sound`, `Music`, and `SoundStore` compatibility.
- Keyboard, mouse, touch-style pointer, and browser Gamepad API input mapping.
- Java parity helpers for numeric behavior, random numbers, binary reads, bitmap text, songs, and sprite drawing.
- Browser resource preload/cache helpers that preserve Java resource reference strings.

## Install

```sh
npm install slick2d-ts
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

## Browser Boundaries

Java Slick2D APIs are synchronous in places where browsers are not. Image, audio, XML, atlas, and binary assets should be preloaded through `ResourceLoader` before code paths that synchronously parse or consume those bytes.

Fullscreen, audio unlock, and canvas sizing follow browser security and lifecycle rules. Host pages should call audio unlock helpers from a user gesture when reliable first-play audio matters.

## Documentation

The detailed compatibility contract lives in [docs/SLICK2D-PARITY-API.md](docs/SLICK2D-PARITY-API.md).

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

GPL-3.0-only. See [LICENSE](LICENSE).
