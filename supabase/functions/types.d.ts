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

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export const serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.56.1' {
  export * from '@supabase/supabase-js';
}

declare module 'npm:@aws-sdk/client-s3';
declare module 'npm:@aws-sdk/s3-request-presigner';