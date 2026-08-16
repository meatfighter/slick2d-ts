import { Input } from "../Input.js";
/**
 * Java counterpart: project button-mapping value objects.
 *
 * Public mutable fields are preserved for direct porting.
 */
export class ButtonMapping {
    keyUp = Input.KEY_UP;
    keyDown = Input.KEY_DOWN;
    keyLeft = Input.KEY_LEFT;
    keyRight = Input.KEY_RIGHT;
    keyGrenade = Input.KEY_X;
    keyGun = Input.KEY_Z;
    gunKeyMapped = false;
    controller = false;
    controllerIndex = 0;
    controllerGrenade = 0;
    controllerGun = 1;
    /** Java counterpart: ButtonMapping(). */
    constructor() { }
}
//# sourceMappingURL=ButtonMapping.js.map