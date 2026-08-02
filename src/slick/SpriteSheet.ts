import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.SpriteSheet.
 *
 * Fixed-size tile view over a backing image.
 */
export class SpriteSheet {
    private static inUse: SpriteSheet | null = null;

    private readonly image: Image;
    private readonly tileWidth: number;
    private readonly tileHeight: number;
    private readonly spacing: number;
    private readonly margin: number;

    public constructor(ref: string, tw: number, th: number);
    public constructor(ref: string, tw: number, th: number, spacing: number);
    public constructor(ref: string, tw: number, th: number, spacing: number, margin: number);
    public constructor(image: Image, tw: number, th: number);
    public constructor(image: Image, tw: number, th: number, spacing: number);
    public constructor(image: Image, tw: number, th: number, spacing: number, margin: number);
    /** Java Slick2D counterpart: SpriteSheet constructors. */
    public constructor(refOrImage: string | Image, tw: number, th: number, spacing: number = 0, margin: number = 0) {
        this.image = typeof refOrImage === "string" ? new Image(refOrImage) : refOrImage;
        this.tileWidth = tw;
        this.tileHeight = th;
        this.spacing = spacing;
        this.margin = margin;
    }

    /** Java Slick2D counterpart: SpriteSheet.getSubImage(int, int). */
    public getSubImage(x: number, y: number): Image {
        const px = this.margin + x * (this.tileWidth + this.spacing);
        const py = this.margin + y * (this.tileHeight + this.spacing);
        return this.image.getSubImage(px, py, this.tileWidth, this.tileHeight);
    }

    /** Java Slick2D counterpart: SpriteSheet.getSprite(int, int). */
    public getSprite(x: number, y: number): Image {
        return this.getSubImage(x, y);
    }

    /** Java Slick2D counterpart: SpriteSheet.getHorizontalCount(). */
    public getHorizontalCount(): number {
        return Math.max(0, Math.floor((this.image.getWidth() - this.margin * 2 + this.spacing) / (this.tileWidth + this.spacing)));
    }

    /** Java Slick2D counterpart: SpriteSheet.getVerticalCount(). */
    public getVerticalCount(): number {
        return Math.max(0, Math.floor((this.image.getHeight() - this.margin * 2 + this.spacing) / (this.tileHeight + this.spacing)));
    }

    /** Java Slick2D counterpart: SpriteSheet.startUse(). */
    public startUse(): void {
        this.image.startUse();
        SpriteSheet.inUse = this;
    }

    /** Java Slick2D counterpart: SpriteSheet.renderInUse(int, int, int, int). */
    public renderInUse(x: number, y: number, sx: number, sy: number): void {
        if (SpriteSheet.inUse !== this) {
            throw new SlickException("SpriteSheet.renderInUse called outside startUse/endUse");
        }
        this.getSprite(sx, sy).draw(x, y);
    }

    /** Java Slick2D counterpart: SpriteSheet.endUse(). */
    public endUse(): void {
        this.image.endUse();
        if (SpriteSheet.inUse === this) {
            SpriteSheet.inUse = null;
        }
    }
}
