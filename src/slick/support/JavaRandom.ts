const MULTIPLIER = 0x5deece66dn;
const MASK = (1n << 48n) - 1n;
const MULTIPLIER_0 = 0xe66d;
const MULTIPLIER_1 = 0xdeec;
const MULTIPLIER_2 = 0x0005;
const ADDEND = 0x000b;
const LIMB = 0x10000;
const LIMB_MASK = 0xffff;
const FLOAT_DIVISOR = 0x1000000;
const SEED_UNIQUIFIER_MULTIPLIER = 181783497276652981n;
let seedUniquifier = 8682522807148012n;

/** Exact internal 48-bit state of java.util.Random, stored as three unsigned 16-bit limbs. */
export interface JavaRandomState {
    readonly seed0: number;
    readonly seed1: number;
    readonly seed2: number;
}

/**
 * Java counterpart: java.util.Random subset.
 *
 * Exact 48-bit LCG for deterministic seeded ports.
 */
export class JavaRandom {
    private seed0 = 0;
    private seed1 = 0;
    private seed2 = 0;

    public constructor();
    public constructor(seed: number | bigint);
    /** Java counterpart: Random constructors. */
    public constructor(seed?: number | bigint) {
        this.setSeed(seed ?? JavaRandom.defaultSeed());
    }

    /** Java counterpart: Random.setSeed(long). */
    public setSeed(seed: number | bigint): void {
        const scrambled = (BigInt(seed) ^ MULTIPLIER) & MASK;
        this.seed0 = Number(scrambled & 0xffffn);
        this.seed1 = Number((scrambled >> 16n) & 0xffffn);
        this.seed2 = Number((scrambled >> 32n) & 0xffffn);
    }

    /** Captures the internal state without applying Java's external-seed scrambling. */
    public getState(): JavaRandomState {
        return {
            seed0: this.seed0,
            seed1: this.seed1,
            seed2: this.seed2
        };
    }

    /** Restores the internal state without applying Java's external-seed scrambling. */
    public setState(state: JavaRandomState): void {
        this.seed0 = JavaRandom.validateStateLimb(state.seed0, "seed0");
        this.seed1 = JavaRandom.validateStateLimb(state.seed1, "seed1");
        this.seed2 = JavaRandom.validateStateLimb(state.seed2, "seed2");
    }

    /** Creates a generator at an exact previously captured internal state. */
    public static fromState(state: JavaRandomState): JavaRandom {
        const random = new JavaRandom(0);
        random.setState(state);
        return random;
    }

    public nextInt(): number;
    public nextInt(bound: number): number;
    /** Java counterpart: Random.nextInt() and Random.nextInt(int). */
    public nextInt(bound?: number): number {
        if (bound === undefined) {
            return this.next(32) | 0;
        }
        const n = bound | 0;
        if (n <= 0) {
            throw new Error("bound must be positive");
        }
        const bits = this.next(31);
        if ((n & -n) === n) {
            const power = 31 - Math.clz32(n);
            return bits >>> (31 - power);
        }
        let retryBits = bits;
        let value = retryBits % n;
        while (((retryBits - value + (n - 1)) | 0) < 0) {
            retryBits = this.next(31);
            value = retryBits % n;
        }
        return value;
    }

    /** Java counterpart: Random.nextFloat(). */
    public nextFloat(): number {
        return this.next(24) / FLOAT_DIVISOR;
    }

    /** Java counterpart: Random.nextBoolean(). */
    public nextBoolean(): boolean {
        return this.next(1) !== 0;
    }

    private next(bits: number): number {
        const product0 = this.seed0 * MULTIPLIER_0 + ADDEND;
        const product1 = Math.floor(product0 / LIMB) + this.seed0 * MULTIPLIER_1 + this.seed1 * MULTIPLIER_0;
        const product2 = Math.floor(product1 / LIMB) + this.seed0 * MULTIPLIER_2 + this.seed1 * MULTIPLIER_1 + this.seed2 * MULTIPLIER_0;
        this.seed0 = product0 & LIMB_MASK;
        this.seed1 = product1 & LIMB_MASK;
        this.seed2 = product2 & LIMB_MASK;

        switch (bits) {
            case 32:
                return this.seed2 * LIMB + this.seed1;
            case 31:
                return this.seed2 * 0x8000 + (this.seed1 >>> 1);
            case 24:
                return (this.seed2 << 8) | (this.seed1 >>> 8);
            case 1:
                return this.seed2 >>> 15;
            default:
                if (bits <= 16) {
                    return this.seed2 >>> (16 - bits);
                }
                return Math.floor((this.seed2 * LIMB + this.seed1) / 2 ** (32 - bits));
        }
    }

    private static defaultSeed(): bigint {
        seedUniquifier = BigInt.asUintN(64, seedUniquifier * SEED_UNIQUIFIER_MULTIPLIER);
        const wallClock = BigInt(Date.now()) << 20n;
        const monotonic = typeof performance !== "undefined" ? BigInt(Math.trunc(performance.now() * 1_000_000)) : 0n;
        return BigInt.asIntN(64, seedUniquifier ^ wallClock ^ monotonic);
    }

    private static validateStateLimb(value: unknown, name: keyof JavaRandomState): number {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > LIMB_MASK) {
            throw new RangeError(`Invalid JavaRandom ${name}: ${String(value)}`);
        }
        return value;
    }
}
