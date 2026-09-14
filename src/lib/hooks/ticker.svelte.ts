/**
 * A reactive clock that ticks on an interval.
 *
 * Useful to re-evaluate time-dependent derived state (e.g. "is this card due
 * yet?") without polling the server. Encapsulating the interval in a class
 * keeps the assignment to reactive state out of the component's `$effect`.
 *
 * @example
 * ```svelte
 * const clock = new Ticker();
 * $effect(() => {
 *   if (!waiting) return;
 *   clock.start();
 *   return () => clock.stop();
 * });
 * // read clock.now
 * ```
 */
export class Ticker {
	/** Current timestamp, updated on every tick. */
	now = $state(Date.now());

	#interval: ReturnType<typeof setInterval> | undefined;

	/** Start ticking every `intervalMs` milliseconds. Restarts if already running. */
	start(intervalMs = 1000) {
		this.stop();
		this.now = Date.now();
		this.#interval = setInterval(() => {
			this.now = Date.now();
		}, intervalMs);
	}

	/** Stop ticking. Safe to call when not running. */
	stop() {
		if (this.#interval !== undefined) {
			clearInterval(this.#interval);
			this.#interval = undefined;
		}
	}
}
