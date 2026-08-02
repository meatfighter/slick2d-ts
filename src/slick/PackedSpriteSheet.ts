import { Color } from "./Color.js";
import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { SpriteSheet } from "./SpriteSheet.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type PackedSection = {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    tilesx: number;
    tilesy: number;
};

function dirname(ref: string): string {
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
    private readonly fullImage: Image;
    private readonly sections = new Map<string, PackedSection>();

    public constructor(def: string);
    public constructor(def: string, trans: Color);
    public constructor(def: string, filter: number);
    public constructor(def: string, filter: number, trans: Color);
    /** Java Slick2D counterpart: PackedSpriteSheet constructors. */
    public constructor(def: string, filterOrTrans: number | Color = Image.FILTER_NEAREST, trans?: Color) {
        const filter = typeof filterOrTrans === "number" ? filterOrTrans : Image.FILTER_NEAREST;
        const transparent = filterOrTrans instanceof Color ? filterOrTrans : trans;
        const textBytes = ResourceLoader.getResourceAsStream(def);
        if (!textBytes) {
            throw new SlickException(`Unable to load packed sheet definition: ${def}`);
        }
        const lines = new TextDecoder().decode(textBytes).split(/\r?\n/g);
        const imageRef = `${dirname(def)}${(lines.shift() ?? "").trim()}`;
        this.fullImage = transparent
            ? new Image(imageRef, false, filter, transparent)
            : new Image(imageRef, false, filter);
        this.parse(lines);
    }

    /** Java Slick2D counterpart: PackedSpriteSheet.getFullImage(). */
    public getFullImage(): Image {
        return this.fullImage;
    }

    /** Java Slick2D counterpart: PackedSpriteSheet.getSprite(String). */
    public getSprite(name: string): Image {
        const section = this.sections.get(name);
        if (!section) {
            throw new Error(`Unknown sprite from packed sheet: ${name}`);
        }
        return this.fullImage.getSubImage(section.x, section.y, section.width, section.height);
    }

    /** Java Slick2D counterpart: PackedSpriteSheet.getSpriteSheet(String). */
    public getSpriteSheet(name: string): SpriteSheet {
        const section = this.sections.get(name);
        if (!section) {
            throw new Error(`Unknown sprite from packed sheet: ${name}`);
        }
        const tileWidth = section.width / section.tilesx;
        const tileHeight = section.height / section.tilesy;
        return new SpriteSheet(this.getSprite(name), tileWidth, tileHeight);
    }

    private parse(lines: string[]): void {
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
            const section: PackedSection = {
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
            if (section.name.length === 0
                || !Number.isFinite(section.x)
                || !Number.isFinite(section.y)
                || !Number.isFinite(section.width)
                || !Number.isFinite(section.height)
                || !Number.isFinite(section.tilesx)
                || !Number.isFinite(section.tilesy)) {
                throw new SlickException("Failed to process definitions file - invalid format?");
            }
            this.sections.set(section.name, section);
        }
    }
}
