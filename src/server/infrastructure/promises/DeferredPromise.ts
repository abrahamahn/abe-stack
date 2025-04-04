export class DeferredPromise<T> {
  public promise: Promise<T>;
  public resolve!: (value: T) => void;
  public reject!: (reason?: Error | unknown) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
