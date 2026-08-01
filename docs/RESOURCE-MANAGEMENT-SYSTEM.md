# Build a Modern TypeScript Resource Management System

Build a framework-independent resource management library for a modern browser application. The library must fetch resources concurrently, classify them by resource type, decode them into useful runtime objects, cache shared results, prevent duplicate requests, and release resources when consumers no longer need them.

The design should separate **resource acquisition**, **resource interpretation**, **resource ownership**, and **application initialization**. This separation lets application code declare what it needs without knowing how networking, caching, parsing, deduplication, or cleanup work internally.

## Purpose

Web applications often depend on many external resources:

* JSON configuration
* Text files
* HTML templates
* Images
* Audio
* XML
* Binary data
* WebAssembly modules
* Application-specific document formats

Loading these resources independently throughout application code causes several recurring problems:

* The same URL may be fetched more than once.
* Callers may not know whether a resource has finished loading.
* Loading one resource at a time creates unnecessary serialization.
* Parsing and error handling become duplicated.
* Components may accidentally release resources still used elsewhere.
* Network and decoding details leak into business logic.
* Application initialization becomes a collection of loosely coordinated promises.

The resource system should solve these problems through one coherent abstraction.

## Design principles

### Keep the manager independent of resource formats

The central manager must not know how to parse JSON, decode audio, create an `ImageBitmap`, or compile a template. It should manage only:

* Cache entries
* In-flight requests
* Promise sharing
* Reference counts
* Resource states
* Cancellation
* Disposal
* Loading scopes

Resource-type handlers should contain all format-specific behavior. Passing decoding and parsing behavior into a generic loading pipeline allows text, XML, audio, images, and other formats to share the same cache and concurrency infrastructure. 

### Start requests immediately and synchronize later

Acquiring a resource should begin loading it immediately. Multiple acquisitions made during the same initialization phase should therefore run concurrently.

Do not write loading flows like this:

```ts
const config = await loadConfig();
const template = await loadTemplate();
const image = await loadImage();
```

That loads the resources serially.

Use this model instead:

```ts
const config = scope.acquire(jsonHandler, configUrl);
const template = scope.acquire(textHandler, templateUrl);
const image = scope.acquire(imageHandler, imageUrl);

await scope.ready();
```

All three operations begin before the synchronization point.

### Cache in-flight work as well as completed values

The cache must contain an entry as soon as loading starts, not only after loading completes.

This allows a second caller requesting the same resource to find the existing entry and share its promise. The cache therefore serves two purposes:

* A registry of requests currently in progress
* A cache of completed resource values

Insert the loading entry before starting the asynchronous pipeline. Otherwise, two callers arriving close together could both see a cache miss and issue duplicate requests.

### Separate loading from initialization

Application features should follow a two-phase lifecycle:

```text
Declare dependencies
Start all loads
Wait for the dependency barrier
Initialize objects from loaded values
Use the feature
Release the dependencies
```

The initialization phase may assume that every declared resource has loaded successfully. This avoids spreading `await` calls and partially initialized state throughout application code.

The expected lifecycle is:

```ts
feature.load(scope);
await scope.ready();
feature.initialize();
```

This follows the useful pattern of scheduling client resource loads, waiting for all shared asynchronous work, and only then initializing the client. 

### Track ownership explicitly

Two features may share the same resource. Releasing it from one feature must not invalidate it for the other.

Each cache entry should therefore track its active reference count. Acquiring an existing entry increments the count. Releasing a handle decrements it. The resource becomes eligible for disposal only when no active owners remain.

Reference counting prevents both duplicate loading and premature unloading. 

## Public architecture

Implement the following main abstractions:

```text
ResourceHandler
ResourceManager
ResourceScope
ResourceHandle
ResourceEntry
```

### `ResourceHandler`

A handler defines how one category of resource moves from an external representation into a usable runtime value.

```ts
export type MaybePromise<T> = T | Promise<T>;

export interface ResourceContext {
  readonly signal: AbortSignal;
  readonly manager: ResourceManager;
}

export interface ResourceHandler<Input, Decoded, Value> {
  /**
   * Stable identifier for this category of resource.
   * Examples: "text", "json", "image-bitmap", "audio-buffer".
   */
  readonly kind: string;

  /**
   * Produces a deterministic key for the input.
   * Include every option that changes the resulting value.
   */
  cacheKey(input: Input): string;

  /**
   * Obtains the external representation.
   */
  fetch(
    input: Input,
    context: ResourceContext,
  ): Promise<Response>;

  /**
   * Decodes the transport response.
   * Examples: Response -> string, Blob, or ArrayBuffer.
   */
  decode(
    response: Response,
    context: ResourceContext,
  ): Promise<Decoded>;

  /**
   * Converts decoded data into the final cached value.
   */
  parse(
    decoded: Decoded,
    context: ResourceContext,
  ): MaybePromise<Value>;

  /**
   * Releases resources requiring explicit cleanup.
   */
  dispose?(
    value: Value,
    context: ResourceContext,
  ): MaybePromise<void>;
}
```

Keep the `fetch`, `decode`, and `parse` stages separate because each stage has a different responsibility:

```text
Fetch: obtain the transport response
Decode: extract bytes, text, or another transport-level representation
Parse: construct the application-level value
```

For example:

```text
JSON:
Response → string or unknown JSON → validated object

Image:
Response → Blob → ImageBitmap

Audio:
Response → ArrayBuffer → AudioBuffer

XML:
Response → string → XML Document
```

### Cache keys

Do not use a URL alone as the complete cache key.

The same URL might be interpreted by more than one handler. For example, one caller might request raw text while another requests parsed JSON.

Construct the final key using both the handler category and its canonical input key:

```ts
function makeResourceKey<Input, Decoded, Value>(
  handler: ResourceHandler<Input, Decoded, Value>,
  input: Input,
): string {
  return `${handler.kind}:${handler.cacheKey(input)}`;
}
```

The handler’s `cacheKey()` must include any option that changes the output:

* URL
* Locale
* Version
* Requested image dimensions
* Parsing mode
* Authentication scope where appropriate
* Transform options

Equivalent requests must produce the same key. Requests capable of producing different values must not collide.

## Cache-entry model

Represent cache state explicitly.

```ts
export type ResourceStatus =
  | "loading"
  | "ready"
  | "failed"
  | "disposing";

export interface ResourceEntry<T> {
  readonly key: string;
  readonly handlerKind: string;
  readonly controller: AbortController;
  readonly promise: Promise<T>;

  references: number;
  status: ResourceStatus;

  value?: T;
  error?: unknown;

  lastAccessedAt: number;
}
```

Do not represent a loading resource merely as an entry whose value happens to be `null`. Explicit state prevents ambiguity between:

