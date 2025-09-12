/// <reference types="npm:@types/node" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

declare global {
  interface Window {
    Deno: typeof Deno;
  }
}

export {};