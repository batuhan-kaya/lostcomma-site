declare module 'subset-font' {
  /** Cut a font down to the letters in `text` (HarfBuzz compiled to WebAssembly · variable axes kept). */
  export default function subsetFont(font: Buffer, text: string, options?: { targetFormat?: 'woff2' | 'woff' | 'truetype' | 'sfnt' }): Promise<Buffer>;
}