* A resource still loading
* A successfully loaded `null` value
* A failed load
* A disposed resource

The entry must retain the shared promise. Every caller requesting the same key while it loads must receive a handle backed by that promise.

## `ResourceHandle<T>`

Return a typed ownership handle from every acquisition.

```ts
export interface ResourceHandle<T> {
  readonly key: string;

  /**
   * Resolves to the shared cached value.
   */
  readonly ready: Promise<T>;

  /**
   * Returns the value synchronously after loading.
   * Throw a clear error when called too early.
   */
  get(): T;

  /**
   * Releases this consumer's ownership.
   * Calling it more than once must have no additional effect.
   */
  release(): Promise<void>;
}
```

A handle provides several advantages:

* It preserves the resource’s TypeScript type.
* It associates access with ownership.
* It avoids asking callers to repeat string keys during release.
* It makes release idempotent.
* It exposes both asynchronous and post-barrier synchronous access.

Do not rely on `FinalizationRegistry` for correctness. Resource release must remain explicit and deterministic.

## `ResourceScope`

A scope represents the resources owned by one page, route, scene, dialog, editor session, or application feature.

```ts
export interface ResourceScope {
  acquire<Input, Decoded, Value>(
    handler: ResourceHandler<Input, Decoded, Value>,
    input: Input,
  ): ResourceHandle<Value>;

  /**
   * Waits for every resource acquired by this scope.
   */
  ready(): Promise<void>;

  /**
   * Releases every handle owned by this scope.
   */
  dispose(): Promise<void>;
}
```

A scope should move through a defined lifecycle:

```text
open → waiting → ready → disposed
             ↘ failed
```

Calling `ready()` should seal the scope. Reject subsequent `acquire()` calls unless dynamic acquisition has explicitly been enabled.

Sealing provides deterministic barrier semantics. Without it, a resource added while `ready()` runs might or might not become part of the current wait.

Example:

```ts
const scope = resourceManager.createScope();

const settings = scope.acquire(
  jsonHandler,
  new URL("/settings.json", location.href),
);

const template = scope.acquire(
  textHandler,
  new URL("/templates/main.html", location.href),
);

const logo = scope.acquire(
  imageHandler,
  new URL("/images/logo.png", location.href),
);

// All requests are already in progress.
await scope.ready();

renderPage({
  settings: settings.get(),
  template: template.get(),
  logo: logo.get(),
});

// Later:
await scope.dispose();
```

Use scopes instead of one global array of outstanding promises. A global barrier can accidentally wait for unrelated work or miss work added at an unexpected time. Scopes tie loading and ownership to a meaningful application lifecycle.

## `ResourceManager`

The manager owns all shared entries.

Its core API should resemble:

