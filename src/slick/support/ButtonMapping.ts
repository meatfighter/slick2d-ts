import { Input } from "../Input.js";

/**
 * Java counterpart: project button-mapping value objects.
 *
 * Public mutable fields are preserved for direct porting.
 */
export class ButtonMapping {
    public keyUp = Input.KEY_UP;
    public keyDown = Input.KEY_DOWN;
    public keyLeft = Input.KEY_LEFT;
    public keyRight = Input.KEY_RIGHT;
    public keyGrenade = Input.KEY_X;
    public keyGun = Input.KEY_Z;
    public gunKeyMapped = false;
    public controller = false;
    public controllerIndex = 0;
    public controllerGrenade = 0;
    public controllerGun = 1;

    /** Java counterpart: ButtonMapping(). */
    public constructor() {}
}
