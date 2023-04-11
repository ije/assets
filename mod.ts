import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import {
  transform,
  type TransformOptions,
} from "https://deno.land/x/esbuild@v0.17.16/mod.js";
import { getContentType } from "./media_type.ts";
import { getBrowserInfo } from "./util.ts";

const moduleRegexp = /\.(js|mjs|jsx|ts|mts|tsx|css)$/;

type Options = {
  root?: string;
  ignore?: string[];
  transform?: boolean | RegExp;
  transformOptions?: TransformOptions;
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
            headers.set("Last-Modified", new Date(mtime).toUTCString());
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
            headers.set("ETag", etag);
          }
          const file = await Deno.open(filePath, { read: true });
          if (
            options?.transform && moduleRegexp.test(pathname) &&
            (!(options.transform instanceof RegExp) ||
              options.transform.test(pathname))
          ) {
            const input = await new Response(file.readable).text();
            const transformOptions = options.transformOptions ?? {};
            if (!transformOptions.target) {
              const browser = getBrowserInfo(req.headers.get("User-Agent"));
              transformOptions.target = browser
                ? browser.name + browser.version
                : "es2015";
            }
            if (!transformOptions.format) {
              transformOptions.format = "esm";
            }
            let ext = pathname.split(".").pop();
            if (ext === "mts") {
              ext = "ts";
            } else if (ext === "mjs") {
              ext = "js";
            }
            try {
              const ret = await transform(
                input,
                Object.assign(
                  transformOptions,
                  {
                    sourcefile: pathname,
                    loader: ext,
                  },
                ),
              );
              if (!pathname.endsWith(".css")) {
                headers.set(
                  "Content-Type",
                  "application/javascript; charset=utf-8",
                );
              }
              return new Response(ret.code, { headers });
            } catch (err) {
              console.log(err);
              return new Response(err.message, { status: 500 });
            }
          }
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
