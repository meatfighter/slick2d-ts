import { afterEach } from "node:test";
import { AppGameContainer, Display } from "../../dist/index.js";

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

// Older ordinary-audio fixtures expose only AudioContext. PWA-generation preload
// now correctly requires a decode-only OfflineAudioContext. Alias the fixture's
// current AudioContext constructor by default while keeping the property
// configurable so tests can explicitly remove/replace it to exercise unavailable
// offline decoding.
function installOfflineAudioContextAlias() {
    Object.defineProperty(globalThis, "OfflineAudioContext", {
        configurable: true,
        get() {
            return globalThis.AudioContext;
        }
    });
}

installOfflineAudioContextAlias();
afterEach(installOfflineAudioContextAlias);
