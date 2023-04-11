import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import assets from "./mod.ts";

serve((req) =>
  assets(
    req,
    { root: "./public", transform: /\.(jsx|tsx?|css)$/ },
    () => new Response("Hello World!"),
  )
);
