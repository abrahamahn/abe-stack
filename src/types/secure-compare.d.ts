declare module 'secure-compare' {
  function secureCompare(a: string | Buffer, b: string | Buffer): boolean;
  export default secureCompare;
} 