```ts
export class ResourceManager {
  createScope(): ResourceScope;

  has(key: string): boolean;
  isReady(key: string): boolean;
  peek<T>(key: string): T | undefined;

  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

Keep acquisition and release internals private. Consumers should normally access them only through scopes and handles.

Do not implement the manager as a global singleton. Let the application create and inject a manager. This makes testing, isolated application instances, server-side rendering, and controlled cleanup easier.

## Acquisition algorithm

Implement `acquire()` with the following behavior.

### Existing entry

When the final key already exists:

1. Increment its reference count.
2. Update its last-access time.
3. Return a typed handle backed by the existing promise.
4. Do not issue another fetch.
5. Do not rerun decoding or parsing.

This applies whether the entry is loading or ready.

### Missing entry

When the key does not exist:

1. Create an `AbortController`.
2. Create a cache entry in the `loading` state.
3. Create the shared loading promise.
4. Store the entry in the map immediately.
5. Begin the handler pipeline.
6. Validate the HTTP response.
7. Decode the response.
8. Parse the decoded representation.
9. Store the final value.
10. Mark the entry as ready.
11. Resolve every handle waiting on the same promise.

The pipeline should resemble:

```ts
const promise = handler
  .fetch(input, context)
  .then((response) => {
    if (!response.ok) {
      throw new ResourceHttpError({
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
    }

    return handler.decode(response, context);
  })
  .then((decoded) => handler.parse(decoded, context))
  .then((value) => {
    if (entries.get(key) !== entry) {
      throw new ResourceInvalidatedError(key);
    }

    entry.value = value;
    entry.status = "ready";
    return value;
  })
  .catch((error: unknown) => {
    entry.error = error;
    entry.status = "failed";

    if (entries.get(key) === entry) {
      entries.delete(key);
    }

    throw error;
  });
```

The identity check prevents an invalidated or replaced request from completing later and overwriting a newer entry.

## Parallel loading

Distinct resources must load concurrently by default.

The scope should record each unique handle promise and implement its barrier with `Promise.all()`:

```ts
await Promise.all(resourcePromises);
```

`Promise.all()` provides fail-fast initialization: one required resource failure rejects the scope’s `ready()` operation.

Still retain the individual errors on their entries so diagnostics can identify which resources failed.

An optional concurrency limiter may be added for applications that could schedule hundreds of large requests. Keep it separate from resource handlers and cache logic. The default scheduler should permit normal browser parallelism.

## Release and disposal

A handle’s `release()` operation must be idempotent.

On the first release:

1. Mark the handle released.
2. Decrement the entry’s reference count.
3. Leave the entry untouched when references remain.
4. When the count reaches zero:

   * Abort the request if the entry is still loading.
   * Invoke the handler’s disposer if the entry is ready.
   * Remove the entry from the manager.
   * Ensure disposal runs no more than once.

Example logic:

```ts
async function releaseEntry<T>(
  entry: ResourceEntry<T>,
  handler: ResourceHandler<unknown, unknown, T>,
): Promise<void> {
  entry.references -= 1;

  if (entry.references > 0) {
    return;
  }

  if (entry.status === "loading") {
    entry.controller.abort();
  }

  if (entry.status === "ready" && entry.value !== undefined) {
    entry.status = "disposing";
    await handler.dispose?.(entry.value, {
      signal: entry.controller.signal,
      manager: resourceManager,
    });
  }

  entries.delete(entry.key);
}
```

Ordinary strings and plain objects usually require no explicit disposal. Other values may require it:

* `ImageBitmap.close()`
* WebGL texture deletion
* Worker termination
* Object URL revocation
* Audio-node disconnection
* Subscription cleanup
* Indexed database connection closure

A resource’s operations should stop before its backing resource is disposed.

## Zero-reference cache policy

Use immediate disposal at zero references as the safe default.

Optionally support a configurable warm-cache policy:

```ts
export interface ResourceCachePolicy {
  readonly retainAfterReleaseMs?: number;
  readonly maxEntries?: number;
  readonly maxEstimatedBytes?: number;
}
```

Active references must always prevent eviction. Once references reach zero, a policy may retain a value temporarily to support rapid route revisits.

Keep this policy separate from ownership. A zero-reference resource may remain cached, but it has no active consumers and may be evicted safely.

## Failure behavior

Implement clear and deterministic failure rules.

### HTTP failures

`fetch()` does not reject for ordinary HTTP error responses. Explicitly check `response.ok`.

Create structured error types containing:

* Resource key
* URL
* Handler kind
* HTTP status
* Original cause

### Parsing failures

A parser or decoder failure must reject every handle sharing that entry.

Remove failed entries by default so a later acquisition can retry. Negative caching may be added as an explicit policy, not accidental behavior.

### Cancellation

When the final owner releases a still-loading entry:

* Abort its controller.
* Reject waiting handles with an identifiable cancellation error.
* Remove the entry.
* Do not treat expected cancellation as an application failure in logs.

Releasing one of several owners must not abort the shared request.

### Scope failure

When `scope.ready()` rejects:

* Preserve the original loading error.
* Keep the scope disposable.
* Ensure `scope.dispose()` releases every acquired handle.
* Do not stop cleanup because one release operation fails.

Use `Promise.allSettled()` during scope disposal so all resources receive a cleanup attempt.

## Resource dependencies

Allow handlers or higher-level loaders to depend on other resources.

For example, a compiled shader might depend on two text resources:

```ts
const vertex = scope.acquire(textHandler, vertexShaderUrl);
const fragment = scope.acquire(textHandler, fragmentShaderUrl);

await Promise.all([vertex.ready, fragment.ready]);

const program = compileProgram(vertex.get(), fragment.get());
```

A derived-resource handler may also acquire its dependencies through a child scope. Ensure child-scope ownership remains attached to the derived resource and releases when that derived value is disposed.

This allows the same system to build:

* A template from HTML and localization data
* A sprite atlas from an image and metadata
* A search index from multiple documents
* A WebGL program from shader sources
* A view model from several endpoint responses

## Required handlers

Provide the following built-in handlers.

### Text

```text
Response → string → string
```

Use `response.text()` and return the result unchanged.

### JSON

```text
Response → unknown JSON → validated typed value
```

Do not rely on TypeScript types as runtime validation. Accept a validator or schema as part of the handler input.

### XML

```text
Response → string → XMLDocument
```

Use `DOMParser` and detect parser errors rather than assuming parsing succeeded.

### Binary

```text
Response → ArrayBuffer → ArrayBuffer
```

Use this as the base for application-specific binary handlers.

### Image bitmap

```text
Response → Blob → ImageBitmap
```

Dispose with `ImageBitmap.close()`.

### Audio buffer

```text
Response → ArrayBuffer → AudioBuffer
```

Accept an `AudioContext` or decoding service through dependency injection rather than creating hidden global audio state.

## Memory cache versus persistent cache

Treat the resource manager as an in-memory cache of **decoded, application-ready values**.

Do not combine this responsibility directly with:

* Browser HTTP caching
* Service Worker `CacheStorage`
* IndexedDB
* Local storage
* CDN caching

Those mechanisms may serve as lower storage layers. The resource manager should remain responsible for runtime object identity, in-flight deduplication, typed access, ownership, and disposal.

For example:

```text
ResourceManager
    ↓
ResourceHandler
    ↓
fetch()
    ↓
Service Worker / HTTP cache / network
```

## Suggested source structure

```text
src/resources/
  ResourceManager.ts
  ResourceScope.ts
  ResourceHandle.ts
  ResourceHandler.ts
  ResourceEntry.ts
  ResourceKey.ts
  ResourceErrors.ts
  ResourceScheduler.ts

  handlers/
    textHandler.ts
    jsonHandler.ts
    xmlHandler.ts
    binaryHandler.ts
    imageBitmapHandler.ts
    audioBufferHandler.ts
```

Application-specific handlers should remain with their features:

```text
src/features/editor/resources/
  documentModelHandler.ts

src/features/maps/resources/
  mapDefinitionHandler.ts

src/features/reports/resources/
  reportTemplateHandler.ts
```

## TypeScript requirements

Use:

* Strict TypeScript
* ES modules
* Generic public APIs
* `unknown` rather than `any`
* `readonly` where mutation should not escape
* Structured error classes
* Explicit state unions
* Dependency injection
* Idempotent cleanup
* Browser-standard APIs where practical

Avoid:

* Global mutable promise arrays
* Global singleton managers
* Untyped cache values exposed to callers
* Boolean flags that ambiguously represent several states
* Returning `null` for both loading and failure
* Duplicate parsing code in application features
* Resource handlers that manipulate unrelated global state
* Silent HTTP failures
* Finalization-based correctness

## Required tests

Write automated tests proving the following behavior:

1. Two concurrent acquisitions of the same resource issue one fetch.
2. Both concurrent handles resolve to the same object instance.
3. Distinct resources begin loading before either one completes.
4. The same URL used with different handler kinds creates separate entries.
5. Releasing one of two handles does not dispose the resource.
6. Releasing the final handle disposes the resource exactly once.
7. Releasing the final handle during loading aborts the request.
8. A failed load does not leave an unusable cache placeholder.
9. A later acquisition can retry after failure.
10. `get()` before readiness throws a clear not-ready error.
11. `scope.ready()` waits for every resource acquired before sealing.
12. `scope.dispose()` releases every handle even when one disposer fails.
13. One scope can dispose its handles without disrupting another scope using the same entries.
14. Invalidating an entry prevents an older asynchronous completion from replacing a newer request.
15. JSON runtime validation failures propagate through every shared handle.

Use mocked `fetch()` calls and controllable deferred promises so tests can verify parallelism and request deduplication precisely.

## Deliverables

Produce:

* The complete TypeScript implementation
* Built-in resource handlers
* Unit tests
* A small browser demonstration
* API documentation
* A lifecycle example showing acquisition, barrier synchronization, initialization, use, and disposal
* Documentation explaining how to add a new handler

The final design should let application code express resource dependencies declaratively while the resource system handles all shared operational concerns:

```text
Application code decides what it needs.
Handlers decide how each resource becomes usable.
Scopes define ownership and synchronization boundaries.
The manager coordinates loading, sharing, caching, cancellation, and cleanup.
```

This produces a design that remains extensible as new resource formats appear, prevents duplicated work, enables natural parallel loading, and keeps asynchronous infrastructure out of feature logic.

# Add a Transport Layer

Separate resource interpretation from resource delivery.

The existing `ResourceHandler` should continue to decode and parse resource types, but it should not call the global `fetch()` function directly. Introduce a transport abstraction:

```ts
export interface ResourceTransport {
  execute(
    request: Request,
    context: TransportContext,
  ): Promise<Response>;
}

export interface TransportContext {
  readonly resourceKey: string;
  readonly signal: AbortSignal;
  readonly attempt: number;
}
```

Provide a standard implementation:

```ts
export class FetchTransport implements ResourceTransport {
  execute(
    request: Request,
    context: TransportContext,
  ): Promise<Response> {
    return fetch(request, {
      signal: context.signal,
    });
  }
}
```

The resulting pipeline should become:

```text
ResourceManager
    ↓
Retry and scheduling layer
    ↓
ResourceTransport
    ↓
fetch()
    ↓
Service worker, browser cache, or network
    ↓
Response
    ↓
ResourceHandler.decode()
    ↓
ResourceHandler.parse()
    ↓
In-memory resource cache
```

This boundary provides several advantages:

* Retry behavior can remain independent of JSON, image, audio, and other handlers.
* Tests can replace networking with a deterministic fake transport.
* An application can supply authentication, tracing, request signing, or custom routing.
* The core manager does not depend directly on global browser state.
* PWA service-worker behavior remains below the library’s abstraction.

# Add Configurable Network Retries

Implement retries around the transport operation, not around the complete resource pipeline.

A retry should ordinarily repeat:

```text
request scheduling → transport.execute() → HTTP response validation
```

It should not automatically repeat:

```text
decoding → parsing → validation → runtime object construction
```

A network retry may correct a temporary connectivity problem. Repeating malformed JSON parsing or schema validation will normally produce the same failure and only waste time.

## Retry policy

Define a configurable retry policy:

```ts
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly maxElapsedMs?: number;

  shouldRetry(context: RetryDecisionContext): boolean;

  delayBeforeRetry(
    context: RetryDecisionContext,
  ): number;
}

export interface RetryDecisionContext {
  readonly attempt: number;
  readonly elapsedMs: number;

  readonly request: Request;
  readonly response?: Response;
  readonly error?: unknown;
}
```

Count the initial request as attempt 1. For example, `maxAttempts: 3` means one initial attempt followed by no more than two retries.

Resolve retry policy at a stable level:

```text
Manager default policy
    overridden by
Handler-specific policy
```

Avoid arbitrary per-caller policies for a shared resource. Two consumers acquiring the same cache key should share one deterministic loading operation and one retry sequence.

## Suggested default policy

Retry only idempotent requests such as `GET` and `HEAD`.

Treat the following as potentially transient:

* A transport-level network failure
* A connection timeout
* HTTP 408
* HTTP 425
* HTTP 429
* HTTP 500
* HTTP 502
* HTTP 503
* HTTP 504

Do not retry by default for:

* Most other 4xx responses
* Authentication or authorization failures
* Aborted requests
* Decode failures
* Parse failures
* Runtime schema-validation failures
* Programmer errors inside a handler

The Fetch API may resolve normally even when the server returns an HTTP error status, so the library must inspect `Response.ok` or the status code rather than relying only on promise rejection. ([MDN Web Docs][1])

Allow handlers to modify these rules when a particular protocol has different semantics.

## Exponential backoff with jitter

Do not retry immediately in a tight loop.

Use exponential backoff with randomized jitter:

```ts
function calculateRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maximumDelayMs: number,
  random: () => number,
): number {
  const ceiling = Math.min(
    maximumDelayMs,
    baseDelayMs * 2 ** (attempt - 1),
  );

  return Math.floor(random() * ceiling);
}
```

Inject the random-number function and clock so tests can remain deterministic.

Support:

* Base delay
* Maximum delay
* Maximum attempts
* Maximum total elapsed time
* Per-attempt timeout
* Whole-operation deadline

Honor `Retry-After` when the server provides a valid value and the policy permits retrying that response. Apply a configured maximum so a malformed or extreme value cannot suspend a resource indefinitely.

## Shared retry operation

Retries belong to the cache entry, not to individual handles.

When three callers request the same resource:

```text
Caller A ─┐
Caller B ─┼─ one cache entry → one attempt sequence → one final result
Caller C ─┘
```

Do not create three independent retry loops.

A caller joining while the entry waits in backoff should attach to the existing promise. It should not reset the attempt counter or initiate an immediate request.

## Cancellation during retry

The entry’s `AbortSignal` must cover:

* An active transport request
* A retry-delay timer
* A queued request waiting for scheduler capacity
* Decode or parse work that supports cancellation

When the final reference disappears:

1. Cancel any queued attempt.
2. Abort an active request.
3. Cancel the retry timer.
4. Reject the shared promise with a cancellation error.
5. Remove the entry.

A retry delay must not continue after the resource has no consumers.

# Add a Terminal Failure Model

Retries must always have a stopping condition.

Do not retry indefinitely while feature initialization hangs. When the retry budget or deadline expires, convert the last failure into a structured terminal error.

## Error taxonomy

Define structured errors rather than exposing miscellaneous `TypeError`, `DOMException`, and parser errors directly:

```ts
export type ResourceFailurePhase =
  | "scheduling"
  | "transport"
  | "timeout"
  | "http"
  | "decode"
  | "parse"
  | "validation"
  | "aborted"
  | "retry-exhausted"
  | "disposal";

