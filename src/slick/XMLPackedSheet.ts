import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

function parseRequiredInt(element: Element, name: string): number {
    const value = element.getAttribute(name);
    if (value === null || value.length === 0) {
        throw new Error(`Missing sprite attribute: ${name}`);
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid sprite attribute: ${name}`);
    }
    return parsed;
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.XMLPackedSheet.
 *
 * XML sprite atlas parser backed by a single Slick image.
 */
export class XMLPackedSheet {
    private readonly image: Image;
    private readonly sprites = new Map<string, Image>();

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
        try {
            const text = new TextDecoder().decode(bytes);
            const parser = new DOMParser();
            const document = parser.parseFromString(text, "application/xml");
            if (document.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Malformed XML");
            }
            for (const sprite of Array.from(document.getElementsByTagName("sprite"))) {
                const name = sprite.getAttribute("name");
                if (name === null) {
                    throw new Error("Missing sprite attribute: name");
                }
                const x = parseRequiredInt(sprite, "x");
                const y = parseRequiredInt(sprite, "y");
                const width = parseRequiredInt(sprite, "width");
                const height = parseRequiredInt(sprite, "height");
                this.sprites.set(name, this.image.getSubImage(x, y, width, height));
            }
        } catch (error) {
            throw new SlickException("Failed to parse sprite sheet XML", error);
        }
    }

    /** Java Slick2D counterpart: XMLPackedSheet.getSprite(String). */
    public getSprite(name: string): Image | null {
        return this.sprites.get(name) ?? null;
    }
}
