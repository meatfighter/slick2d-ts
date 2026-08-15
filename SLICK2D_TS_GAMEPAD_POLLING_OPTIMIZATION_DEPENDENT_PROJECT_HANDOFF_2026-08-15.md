# Slick2D-ts Gamepad Polling Optimization Handoff

Date: 2026-08-15

Engine project changed: `C:\js-projects\slick2d-ts`

## Summary

`slick2d-ts` now reduces browser gamepad polling and small hot-path allocations inside `Input`.

There are no new public gamepad APIs and no Stickvania-specific behavior. Existing Slick-style methods keep their public shape:

- `Input.poll(...)`
- `Input.isButtonPressed(...)`
- `Input.isButtonDown(...)`
- `Input.getControllerCount()`
- `Input.getAxisCount(...)`
- `Input.getAxisValue(...)`
- `Input.isControllerUp/Down/Left/Right(...)`
- controller listener callbacks

## What Changed

- `Input.poll(...)` refreshes a cached browser Gamepad snapshot once for the active controller poll frame.
- Controller helper methods reuse that cached snapshot after `poll(...)`, so one logical input frame does not repeatedly call `navigator.getGamepads()`.
- If a helper is called before the first `poll(...)`, it lazily refreshes the snapshot once so pre-loop/menu callers still work.
- A later `poll(...)` refreshes the snapshot and sees newly connected, disconnected, or changed controllers.
- Controller listener edge dispatch no longer allocates fresh arrow callbacks for every directional/button control on every poll.
- POV-hat direction checks no longer use `Array.some(...)`; they now use a simple indexed loop.

## Preserved Behavior

- D-pad buttons `12..15` still behave as Slick direction controls and do not emit duplicate generic button listener edges.
- Non-D-pad button listener indexes remain one-based.
- `isButtonPressed(index, controller)` remains the zero-based physical button polling API.
- `isControlPressed(control, controller)` remains the one-shot Slick control API.
- `Input.ANY_CONTROLLER` still scans connected controllers.
- Specific controller indexes still read from the corresponding browser gamepad slot.
- Disconnect cleanup still clears stale held controller state before reconnect.
- Keyboard and mouse behavior is unchanged.

## Notes For Dependent PWAs

No code changes are required just to benefit from this optimization after updating the `slick2d-ts` dependency.

Stickvania-style input code can continue to call several Slick helpers during one logical sample, for example directions, mapped buttons, and axis checks. After the app's normal `Input.poll(...)` call, those helpers now share the same browser gamepad snapshot for that frame.

Do not add a separate gamepad polling layer in the dependent project unless it is needed for game-specific remapping UI. `slick2d-ts` remains the owner of the browser Gamepad API bridge for Slick controller methods.

## Suggested Dependent Validation

After consuming this engine update, retest:

- keyboard movement;
- left stick directions;
- D-pad directions;
- POV-hat style direction pads if available;
- mapped jump/attack buttons;
- title/menu selection from gamepad buttons;
- `ANY_CONTROLLER` menu behavior if the project uses it;
- controller disconnect/reconnect while a direction or button is held.

Recommended project commands, if available:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build:pwa
```

## Engine Validation Performed

The `slick2d-ts` tests cover:

- `navigator.getGamepads()` is called once for one active `Input.poll(...)` plus several helper calls;
- helper calls before the first poll lazily refresh once;
- a later poll refreshes the frame snapshot;
- `Input.ANY_CONTROLLER` and specific controller helpers share the cached snapshot;
- controller disconnect clears stale held state before reconnect;
- existing POV-hat, direction, button, and listener edge behavior remains covered.