export class ResourceLoadError extends Error {
  constructor(
    message: string,
    readonly details: {
      readonly resourceKey: string;
      readonly handlerKind: string;
      readonly phase: ResourceFailurePhase;
      readonly attempts: number;
      readonly elapsedMs: number;
      readonly retryable: boolean;
      readonly status?: number;
      readonly cause?: unknown;
    },
  ) {
    super(message);
    this.name = "ResourceLoadError";
  }
}

export class RetryExhaustedError extends ResourceLoadError {
  readonly name = "RetryExhaustedError";
}
```

A retry-exhausted error should retain:

* Resource key
* Handler kind
* Attempt count
* Total elapsed time
* Last HTTP status, when applicable
* Last underlying error
* Whether another future acquisition may retry
* A concise history of attempts for diagnostics

Every handle sharing the cache entry should receive the same terminal failure.

## Failed-entry behavior

After a terminal failure:

1. Reject every current handle.
2. Mark the entry as failed.
3. Preserve the error long enough for diagnostics.
4. Remove the entry when its current references have been released.
5. Permit a later acquisition to create a new attempt sequence.

Optionally support a short failure cooldown:

```ts
export interface FailureCachePolicy {
  readonly retainFailureForMs: number;
}
```

A cooldown can prevent a failing route from initiating a new retry sequence on every render. It must remain configurable because some applications require immediate manual retry.

Do not permanently cache failures by default.

## Scope failure aggregation

Revise `ResourceScope.ready()` so it can report every failed required dependency, not merely whichever promise rejected first.

Support two modes:

```ts
export type ScopeFailureMode =
  | "collect-all"
  | "fail-fast";
