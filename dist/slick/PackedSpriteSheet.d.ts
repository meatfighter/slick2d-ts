import { Color } from "./Color.js";
import { Image } from "./Image.js";
import { SpriteSheet } from "./SpriteSheet.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.PackedSpriteSheet.
 *
 * Parser for Slick2D `.def` atlas files.
 */
export declare class PackedSpriteSheet {
    private readonly fullImage;
    private readonly sections;
    constructor(def: string);
    constructor(def: string, trans: Color);
    constructor(def: string, filter: number);
    constructor(def: string, filter: number, trans: Color);
    /** Java Slick2D counterpart: PackedSpriteSheet.getFullImage(). */
    getFullImage(): Image;
    /** Java Slick2D counterpart: PackedSpriteSheet.getSprite(String). */
    getSprite(name: string): Image;
    /** Java Slick2D counterpart: PackedSpriteSheet.getSpriteSheet(String). */
    getSpriteSheet(name: string): SpriteSheet;
    private parse;
}
//# sourceMappingURL=PackedSpriteSheet.d.ts.map