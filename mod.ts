import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import { getContentType } from "./media_type.ts";

type Options = {
  root?: string;
  ignore?: string[];
};

export default async function assets(
  req: Request,
  options?: Options,
  fallback?: (req: Request) => Promise<Response> | Response,
): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (
    !pathname.startsWith("/.") &&
    !options?.ignore?.some((p) => pathname.startsWith(p))
  ) {
    const contentType = getContentType(pathname);
    if (contentType) {
      try {
        const filePath = join(options?.root ?? Deno.cwd(), pathname);
        const stat = await Deno.lstat(filePath);
        const headers = new Headers({ "Content-Type": contentType });
        if (stat.isFile) {
          let etag: string | null = null;
          const { mtime, size } = stat;
          if (mtime) {
            etag = `W/${mtime.getTime().toString(16)}-${size.toString(16)}`;
            headers.append("Last-Modified", new Date(mtime).toUTCString());
          } else {
            const deployId = Deno.env.get("DENO_DEPLOYMENT_ID");
            if (deployId) {
              etag = `W/${
                btoa(pathname).replace(/[^a-z0-9]/g, "")
              }-${deployId}`;
            }
          }
          if (etag) {
            if (req.headers.get("If-None-Match") === etag) {
              return new Response(null, { status: 304 });
            }
            headers.append("ETag", etag);
          }
          const file = await Deno.open(filePath, { read: true });
          return new Response(file.readable, { headers });
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          return new Response(err.message, {
            status: 500,
            headers: [["Content-Type", "text/html"]],
          });
        }
      }
    }
  }
  if (fallback) {
    return fallback(req);
  }
  return new Response("Not Found", { status: 404 });
}

export { registerType } from "./media_type.ts";