```

Use `collect-all` as the default:

```ts
const results = await Promise.allSettled(
  scopePromises,
);

const failures = collectFailures(results);

if (failures.length > 0) {
  throw new ResourceScopeError(failures);
}
```

This helps developers diagnose several broken resources in one run rather than repairing them one at a time.

`fail-fast` may reject immediately, but it must not indiscriminately abort shared entries that other scopes still own.

## Required and optional resources

Let a scope distinguish resources that prevent initialization from resources that merely improve the experience:

```ts
scope.acquire(handler, input, {
  requirement: "required",
});

scope.acquire(handler, input, {
  requirement: "optional",
});
```

A failed required resource should make `scope.ready()` fail.

A failed optional resource should appear in the scope’s load report without preventing initialization. Application code can then substitute a placeholder, disable a feature, or display a reduced experience.

Do not silently replace a required value with stale or synthetic data. Fallback behavior must be explicit.

## Manual retry

Expose an application-controlled retry mechanism:

```ts
await handle.retry();
```

or:

```ts
await scope.retryFailed();
```

Manual retry should create a new loading generation rather than mutating the already rejected promise. Existing handles may either receive a replacement handle or expose the newly created promise through a documented state transition. Choose one model and keep it deterministic.

# Add Explicit Parallelism and Scheduling

Distinct resources should begin loading concurrently by default. The same resource should remain coalesced into one operation.

Parallelism must nevertheless remain bounded. A route containing hundreds of resources should not immediately begin hundreds of network requests and CPU-heavy decoding operations.

## Resource scheduler

Introduce a scheduler independent of the cache and handlers:

```ts
export interface ResourceScheduler {
  schedule<T>(
    task: ScheduledResourceTask<T>,
  ): Promise<T>;
}

export interface ScheduledResourceTask<T> {
  readonly key: string;
  readonly category: "network" | "decode" | "compute";
  readonly priority: ResourcePriority;
  readonly origin?: string;
  readonly signal: AbortSignal;
  readonly execute: () => Promise<T>;
}

export type ResourcePriority =
  | "critical"
  | "normal"
  | "background"
  | "prefetch";
```

Make concurrency configurable:

```ts
export interface SchedulerOptions {
  readonly maximumNetworkConcurrency?: number;
  readonly maximumDecodeConcurrency?: number;
  readonly maximumComputeConcurrency?: number;
  readonly maximumConcurrencyPerOrigin?: number;
}
```

Do not hard-code one supposedly universal ideal value. Mobile devices, desktop systems, cached PWA responses, large media files, and lightweight JSON requests have different characteristics.

Provide documented defaults while allowing the application to override them.

## Scheduling rules

The scheduler should satisfy these rules:

* Critical initialization resources run before background prefetches.
* Tasks with equal priority receive fair service.
* A task canceled while queued never starts.
* A retry waiting in backoff does not occupy a network slot.
* A retry must reacquire scheduler capacity before its next attempt.
* Decode concurrency remains separate from network concurrency.
* A slow parser must not prevent unrelated network requests from starting.
* Shared requests consume one scheduler task regardless of handle count.

## Dependency graphs

Allow a higher-level resource to depend on lower-level resources without serializing unrelated work.

For example:

```text
vertex shader text ─┐
                    ├─ compile WebGL program
fragment shader text ┘

localization JSON ──┐
                    ├─ compile localized template
HTML template ──────┘
```

Dependencies should form a directed acyclic graph. A derived task waits only for its own prerequisites while unrelated branches continue concurrently.

Detect cycles and report them as configuration errors.

## CPU-heavy handlers

Asynchronous network loading does not make CPU-heavy decoding parallel. Allow handlers to delegate expensive parsing, decompression, or compilation to Web Workers.

Keep worker use optional and handler-specific:

```ts
const workerJsonHandler =
  createWorkerBackedHandler({
    workerFactory,
    parserName: "large-json",
  });
```

The manager should not assume that every resource needs a worker.

# Integrate Cleanly with PWA Caching

Do not make the core library manage the PWA’s persistent response cache.

A service worker can intercept a controlled page’s fetch requests and return a cached `Response`, a synthesized response, or a network response. The Cache API stores persistent `Request`/`Response` pairs for this purpose. ([W3C][2])

The library should sit above that mechanism:

```text
┌────────────────────────────────────────────┐
│ Resource library                           │
│                                            │
│ • in-flight request deduplication          │
│ • retry orchestration                      │
│ • typed decoding and parsing               │
│ • runtime object identity                  │
│ • reference counting                       │
│ • disposal                                 │
└──────────────────────┬─────────────────────┘
                       │ fetch(Request)
                       ▼
┌────────────────────────────────────────────┐
│ PWA service worker                         │
│                                            │
│ • precache                                 │
│ • cache-first                              │
│ • network-first                            │
│ • stale-while-revalidate                   │
│ • offline fallback                         │
│ • persistent Request/Response storage      │
└──────────────────────┬─────────────────────┘
                       │
                  CacheStorage
                       or
                    Network
```

These caches are not redundant:

* The PWA cache stores raw or encoded `Response` objects across sessions.
* The resource manager stores decoded, parsed, application-ready objects in the current runtime.
* The PWA cache determines where response bytes come from.
* The resource manager determines how those bytes become shared runtime values.

## Remain cache-source agnostic

The resource manager should not need to know whether a response came from:

* Cache Storage
* The HTTP cache
* A service-worker-generated response
* The network
* A test double

Treat any successful `Response` uniformly.

Allow a PWA to add diagnostic metadata, such as a custom response header indicating cache source, but do not require it.

## Do not bypass the service worker during retries

A retry should ordinarily repeat the same `Request` through the same transport. The service worker remains responsible for choosing cache or network behavior.

Do not automatically:

* Open Cache Storage from the resource manager
* Delete PWA cache entries
* Force a network bypass
* Alter service-worker caching strategy
* Implement stale-while-revalidate inside the core library

An optional integration package may expose helpers, but the core should remain independent.

## Offline behavior

When the PWA’s service worker finds a cached response, the resource library should treat the load as successful.

When neither cache nor network can provide the resource, the service worker may return an error response or cause the client fetch to reject, after which the retry and terminal-failure policies apply. ([MDN Web Docs][3])

Do not treat `navigator.onLine` as authoritative. Browser connectivity heuristics can report misleading results. It may be used to improve messaging or delay an imminent retry, but successful or failed resource acquisition must remain the source of truth. ([MDN Web Docs][4])

An optional offline-aware retry policy may:

1. Observe an offline hint.
2. Pause between attempts.
3. Listen for an `online` event.
4. Resume before the operation’s total deadline.
5. Still make an eventual attempt rather than trusting the hint indefinitely.

## PWA cache refreshes

A service worker using stale-while-revalidate may serve an older cached response and update Cache Storage afterward. The already-decoded in-memory object will not change automatically.

Provide explicit APIs:

```ts
await manager.refresh(key);
await manager.invalidate(key);
await manager.invalidateNamespace(namespace);
```

The PWA should decide when to use them, such as after:

* A service-worker update
* A new application deployment
* A content-version notification
* A user-requested refresh
* A background synchronization event

Do not mutate a shared cached value silently while callers are using it. A refresh should create a new generation and replace the old entry according to a documented atomic policy.

## Version namespaces

Support a cache namespace or generation:

```ts
const manager = new ResourceManager({
  namespace: applicationBuildId,
});
```

Include the namespace in runtime cache identity:

```text
application version
    + handler kind
    + normalized resource key
