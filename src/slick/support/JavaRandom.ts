const MULTIPLIER = 0x5DEECE66Dn;
const ADDEND = 0xBn;
const MASK = (1n << 48n) - 1n;

/**
 * Java counterpart: java.util.Random subset.
 *
 * Exact 48-bit LCG for deterministic seeded ports.
 */
export class JavaRandom {
    private seed = 0n;

    public constructor();
    public constructor(seed: number | bigint);
    /** Java counterpart: Random constructors. */
    public constructor(seed?: number | bigint) {
        this.setSeed(seed ?? JavaRandom.defaultSeed());
    }

    /** Java counterpart: Random.setSeed(long). */
    public setSeed(seed: number | bigint): void {
        this.seed = (BigInt(seed) ^ MULTIPLIER) & MASK;
    }

    public nextInt(): number;
    public nextInt(bound: number): number;
    /** Java counterpart: Random.nextInt() and Random.nextInt(int). */
    public nextInt(bound?: number): number {
        if (bound === undefined) {
            return this.next(32) | 0;
        }
        if (bound <= 0) {
            throw new Error("bound must be positive");
        }
        if ((bound & -bound) === bound) {
            return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
        }
        while (true) {
            const bits = this.next(31);
            const value = bits % bound;
            if (((bits - value + (bound - 1)) | 0) >= 0) {
                return value;
            }
        }
    }

    /** Java counterpart: Random.nextFloat(). */
    public nextFloat(): number {
        return this.next(24) / (1 << 24);
    }

    /** Java counterpart: Random.nextBoolean(). */
    public nextBoolean(): boolean {
        return this.next(1) !== 0;
    }

    private next(bits: number): number {
        this.seed = (this.seed * MULTIPLIER + ADDEND) & MASK;
        return Number(this.seed >> (48n - BigInt(bits)));
    }

    private static defaultSeed(): bigint {
        const clock = BigInt(Date.now());
        const perf = typeof performance !== "undefined" ? BigInt(Math.floor(performance.now() * 1000)) : 0n;
        return (clock << 16n) ^ perf;
    }
}
