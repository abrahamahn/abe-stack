export type RootRoute = { type: "root" };
export type DesignRoute = { type: "design"; page?: string };
export type UnknownRoute = { type: "unknown"; url: string };

export type Route = RootRoute | DesignRoute | UnknownRoute;

export function parseRoute(url: string): Route {
  const parsed = new URL(url);
  if (parsed.pathname === "/") return { type: "root" };
  if (parsed.pathname === "/design") {
    if (parsed.searchParams.has("page")) {
      return { type: "design", page: parsed.searchParams.get("page") || "" };
    }
    return { type: "design" };
  }
  return { type: "unknown", url };
}

export function formatRoute(route: Route): string {
  if (route.type === "root") return "/";
  if (route.type === "design") {
    if (route.page !== undefined) return "/design?page=" + route.page;
    return "/design";
  }
  if (route.type === "unknown") {
    return route.url;
  }
  return "/"; // Default fallback
}

// Export this utility function for parameter extraction
// `/thread/:threadId` will return {threadId: string}
export function matchRouteWithParams(
  pattern: string,
  urlPath: string,
): Record<string, string> | undefined {
  const patternSegments = pattern.split("/");
  const urlSegments = urlPath.split("/");

  if (patternSegments.length !== urlSegments.length) {
    return undefined;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const urlSegment = urlSegments[i];

    if (patternSegment.startsWith(":")) {
      const key = patternSegment.slice(1);
      // If urlSegment is empty, return undefined
      if (urlSegment === "") {
        return undefined;
      }
      params[key] = urlSegment;
    } else if (patternSegment !== urlSegment) {
      return undefined;
    }
  }

  return params;
}

export function matchRoute(pattern: string, urlPath: string): boolean {
  // Normalize paths by removing trailing slashes
  const normalizedPattern = pattern.endsWith("/")
    ? pattern.slice(0, -1)
    : pattern;
  const normalizedUrlPath = urlPath.endsWith("/")
    ? urlPath.slice(0, -1)
    : urlPath;

  // Special case for root path
  if (normalizedPattern === "" && normalizedUrlPath === "") return true;

  return normalizedPattern === normalizedUrlPath;
}
