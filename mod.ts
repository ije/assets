import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import {
  transform,
  type TransformOptions,
} from "https://deno.land/x/esbuild@v0.17.17/mod.js";
import { getContentType } from "./media_type.ts";
import { getBrowserInfo } from "./util.ts";

const moduleRegexp = /\.(js|mjs|jsx|ts|mts|tsx|css)$/;
const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

type Options = {
  root?: string;
  ignore?: string[];
  transform?: boolean | RegExp;
  transformOptions?: TransformOptions;
};

export default async function assets(
  req: Request,
  options?: Options,
  fallback?: () => Promise<Response> | Response,
): Promise<Response> {
  const { hostname, pathname } = new URL(req.url);
  if (
    !pathname.startsWith("/.") &&
    !options?.ignore?.some((p) => pathname.startsWith(p))
  ) {
    const contentType = getContentType(pathname);
    if (contentType) {
      try {
        const filePath = join(options?.root ?? Deno.cwd(), pathname);
        const stat = await Deno.lstat(filePath);
        if (stat.isFile) {
          const { mtime, size } = stat;
          const headers = new Headers({ "Content-Type": contentType });
          const isModule = options?.transform && moduleRegexp.test(pathname) &&
            (
              !(options.transform instanceof RegExp) ||
              options.transform.test(pathname)
            );
          const transformOptions = options?.transformOptions ?? {};
          if (isModule && !transformOptions.target) {
            const browser = getBrowserInfo(req.headers.get("User-Agent"));
            transformOptions.target = browser
              ? browser.name + browser.version
              : "es2015";
          }
          let etag: string | null = null;
          if (mtime) {
            etag = `W/${mtime.getTime().toString(16)}-${size.toString(16)}`;
            if (isModule) {
              etag += `-${transformOptions.target}`;
            } else {
              headers.set("Last-Modified", new Date(mtime).toUTCString());
            }
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
          if (isModule) {
            let ext = pathname.split(".").pop();
            if (ext === "mts") {
              ext = "ts";
            } else if (ext === "mjs") {
              ext = "js";
            }
            if (transformOptions.format === undefined) {
              transformOptions.format = "esm";
            }
            if (
              transformOptions.sourcemap === undefined &&
              localHostnames.has(hostname)
            ) {
              transformOptions.sourcemap = "inline";
            }
            if (
              transformOptions.minify === undefined &&
              !localHostnames.has(hostname)
            ) {
              transformOptions.minify = true;
            }
            try {
              const ret = await transform(
                await new Response(file.readable).text(),
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
              console.error(err);
              return new Response(err.message, { status: 500 });
            }
          }
          return new Response(file.readable, { headers });
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          return new Response(err.message, { status: 500 });
        }
      }
    }
  }
  return fallback?.() ?? new Response("Not Found", { status: 404 });
}

export { registerType } from "./media_type.ts";
