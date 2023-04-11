import uaParser from "https://esm.sh/v114/ua-parser-js@1.0.35";

const targets = new Set([
  "chrome",
  "deno",
  "edge",
  "firefox",
  "hermes",
  "ie",
  "ios",
  "node",
  "opera",
  "rhino",
  "safari",
]);

export function getBrowserInfo(
  userAgent: string | null,
): { name: string; version: string } | null {
  if (!userAgent) {
    return null;
  }
  if (userAgent.startsWith("Deno/")) {
    return { name: "deno", version: trimPrefix(userAgent, "Deno/") };
  }
  const browser = uaParser(userAgent).browser;
  const name = browser.name?.toLowerCase();
  if (name && targets.has(name) && browser.version) {
    return { name, version: browser.version.split(".").slice(0, 2).join(".") };
  }
  return null;
}

export function trimPrefix(s: string, prefix: string): string {
  if (prefix !== "" && s.startsWith(prefix)) {
    return s.slice(prefix.length);
  }
  return s;
}

export function splitBy(
  s: string,
  searchString: string,
  fromLast = false,
): [prefix: string, suffix: string] {
  const i = fromLast ? s.lastIndexOf(searchString) : s.indexOf(searchString);
  if (i >= 0) {
    return [s.slice(0, i), s.slice(i + searchString.length)];
  }
  return [s, ""];
}
