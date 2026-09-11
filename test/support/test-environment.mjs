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
