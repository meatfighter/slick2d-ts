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
    nextInt(): number;
    nextInt(bound: number): number;
    /** Java counterpart: Random.nextFloat(). */
    nextFloat(): number;
    /** Java counterpart: Random.nextBoolean(). */
    nextBoolean(): boolean;
    private next;
    private static defaultSeed;
}
//# sourceMappingURL=JavaRandom.d.ts.map