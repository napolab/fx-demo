// Orthonormal 8x8 DCT-II (forward) / DCT-III (inverse), separable rows→columns.
// Reference implementation: the WGSL kernel in engine/shaders/dct-corrupt.wgsl
// uses the identical basis() and pass order — this module is its executable spec.

const SIZE = 8;

const basis = (k: number, n: number): number => {
  const scale = k === 0 ? Math.sqrt(1 / SIZE) : Math.sqrt(2 / SIZE);

  return scale * Math.cos(((2 * n + 1) * k * Math.PI) / (2 * SIZE));
};

type Reader = (row: number, column: number) => number;

const transformRows = (read: Reader, kernel: (k: number, n: number) => number): number[] =>
  Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / SIZE);
    const k = index % SIZE;

    return Array.from({ length: SIZE }, (_, n) => read(row, n) * kernel(k, n)).reduce((sum, v) => sum + v, 0);
  });

const transformColumns = (read: Reader, kernel: (k: number, n: number) => number): number[] =>
  Array.from({ length: 64 }, (_, index) => {
    const k = Math.floor(index / SIZE);
    const column = index % SIZE;

    return Array.from({ length: SIZE }, (_, m) => read(m, column) * kernel(k, m)).reduce((sum, v) => sum + v, 0);
  });

const readerOf =
  (values: readonly number[]): Reader =>
  (row, column) =>
    values[row * SIZE + column] ?? 0;

export const forwardDCT8x8 = (block: readonly number[]): number[] => {
  const rows = transformRows(readerOf(block), basis);

  return transformColumns(readerOf(rows), basis);
};

export const inverseDCT8x8 = (coeffs: readonly number[]): number[] => {
  const inverseKernel = (n: number, k: number): number => basis(k, n);
  const rows = transformRows(readerOf(coeffs), inverseKernel);

  return transformColumns(readerOf(rows), inverseKernel);
};
