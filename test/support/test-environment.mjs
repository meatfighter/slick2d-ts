import { afterEach } from "node:test";
import { AppGameContainer, Display, SoundStore } from "../../dist/index.js";

// Older parity tests construct an AppGameContainer manually and register it only
// through Display. Production start() publishes the shared resource owner before
// doing that. Mirror that ownership step in tests without weakening production
// ownership fencing or teaching Display about AppGameContainer internals.
const originalSetActiveContainer = Display.setActiveContainer.bind(Display);
Display.setActiveContainer = (container) => {
    if (container instanceof AppGameContainer) {
        if (AppGameContainer.resourceOwner === null) {
            AppGameContainer.resourceOwner = container;
        }
    } else if (container === null) {
        // Test files use setActiveContainer(null) as their shared-state reset.
        AppGameContainer.resourceOwner = null;
    }
    originalSetActiveContainer(container);
};

// Explicit PWA-generation mode is page-lifetime production state, but individual
// Node tests must not inherit it from an earlier test in the same process. Reset
// only the mode/capability flags here; each test remains responsible for retiring
// its own physical resources through the normal APIs.
afterEach(() => {
    const store = SoundStore.get();
    store.explicitPlaybackGenerationMode = false;
    store.playbackCommitted = false;
    store.logicalPlaybackActive = false;
    store.interruptionHandler = null;
});
