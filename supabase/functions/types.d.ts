declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare module "npm:@supabase/supabase-js" {
  export function createClient(url: string, key: string): any
}

declare module "npm:@aws-sdk/client-s3" {
  export class S3Client {
    constructor(cfg: any)
    send(command: any): Promise<any>
  }
  export class PutObjectCommand {
    constructor(cfg: any)
  }
}

declare type ImageData = { data: Uint8ClampedArray; width: number; height: number }

declare module "@jsquash/webp" {
  export function encode(data: ImageData, options?: any): Promise<ArrayBuffer>
  export function decode(buf: ArrayBuffer): Promise<ImageData>
}

declare module "@jsquash/jpeg" {
  export default function decode(buf: ArrayBuffer): Promise<ImageData>
}

declare module "@jsquash/png" {
  export default function decode(buf: ArrayBuffer): Promise<ImageData>
}

declare module "@jsquash/resize" {
  export default function resize(data: ImageData, options: { width: number; height: number; method?: string; fitMethod?: string }): Promise<ImageData>
}