```

This prevents objects decoded under one application version from being confused with resources expected by another version.

The service worker remains responsible for its own Cache Storage names and migration policy.

# Package the System as a Library

Organize the implementation as a reusable library rather than application source copied between projects.

## Suggested package boundaries

A single package with subpath exports offers a practical initial structure:

```text
@scope/resource-library
@scope/resource-library/retry
@scope/resource-library/handlers
@scope/resource-library/pwa
@scope/resource-library/testing
```

Suggested source layout:

```text
src/
  core/
    ResourceManager.ts
    ResourceScope.ts
    ResourceHandle.ts
    ResourceEntry.ts
    ResourceHandler.ts
    ResourceTransport.ts
    ResourceScheduler.ts
    ResourceErrors.ts
    ResourceEvents.ts

  transport/
    FetchTransport.ts
    RetryingTransport.ts
    TimeoutTransport.ts

  scheduler/
    PriorityResourceScheduler.ts
    Semaphore.ts

  retry/
    RetryPolicy.ts
    ExponentialBackoffPolicy.ts
    RetryAfter.ts

  handlers/
    text.ts
    json.ts
    xml.ts
    binary.ts
    imageBitmap.ts
    audioBuffer.ts

  pwa/
    createVersionNamespace.ts
    serviceWorkerUpdateBridge.ts

  testing/
    FakeTransport.ts
    Deferred.ts
    FakeClock.ts
    FakeScheduler.ts
```

The `pwa` entry point must not register a service worker or impose a caching strategy. It should provide only optional coordination utilities.

## Packaging requirements

Publish the library with:

* ES-module output
* TypeScript declarations
* Subpath exports
* Source maps
* Strict public types
* Named exports
* No global singleton
* No automatic initialization
* No logging unless a logger or observer has been supplied
* Minimal runtime dependencies
* Tree-shakable handlers
* A `sideEffects: false` declaration when accurate

Keep internal implementation files outside the public exports map. Consumers should depend only on documented symbols.

## Dependency injection

Inject environmental behavior:

```ts
export interface ResourceLibraryDependencies {
  readonly transport: ResourceTransport;
  readonly scheduler: ResourceScheduler;
  readonly clock: ResourceClock;
  readonly random: () => number;
  readonly observer?: ResourceObserver;
}
```

This makes retries, timeouts, scheduling, and failures precisely testable.

## Observability

Expose structured events without coupling the library to a logging product:

```ts
export type ResourceEvent =
  | ResourceRequestedEvent
  | MemoryCacheHitEvent
  | ResourceQueuedEvent
  | AttemptStartedEvent
  | RetryScheduledEvent
  | ResourceLoadedEvent
  | ResourceFailedEvent
  | ResourceReleasedEvent
  | ResourceDisposedEvent;
```

Events should contain resource keys and timing information but should avoid including response bodies, credentials, or sensitive headers.

# Revised Lifecycle

The complete lifecycle should now follow this sequence:

```text
1. A feature creates a ResourceScope.

2. The feature acquires all dependencies.

3. The manager:
   • normalizes keys
   • returns existing entries when possible
   • creates missing entries
   • submits new operations to the scheduler

4. Distinct resources load concurrently.

5. Each unique resource:
   • executes through the transport
   • retries transient failures according to policy
   • decodes through its handler
   • parses into a typed runtime value
   • enters the ready state

6. The scope waits for its required resources.

7. If all required resources succeed:
   • feature initialization proceeds

8. If retries are exhausted:
   • structured failures are aggregated
   • the feature chooses an unavailable, offline, or reduced state

9. During use:
   • handles preserve ownership
   • shared entries remain alive

10. During teardown:
    • the scope releases every handle
    • zero-reference resources are disposed or retained by cache policy
```

# Additional Required Tests

Add tests proving that:

1. A transient network error triggers the configured retry sequence.
2. Duplicate callers share one retry sequence.
3. A successful second attempt resolves every shared handle.
4. A nonretryable 404 performs only one attempt.
5. A retryable 503 respects `Retry-After`.
6. A malformed JSON response does not trigger a network retry.
7. Retry exhaustion produces a structured `RetryExhaustedError`.
8. The error reports attempt count, elapsed time, key, and final cause.
9. Releasing the final handle during backoff cancels the timer.
10. Releasing the final handle while queued prevents the request from starting.
11. Backoff does not consume a scheduler slot.
12. Network concurrency never exceeds its configured limit.
13. Decode concurrency remains independent of network concurrency.
14. Critical resources run before queued prefetches.
15. Equal-priority scopes receive fair scheduling.
16. `collect-all` scope mode reports every failed required resource.
17. Optional-resource failure does not reject scope initialization.
18. A response supplied by a simulated service worker cache parses normally.
19. The core library never accesses `CacheStorage`.
20. A namespace change prevents reuse of an older runtime entry.
21. A service-worker update notification can trigger explicit invalidation.
22. `navigator.onLine` never determines correctness.
23. Manual retry starts a new loading generation.
24. A stale completion from an invalidated generation cannot replace the newer value.

These additions turn the mechanism from a useful application component into a credible general-purpose library: resilient under transient network conditions, deterministic when the network ultimately fails, controlled under heavy parallel workloads, and compatible with PWA caching without duplicating or interfering with it.

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Response/ok?utm_source=chatgpt.com "Response: ok property - Web APIs | MDN"
[2]: https://www.w3.org/TR/service-workers/?utm_source=chatgpt.com "Service Workers Nightly"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/fetch_event?utm_source=chatgpt.com "ServiceWorkerGlobalScope: fetch event - Web APIs | MDN"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine?utm_source=chatgpt.com "Navigator: onLine property - Web APIs | MDN"

# Separate Resource Identity from Loading Policy

A resource’s identity determines whether callers may share a cached value. Loading policy determines how the library attempts to obtain it.

Do not include transient policy settings such as priority or retry count in the resource key unless they change the resulting value.

```ts
export interface ResourceDescriptor<Input> {
  readonly handlerKind: string;
  readonly input: Input;
  readonly identityKey: string;
}

