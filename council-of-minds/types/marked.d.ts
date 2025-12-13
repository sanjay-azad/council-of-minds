// Minimal type declarations for `marked` used in this project
declare module 'marked' {
  export function parse(src: string): string;
  export const marked: { parse: (src: string) => string };
  const _default: { parse: (src: string) => string };
  export default _default;
}
