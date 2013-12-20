
interface Promise {
  then(...args:any[]):Promise;
  map(...args:any[]):Promise;
}

declare module When {
  function defer(): Deferred;
  function map(list, action);
  function all(list);
  function resolve(...args:any[]);

  export interface Deferred {
    promise: Promise;
    resolve(...args:any[]);
    reject(reason?);
  }

}

declare module "when" {
  export = When
}