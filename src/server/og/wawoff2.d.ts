declare module 'wawoff2/decompress.js' {
  /** WOFF2 → TTF (Google's decoder compiled to WebAssembly). */
  export default function decompress(buffer: Uint8Array): Promise<Uint8Array>;
}
