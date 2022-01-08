export default class Cache<T, U> extends Map<T, U> {
  pop(key: T): U | undefined {
    const value = this.get(key);
    this.delete(key);
    return value;
  }
}
