import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type XmlSprite = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * Java Slick2D counterpart: org.newdawn.slick.XMLPackedSheet.
 *
 * XML sprite atlas parser backed by a single Slick image.
 */
export class XMLPackedSheet {
    private readonly image: Image;
    private readonly sprites = new Map<string, XmlSprite>();

    /**
     * Java Slick2D counterpart: XMLPackedSheet(String imageRef, String xmlRef).
     *
     * Loads the image with nearest filtering and parses `<sprite>` elements.
     */
    public constructor(imageRef: string, xmlRef: string) {
        this.image = new Image(imageRef, false, Image.FILTER_NEAREST);
        const bytes = ResourceLoader.getResourceAsStream(xmlRef);
        if (!bytes) {
            throw new SlickException(`Unable to load XML packed sheet: ${xmlRef}`);
        }
        const text = new TextDecoder().decode(bytes);
        const parser = new DOMParser();
        const document = parser.parseFromString(text, "application/xml");
        for (const sprite of Array.from(document.getElementsByTagName("sprite"))) {
            const name = sprite.getAttribute("name");
            if (!name) {
                continue;
            }
            this.sprites.set(name, {
                x: Number.parseInt(sprite.getAttribute("x") ?? "0", 10),
                y: Number.parseInt(sprite.getAttribute("y") ?? "0", 10),
                width: Number.parseInt(sprite.getAttribute("width") ?? "0", 10),
                height: Number.parseInt(sprite.getAttribute("height") ?? "0", 10)
            });
        }
    }

    /** Java Slick2D counterpart: XMLPackedSheet.getSprite(String). */
    public getSprite(name: string): Image | null {
        const sprite = this.sprites.get(name);
        return sprite ? this.image.getSubImage(sprite.x, sprite.y, sprite.width, sprite.height) : null;
    }
}
