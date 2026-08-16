import { Image } from "./Image.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.XMLPackedSheet.
 *
 * XML sprite atlas parser backed by a single Slick image.
 */
export declare class XMLPackedSheet {
    private readonly image;
    private readonly sprites;
    /**
     * Java Slick2D counterpart: XMLPackedSheet(String imageRef, String xmlRef).
     *
     * Loads the image with nearest filtering and parses `<sprite>` elements.
     */
    constructor(imageRef: string, xmlRef: string);
    /** Java Slick2D counterpart: XMLPackedSheet.getSprite(String). */
    getSprite(name: string): Image | null;
}
//# sourceMappingURL=XMLPackedSheet.d.ts.map