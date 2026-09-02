/** Runs a batch with a bounded number of in-flight asynchronous operations. */
export async function runSettledBatch(items, concurrency, operation) {
    const workerCount = normalizeBatchConcurrency(concurrency, items.length);
    const results = new Array(items.length);
    let nextIndex = 0;
    const worker = async () => {
        while (true) {
            const index = nextIndex++;
            if (index >= items.length) {
                return;
            }
            try {
                await operation(items[index], index);
                results[index] = { status: "fulfilled", value: undefined };
            }
            catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    };
    const workers = new Array(workerCount);
    for (let i = 0; i < workerCount; i++) {
        workers[i] = worker();
    }
    await Promise.all(workers);
    return results;
}
function normalizeBatchConcurrency(concurrency, itemCount) {
    if (concurrency !== undefined && (!Number.isSafeInteger(concurrency) || concurrency <= 0)) {
        throw new RangeError("Batch preload concurrency must be a positive safe integer.");
    }
    if (itemCount === 0) {
        return 0;
    }
    return concurrency === undefined ? itemCount : Math.min(concurrency, itemCount);
}
//# sourceMappingURL=BatchLoader.js.map