export interface ResourceRequestOptions {
  readonly priority?: ResourcePriority;
  readonly requirement?: "required" | "optional";
  readonly timeoutMs?: number;
}
```

Two consumers may request the same resource with different priorities or timeouts. Define deterministic joining rules:

* The first acquisition creates the loading operation.
* Later acquisitions share that operation.
* A later caller may raise priority when the scheduler supports promotion.
* A later caller must not silently replace the retry or timeout policy of an operation already running.
* A caller-specific timeout should stop that caller from waiting without necessarily aborting a request still owned by other callers.
* Only the disappearance of the final owner may cancel the underlying operation.

This distinction prevents subtle behavior where adding a second consumer unexpectedly changes an existing request.

# Define Cache-Key Correctness Rules

Incorrect cache keys can return the wrong resource and can become a security problem.

A cache key may need to account for:

* Canonical URL
* Handler kind
* Application version
* HTTP method
* Request body identity
* Locale
* Content-negotiation headers
* Transformation options
* Authentication or tenant context
* User identity when responses differ by user
* Feature or schema version

Do not include secrets, access tokens, or raw authorization headers directly in cache keys or diagnostic events. Use a safe opaque security-context identifier.

Document URL normalization carefully. Do not discard query parameters or fragments unless the handler explicitly declares them irrelevant.

# Prevent Cross-User and Cross-Tenant Cache Leaks

PWAs often retain a page runtime while authentication state changes. A resource loaded for one user must never become visible to another user merely because the URL matches.

Add a security partition:

```ts
export type ResourcePartition = string;

const manager = new ResourceManager({
  namespace: applicationBuildId,
  partition: authenticatedSessionId,
});
```

Required behavior:

* Include the partition in runtime cache identity.
* Clear or replace the partition during login, logout, or tenant switching.
* Never reuse authenticated entries across partitions.
* Provide a deterministic `disposePartition()` or `clear()` operation.
* Avoid logging user-specific URLs or request metadata without redaction.

A public resource may use a shared public partition. Private resources should use session-specific partitions.

# Define Freshness and Revalidation Semantics

Reference counting answers whether a value remains in use. It does not answer whether the value remains current.

Add explicit freshness metadata:

```ts
export interface ResourceFreshness {
  readonly loadedAt: number;
  readonly expiresAt?: number;
  readonly staleAt?: number;
  readonly etag?: string;
  readonly lastModified?: string;
}
```

Support clear states:

```ts
export type FreshnessStatus =
  | "fresh"
  | "stale"
  | "expired";
```

The resource library should not duplicate the service worker’s persistent caching strategy, but it still needs a policy for decoded in-memory values.

Recommended behavior:

* A fresh entry may be returned immediately.
* An expired zero-reference entry should reload.
* A stale entry may be returned only when the caller explicitly permits stale data.
* Refresh should create a new generation rather than mutate an object currently used by consumers.
* PWA or application events may trigger explicit invalidation.
* HTTP validators such as ETags may be passed through the transport layer without making the manager responsible for persistent caching.

Distinguish these operations:

```ts
manager.invalidate(key); // Prevent future reuse.
manager.refresh(key);    // Obtain a newer generation.
manager.evict(key);      // Remove when ownership permits.
```

# Make Cached Values Immutable by Default

All callers normally receive the same object instance. If one caller mutates it, every other caller observes the mutation.

Define one of these contracts for each handler:

```ts
export type SharingMode =
  | "shared-immutable"
  | "clone-per-handle"
  | "exclusive";
```

Recommended defaults:

* Parsed configuration and metadata: shared and immutable.
* Mutable document models: clone per handle or create a resource-specific session.
* Stateful resources that cannot be shared safely: exclusive.
* WebGL and audio resources: shared only when their operational semantics permit it.

The library may optionally freeze plain development-mode objects to reveal accidental mutation, but it should not recursively freeze arbitrary values without handler approval.

# Add Memory Budgets and Eviction

Reference counting prevents active resources from being destroyed, but a warm cache can still consume excessive memory.

Support configurable limits:

```ts
export interface ResourceMemoryPolicy {
  readonly maximumEntries?: number;
  readonly maximumEstimatedBytes?: number;
  readonly maximumIdleMs?: number;
}
```

Allow handlers to estimate retained size:

```ts
estimateSize?(value: Value): number | undefined;
```

Eviction rules should include:

* Never evict an actively referenced entry.
* Prefer least-recently-used zero-reference entries.
* Permit immediate eviction of large resources.
* Record whether size estimates are approximate.
* Dispose explicitly managed values during eviction.
* Respond to memory-pressure hints when a host application provides them.
* Expose current counts and estimated usage for diagnostics.

Do not promise precise browser-memory accounting. JavaScript runtimes do not expose reliable total retained size for arbitrary object graphs.

# Add Progress Reporting

A single unresolved `scope.ready()` promise gives no indication of progress during a large initialization.

Expose structured progress:

```ts
export interface ResourceProgress {
  readonly resourcesTotal: number;
  readonly resourcesSettled: number;
  readonly requiredTotal: number;
  readonly requiredSettled: number;
  readonly bytesLoaded?: number;
  readonly bytesTotal?: number;
}
```

Allow subscriptions through the scope or observer system.

Progress must remain honest:

* Byte totals may be unknown.
* Cached responses may complete without meaningful transfer progress.
* Decoding and parsing may continue after all bytes arrive.
* One large resource should not count the same as one tiny resource when weighted progress is requested.
* Retry attempts must not cause completed-resource counts to move backward unexpectedly.

Support both item-based and byte-weighted progress where information permits.

# Support Streaming Without Forcing It into Every Handler

Some resources should become useful before the entire response arrives:

* Large JSON-line datasets
* Media
* Map tiles
* Incremental search indexes
* Server-sent records
* Large archives

Add an optional streaming handler contract rather than complicating the basic handler:

```ts
export interface StreamingResourceHandler<Input, Item, Value> {
  readonly kind: string;
  cacheKey(input: Input): string;

  stream(
    input: Input,
    context: ResourceContext,
  ): AsyncIterable<Item>;

