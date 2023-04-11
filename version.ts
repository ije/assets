/** `version` managed by https://deno.land/x/land/publish. */
export const VERSION = "0.0.2";

/** `postpublish` will be invoked after published. */
export function postpublish(version: string) {
  console.log("Upgraded to", version);
}
