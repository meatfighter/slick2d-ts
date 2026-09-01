import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { Color } from "./Color.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.SpriteSheet.
 *
 * Fixed-size tile view over a backing image.
 */
export class SpriteSheet extends Image {
    static sheetInUse = null;
    target;
    tileWidth;
    tileHeight;
    spacing;
    margin;
    subImages = null;
    /** Java Slick2D counterpart: SpriteSheet constructors. */
    constructor(refOrImage, tw, th, spacingOrColor = 0, marginOrSpacing = 0) {
        const refTarget = typeof refOrImage === "string"
            ? spacingOrColor instanceof Color
                ? new Image(refOrImage, false, Image.FILTER_NEAREST, spacingOrColor)
                : new Image(refOrImage, false, Image.FILTER_NEAREST)
            : refOrImage;
        super(refTarget);
        this.target = typeof refOrImage === "string" ? this : refTarget;
        this.tileWidth = tw;
        this.tileHeight = th;
        this.spacing = spacingOrColor instanceof Color ? marginOrSpacing : spacingOrColor;
        this.margin = spacingOrColor instanceof Color ? 0 : marginOrSpacing;
    }
    getSubImage(x, y, width, height) {
        if (width !== undefined && height !== undefined) {
            return super.getSubImage(x, y, width, height);
        }
        this.initTiles();
        const subImages = this.requireTiles();
        const column = subImages[x];
        const image = column?.[y];
        if (!image) {
            throw new Error(`SubImage out of sheet bounds: ${x},${y}`);
        }
        return image;
    }
    createSprite(x, y) {
        const px = this.margin + x * (this.tileWidth + this.spacing);
        const py = this.margin + y * (this.tileHeight + this.spacing);
        return this.target.getSubImage(px, py, this.tileWidth, this.tileHeight);
    }
    /** Java Slick2D counterpart: SpriteSheet.getSprite(int, int). */
    getSprite(x, y) {
        this.initTiles();
        const subImages = this.requireTiles();
        const column = subImages[x];
        if (!column || y < 0 || y >= column.length) {
            throw new Error(`SubImage out of sheet bounds: ${x},${y}`);
        }
        return this.createSprite(x, y);
    }
    /** Java Slick2D counterpart: SpriteSheet.getHorizontalCount(). */
    getHorizontalCount() {
        this.initTiles();
        return this.subImages?.length ?? 0;
    }
    /** Java Slick2D counterpart: SpriteSheet.getVerticalCount(). */
    getVerticalCount() {
        this.initTiles();
        return this.subImages?.[0]?.length ?? 0;
    }
    /** Java Slick2D counterpart: SpriteSheet.startUse(). */
    startUse() {
        if (this.target === this) {
            super.startUse();
        }
        else {
            this.target.startUse();
        }
        SpriteSheet.sheetInUse = this;
    }
    /** Java Slick2D counterpart: SpriteSheet.renderInUse(int, int, int, int). */
    renderInUse(x, y, sx, sy) {
        if (SpriteSheet.sheetInUse !== this) {
            throw new SlickException("SpriteSheet.renderInUse called outside startUse/endUse");
        }
        this.getSubImage(sx, sy).drawEmbedded(x, y, this.tileWidth, this.tileHeight);
    }
    /** Java Slick2D counterpart: SpriteSheet.endUse(). */
    endUse() {
        if (this.target === this) {
            super.endUse();
        }
        else {
            this.target.endUse();
        }
        if (SpriteSheet.sheetInUse === this) {
            SpriteSheet.sheetInUse = null;
        }
    }
    /** Java Slick2D counterpart: SpriteSheet.setTexture(Texture). */
    setTexture(texture) {
        this.subImages = null;
        if (this.target === this) {
            super.setTexture(texture);
            return;
        }
        this.target.setTexture(texture);
    }
    initTiles() {
        if (this.subImages !== null) {
            return;
        }
        const denominatorX = this.tileWidth + this.spacing;
        const denominatorY = this.tileHeight + this.spacing;
        if (denominatorX <= 0 || denominatorY <= 0 || this.target.getWidth() <= 0 || this.target.getHeight() <= 0) {
            return;
        }
        const tilesAcross = Math.max(0, Math.trunc((this.target.getWidth() - this.margin * 2 - this.tileWidth) / denominatorX) + 1);
        let tilesDown = Math.max(0, Math.trunc((this.target.getHeight() - this.margin * 2 - this.tileHeight) / denominatorY) + 1);
        if ((this.target.getHeight() - this.tileHeight) % denominatorY !== 0) {
            tilesDown++;
        }
        this.subImages = Array.from({ length: tilesAcross }, (_unused, x) => Array.from({ length: tilesDown }, (_unused2, y) => this.createSprite(x, y)));
    }
    requireTiles() {
        const tiles = this.subImages;
        if (!tiles || tiles.length === 0 || !tiles[0] || tiles[0].length === 0) {
            throw new SlickException("SpriteSheet image is not loaded or does not contain any tiles");
        }
        return tiles;
    }
}
//# sourceMappingURL=SpriteSheet.js.map