/**
 * Java counterpart: DataInputStream subset over in-memory bytes.
 *
 * Reads big-endian primitive values from already-loaded resources.
 */
export declare class BinaryReader {
    private readonly bytes;
    private offset;
    private closed;
    /** Java counterpart: DataInputStream(InputStream). */
    constructor(data: ArrayBuffer | Uint8Array);
    /** Java counterpart: InputStream.read(). */
    read(): number;
    /** Java counterpart: DataInputStream.readFully(byte[]). */
    readFully(target: Uint8Array): void;
    /** Java counterpart: DataInputStream.readShort(). */
    readShort(): number;
    /** Java counterpart: DataInputStream.readUnsignedShort(). */
    readUnsignedShort(): number;
    /** Java counterpart: DataInputStream.readInt(). */
    readInt(): number;
    /** Java counterpart: DataInputStream.readLong(). */
    readLong(): bigint;
    /** Java counterpart: DataInputStream.skipBytes(int). */
    skipBytes(count: number): number;
    /** Java counterpart: InputStream.available(). */
    available(): number;
    /** Java counterpart: InputStream.close(). */
    close(): void;
    private readRequired;
    private throwIfClosed;
}
//# sourceMappingURL=BinaryReader.d.ts.map