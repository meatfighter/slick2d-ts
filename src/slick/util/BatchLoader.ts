/** Runs a batch with a bounded number of in-flight asynchronous operations. */
export async function runSettledBatch<T>(
    items: readonly T[],
    concurrency: number | undefined,
    operation: (item: T, index: number) => Promise<void>
): Promise<PromiseSettledResult<void>[]> {
    const workerCount = normalizeBatchConcurrency(concurrency, items.length);
    const results = new Array<PromiseSettledResult<void>>(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
        while (true) {
            const index = nextIndex++;
            if (index >= items.length) {
                return;
            }
            try {
                await operation(items[index]!, index);
                results[index] = { status: "fulfilled", value: undefined };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    };

    const workers = new Array<Promise<void>>(workerCount);
    for (let i = 0; i < workerCount; i++) {
        workers[i] = worker();
    }
    await Promise.all(workers);
    return results;
}

function normalizeBatchConcurrency(concurrency: number | undefined, itemCount: number): number {
    if (concurrency !== undefined && (!Number.isSafeInteger(concurrency) || concurrency <= 0)) {
        throw new RangeError("Batch preload concurrency must be a positive safe integer.");
    }
    if (itemCount === 0) {
        return 0;
    }
    return concurrency === undefined ? itemCount : Math.min(concurrency, itemCount);
}
