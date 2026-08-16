import { SlickException } from "../SlickException.js";
/**
 * Java counterpart: DataInputStream subset over in-memory bytes.
 *
 * Reads big-endian primitive values from already-loaded resources.
 */
export class BinaryReader {
    bytes;
    offset = 0;
    closed = false;
    /** Java counterpart: DataInputStream(InputStream). */
    constructor(data) {
        this.bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    }
    /** Java counterpart: InputStream.read(). */
    read() {
        this.throwIfClosed();
        if (this.offset >= this.bytes.length) {
            return -1;
        }
        return this.bytes[this.offset++];
    }
    /** Java counterpart: DataInputStream.readFully(byte[]). */
    readFully(target) {
        this.throwIfClosed();
        if (this.offset + target.length > this.bytes.length) {
            throw new SlickException("EOF while reading binary data");
        }
        target.set(this.bytes.subarray(this.offset, this.offset + target.length));
        this.offset += target.length;
    }
    /** Java counterpart: DataInputStream.readShort(). */
    readShort() {
        const value = this.readUnsignedShort();
        return value & 0x8000 ? value - 0x10000 : value;
    }
    /** Java counterpart: DataInputStream.readUnsignedShort(). */
    readUnsignedShort() {
        const a = this.readRequired();
        const b = this.readRequired();
        return (a << 8) | b;
    }
    /** Java counterpart: DataInputStream.readInt(). */
    readInt() {
        const a = this.readRequired();
        const b = this.readRequired();
        const c = this.readRequired();
        const d = this.readRequired();
        return (a << 24) | (b << 16) | (c << 8) | d | 0;
    }
    /** Java counterpart: DataInputStream.readLong(). */
    readLong() {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
            value = (value << 8n) | BigInt(this.readRequired());
        }
        return value & (1n << 63n) ? value - (1n << 64n) : value;
    }
    /** Java counterpart: DataInputStream.skipBytes(int). */
    skipBytes(count) {
        this.throwIfClosed();
        const skipped = Math.max(0, Math.min(count, this.bytes.length - this.offset));
        this.offset += skipped;
        return skipped;
    }
    /** Java counterpart: InputStream.available(). */
    available() {
        this.throwIfClosed();
        return this.bytes.length - this.offset;
    }
    /** Java counterpart: InputStream.close(). */
    close() {
        this.closed = true;
    }
    readRequired() {
        const value = this.read();
        if (value < 0) {
            throw new SlickException("EOF while reading binary data");
        }
        return value;
    }
    throwIfClosed() {
        if (this.closed) {
            throw new SlickException("BinaryReader is closed");
        }
    }
}
//# sourceMappingURL=BinaryReader.js.map