  finalize(
    items: AsyncIterable<Item>,
    context: ResourceContext,
  ): Promise<Value>;
}
```

Clarify that partially constructed values should not enter the ordinary ready cache unless the handler explicitly supports progressive visibility.

Retries after partial consumption require special semantics. Do not automatically restart a streaming request unless the handler declares it resumable or safely restartable.

# Validate Response Identity and Content

A successful HTTP status does not guarantee that the response contains the expected resource.

Handlers or the transport-validation layer should support:

* Expected MIME types
* Maximum response size
* Schema validation
* Content hashes
* Version fields
* Signature verification where required
* Redirect restrictions
* Origin restrictions

Example:

```ts
export interface ResponseConstraints {
  readonly acceptedContentTypes?: readonly string[];
  readonly maximumBytes?: number;
  readonly allowedOrigins?: readonly string[];
  readonly integrity?: string;
}
```

Reject an HTML error page returned with status 200 when JSON was expected.

Apply size limits before consuming untrusted large responses where streaming metadata permits it.

# Add Web-Security Guidance

The library will process externally sourced content, so the documentation should explicitly warn that parsing does not make content safe.

Specific concerns include:

* Do not insert loaded HTML into the DOM without sanitization.
* Use Trusted Types where the application enables them.
* Treat SVG as active content rather than an ordinary inert image in relevant contexts.
* Avoid evaluating loaded JavaScript.
* Do not construct functions from fetched text.
* Respect Content Security Policy.
* Validate redirects and unexpected origins.
* Do not expose credentials, headers, or response bodies through observability events.
* Ensure XML parsing errors are detected.
* Ensure application-specific archive handlers defend against decompression bombs and path traversal.

Security sanitization belongs in specialized handlers or application policy, not in an ambiguous generic parser.

# Define Request and Response Interceptor Boundaries

Applications may need authentication, tracing, correlation IDs, or request transformation.

Support explicit middleware:

```ts
export interface TransportMiddleware {
  execute(
    request: Request,
    context: TransportContext,
    next: (
      request: Request,
      context: TransportContext,
    ) => Promise<Response>,
  ): Promise<Response>;
}
```

Document the ordering of:

```text
request construction
→ middleware
→ scheduling
→ retry attempt
→ transport
→ response validation
→ decoding
→ parsing
```

Clarify whether middleware runs once per logical load or once per retry attempt. Authentication refresh normally needs attempt-level participation, while high-level telemetry may need one event per logical load.

Avoid unrestricted interceptors that can silently alter cache identity after the cache key has already been computed.

# Handle Authentication Refresh Separately from Ordinary Retry

A `401` should not normally enter the generic transient-network retry loop.

Allow an authentication integration to:

1. Detect an expired credential.
2. Coordinate one shared credential refresh.
3. Rebuild the request.
4. Retry the resource once.
5. Produce a terminal authentication failure if refresh fails.

Multiple resource requests encountering expired credentials should not each launch an independent token refresh.

Keep authentication optional and outside the core package, but define the extension point clearly.

# Define Redirect and Request-Body Semantics

Retries remain straightforward for `GET`, but request bodies can be non-repeatable.

Document that:

* Streams may not be replayable.
* Retrying non-idempotent requests requires explicit handler approval.
* Redirects may change origin or credentials behavior.
* A request factory may be safer than storing one consumed `Request`.

```ts
export type RequestFactory =
  (
    attempt: number,
    signal: AbortSignal,
  ) => Request | Promise<Request>;
```

The transport should obtain a fresh request for each attempt when replayability matters.

# Add Generational Handles

Invalidation and refresh can create multiple versions of the same logical resource while old consumers remain active.

Model generations explicitly:

```ts
export interface ResourceGeneration {
  readonly key: string;
  readonly generation: number;
}
```

Rules:

* Existing handles retain the generation they acquired.
* Refresh creates a newer generation.
* New callers receive the latest valid generation.
* Old generations remain alive while referenced.
* Disposal occurs independently for each generation.
* An older asynchronous completion must never overwrite a newer generation.

This makes refresh atomic and avoids mutating objects underneath active consumers.

# Clarify Scope Ownership and Composition

Features will often have nested lifecycles. Support child scopes:

```ts
const pageScope = manager.createScope();
const dialogScope = pageScope.createChild();
```

Define whether disposing a parent disposes its children. A sensible default is yes.

Also specify:

* Whether a handle may transfer between scopes
* Whether scopes may adopt existing handles
* Whether child failures affect parent readiness
* Whether scopes may acquire resources after becoming ready
* Whether disposal remains safe while `ready()` is pending

A simple v1 may prohibit transfer and late acquisition. The restriction should be explicit rather than accidental.

# Add Dependency-Cycle and Reentrancy Protection

Handlers that acquire other resources can accidentally create cycles:

```text
A depends on B
B depends on C
C depends on A
```

Track the active dependency chain and throw a structured cycle error containing the path.

Also guard against:

* A disposer reacquiring the value currently being disposed
* A handler invalidating its own entry during parsing
* Recursive acquisition before an entry has been installed
* Observer callbacks synchronously mutating manager state in unsafe phases

# Define Browser and Runtime Support

Because the package targets PWAs, establish supported environments:

* Main browser window
* Dedicated workers
* Shared workers, when practical
* Service-worker context, only when explicitly supported
* Test environments
* Server-side runtimes, if intentionally supported

Handlers requiring DOM APIs should live in optional entry points. For example, an XML handler using `DOMParser` or an audio handler using `AudioContext` should not make the core package unusable in worker or server environments.

# Add Development Diagnostics

Provide an optional development inspector that can report:

* Current entries
* Handler kinds
* States
* Reference counts
* Owning scopes
* Queue positions
* Attempt counts
* Retry delays
* Load durations
* Estimated memory
* Dependency relationships
* Failure causes

Do not include this inspector in production bundles unless imported explicitly.

This will make reference leaks, duplicate identities, and stalled scopes much easier to diagnose.

# Define Semver and Extensibility Rules

Because this will become a library, document which contracts form the stable public API:

* Handler interface
* Manager and scope methods
* Error base classes
* Event shapes
* Scheduler and transport extension points
* Subpath exports

Avoid exposing internal cache-entry classes unless consumers genuinely need them. Internal states can evolve more easily when public APIs expose read-only snapshots instead.

# Recommended Priority

For the first credible release, I would treat these as mandatory:

1. Cache-key and security partition correctness
2. Shared-value immutability rules
3. Caller-policy conflict rules
4. Freshness, invalidation, and generations
5. Memory limits and disposal
6. Structured security guidance
7. Progress and diagnostics
8. Dependency-cycle protection

Streaming, worker-backed parsing, authentication helpers, and advanced middleware can follow as optional extensions. That keeps the initial library focused without leaving architectural gaps that would later require breaking changes.
