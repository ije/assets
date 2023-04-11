# Assets

Create response for static files.

## Usage

To use **Assets**, create a `server.tsx` file like this:

```ts
import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import assets from "https://deno.land/x/assets@0.1.0/mod.ts";


serve((req) =>
  assets(req, { ignore: ["/private"] }, () => new Response("Not found", { status: 404 }))
);
```

**Run the server**:

```bash
deno run --allow-net --allow-read server.tsx
```
