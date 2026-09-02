/** Runs a batch with a bounded number of in-flight asynchronous operations. */
export declare function runSettledBatch<T>(items: readonly T[], concurrency: number | undefined, operation: (item: T, index: number) => Promise<void>): Promise<PromiseSettledResult<void>[]>;
//# sourceMappingURL=BatchLoader.d.ts.map