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
export declare class JavaRandom {
    private seed0;
    private seed1;
    private seed2;
    constructor();
    constructor(seed: number | bigint);
    /** Java counterpart: Random.setSeed(long). */
    setSeed(seed: number | bigint): void;
    /** Captures the internal state without applying Java's external-seed scrambling. */
    getState(): JavaRandomState;
    /** Restores the internal state without applying Java's external-seed scrambling. */
    setState(state: JavaRandomState): void;
    /** Creates a generator at an exact previously captured internal state. */
    static fromState(state: JavaRandomState): JavaRandom;
    nextInt(): number;
    nextInt(bound: number): number;
    /** Java counterpart: Random.nextFloat(). */
    nextFloat(): number;
    /** Java counterpart: Random.nextBoolean(). */
    nextBoolean(): boolean;
    private next;
    private static defaultSeed;
    private static validateStateLimb;
}
//# sourceMappingURL=JavaRandom.d.ts.map