export function createSgp4Worker(): Worker {
  return new Worker("/propagation-worker.js");
}
