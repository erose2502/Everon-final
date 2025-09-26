declare module 'tesseract.js' {
  export function recognize(image: string | File, lang: string): Promise<{ data: { text: string } }>;
  export function createWorker(): any;
}
