# Assets

Create response for static files.

## Usage

To use **Assets**, create a `server.tsx` file like this:

```ts
import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import assets from "https://deno.land/x/assets@0.0.1/mod.ts";

serve((req) =>
  assets(
    req,
    {
      root: "./public",
      ignore: ["/private"],
      transform: /\.(jsx|tsx?)$/,
      transformOptions: {
        jsxFactory: "h",
        jsxFragmentFactory: "Fragment",
      },
    },
    () => new Response("Not found", { status: 404 }),
  )
);
```

**Run the server**:

```bash
deno run --allow-net --allow-read server.tsx
```

## Options

- `root` - The root directory to serve static assets from. Defaults to `./`.
- `ignore` - An array of paths to ignore. Defaults to `[]`.
- `transform` - A regular expression to match files that should be transformed,
  or set it to `true` to transform all files. Defaults to `false`.
- `transformOptions` - Options to pass to
  [`esbuild.transform`](https://esbuild.github.io/api/#transform) for
  transforming files. Defaults to `{}`.

## Extend Asset Types

By default, **Assets** supports types defined in
[`media_type.ts`](./media_type.ts), you can extend it use `registerType` function:

```ts
import { registerType } from "https://deno.land/x/assets@0.0.1/mod.ts";
registerType("apk", "application/vnd.android.package-archive");
```
