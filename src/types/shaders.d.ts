// WGSL shaders are imported as raw source strings (next.config.ts: asset/source).
declare module '*.wgsl' {
  const source: string;
  export default source;
}
