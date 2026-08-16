import { SlickException } from "../SlickException.js";

/**
 * Java counterpart: DataInputStream subset over in-memory bytes.
 *
 * Reads big-endian primitive values from already-loaded resources.
 */
export class BinaryReader {
    private readonly bytes: Uint8Array;
    private offset = 0;
    private closed = false;

    /** Java counterpart: DataInputStream(InputStream). */
    public constructor(data: ArrayBuffer | Uint8Array) {
        this.bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    }

    /** Java counterpart: InputStream.read(). */
    public read(): number {
        this.throwIfClosed();
        if (this.offset >= this.bytes.length) {
            return -1;
        }
        return this.bytes[this.offset++];
    }

    /** Java counterpart: DataInputStream.readFully(byte[]). */
    public readFully(target: Uint8Array): void {
        this.throwIfClosed();
        if (this.offset + target.length > this.bytes.length) {
            throw new SlickException("EOF while reading binary data");
        }
        target.set(this.bytes.subarray(this.offset, this.offset + target.length));
        this.offset += target.length;
    }

    /** Java counterpart: DataInputStream.readShort(). */
    public readShort(): number {
        const value = this.readUnsignedShort();
        return value & 0x8000 ? value - 0x10000 : value;
    }

    /** Java counterpart: DataInputStream.readUnsignedShort(). */
    public readUnsignedShort(): number {
        const a = this.readRequired();
        const b = this.readRequired();
        return (a << 8) | b;
    }

    /** Java counterpart: DataInputStream.readInt(). */
    public readInt(): number {
        const a = this.readRequired();
        const b = this.readRequired();
        const c = this.readRequired();
        const d = this.readRequired();
        return (a << 24) | (b << 16) | (c << 8) | d | 0;
    }

    /** Java counterpart: DataInputStream.readLong(). */
    public readLong(): bigint {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
            value = (value << 8n) | BigInt(this.readRequired());
        }
        return value & (1n << 63n) ? value - (1n << 64n) : value;
    }

    /** Java counterpart: DataInputStream.skipBytes(int). */
    public skipBytes(count: number): number {
        this.throwIfClosed();
        const skipped = Math.max(0, Math.min(count, this.bytes.length - this.offset));
        this.offset += skipped;
        return skipped;
    }

    /** Java counterpart: InputStream.available(). */
    public available(): number {
        this.throwIfClosed();
        return this.bytes.length - this.offset;
    }

    /** Java counterpart: InputStream.close(). */
    public close(): void {
        this.closed = true;
    }

    private readRequired(): number {
        const value = this.read();
        if (value < 0) {
            throw new SlickException("EOF while reading binary data");
        }
        return value;
    }

    private throwIfClosed(): void {
        if (this.closed) {
            throw new SlickException("BinaryReader is closed");
        }
    }
}
