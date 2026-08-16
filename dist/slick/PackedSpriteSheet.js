import { Color } from "./Color.js";
import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { SpriteSheet } from "./SpriteSheet.js";
import { ResourceLoader } from "./util/ResourceLoader.js";
function dirname(ref) {
    const normalized = ref.replace(/\\/g, "/");
    const slash = normalized.lastIndexOf("/");
    return slash >= 0 ? normalized.substring(0, slash + 1) : "";
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.PackedSpriteSheet.
 *
 * Parser for Slick2D `.def` atlas files.
 */
export class PackedSpriteSheet {
    fullImage;
    sections = new Map();
    /** Java Slick2D counterpart: PackedSpriteSheet constructors. */
    constructor(def, filterOrTrans = Image.FILTER_NEAREST, trans) {
        const filter = typeof filterOrTrans === "number" ? filterOrTrans : Image.FILTER_NEAREST;
        const transparent = filterOrTrans instanceof Color ? filterOrTrans : trans;
        const textBytes = ResourceLoader.getResourceAsStream(def);
        if (!textBytes) {
            throw new SlickException(`Unable to load packed sheet definition: ${def}`);
        }
        const lines = new TextDecoder().decode(textBytes).split(/\r?\n/g);
        const imageRef = `${dirname(def)}${(lines.shift() ?? "").trim()}`;
        this.fullImage = transparent ? new Image(imageRef, false, filter, transparent) : new Image(imageRef, false, filter);
        this.parse(lines);
    }
    /** Java Slick2D counterpart: PackedSpriteSheet.getFullImage(). */
    getFullImage() {
        return this.fullImage;
    }
    /** Java Slick2D counterpart: PackedSpriteSheet.getSprite(String). */
    getSprite(name) {
        const section = this.sections.get(name);
        if (!section) {
            throw new Error(`Unknown sprite from packed sheet: ${name}`);
        }
        return this.fullImage.getSubImage(section.x, section.y, section.width, section.height);
    }
    /** Java Slick2D counterpart: PackedSpriteSheet.getSpriteSheet(String). */
    getSpriteSheet(name) {
        const section = this.sections.get(name);
        if (!section) {
            throw new Error(`Unknown sprite from packed sheet: ${name}`);
        }
        const tileWidth = section.width / section.tilesx;
        const tileHeight = section.height / section.tilesy;
        return new SpriteSheet(this.getSprite(name), tileWidth, tileHeight);
    }
    parse(lines) {
        for (let i = 0; i < lines.length;) {
            while (i < lines.length && lines[i].trim() === "") {
                i++;
            }
            if (i >= lines.length) {
                break;
            }
            i++;
            if (i + 8 >= lines.length) {
                throw new SlickException("Failed to process definitions file - invalid format?");
            }
            const section = {
                name: lines[i++].trim(),
                x: Number.parseInt(lines[i++].trim(), 10),
                y: Number.parseInt(lines[i++].trim(), 10),
                width: Number.parseInt(lines[i++].trim(), 10),
                height: Number.parseInt(lines[i++].trim(), 10),
                tilesx: Math.max(1, Number.parseInt(lines[i++].trim(), 10)),
                tilesy: Math.max(1, Number.parseInt(lines[i++].trim(), 10))
            };
            i += 2;
            i++;
            if (section.name.length === 0 ||
                !Number.isFinite(section.x) ||
                !Number.isFinite(section.y) ||
                !Number.isFinite(section.width) ||
                !Number.isFinite(section.height) ||
                !Number.isFinite(section.tilesx) ||
                !Number.isFinite(section.tilesy)) {
                throw new SlickException("Failed to process definitions file - invalid format?");
            }
            this.sections.set(section.name, section);
        }
    }
}
//# sourceMappingURL=PackedSpriteSheet.js.map