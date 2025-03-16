export class DeferredPromise<T> {
	public resolve!: (value: T | PromiseLike<T>) => void;
	public reject!: (reason?: unknown) => void;
	public promise: Promise<T>;

	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}
}
