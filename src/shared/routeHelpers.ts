export type RootRoute = { type: "root" };
export type DesignRoute = { type: "design"; page?: string };
export type UnknownRoute = { type: "unknown"; url: string };

export type Route = RootRoute | DesignRoute | UnknownRoute;

export function parseRoute(url: string): Route {
  const parsed = new URL(url);
  if (parsed.pathname === "/") return { type: "root" };
  if (parsed.pathname === "/design") {
    const page = parsed.searchParams.get("page") || undefined;
    return { type: "design", page };
  }
  return { type: "unknown", url };
}

export function formatRoute(route: Route) {
  if (route.type === "root") return "/";
  if (route.type === "design") {
    if (route.page) return "/design?page=" + route.page;
    return "/design";
  }
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
      params[key] = urlSegment;
    } else if (patternSegment !== urlSegment) {
      return undefined;
    }
  }

  return params;
}

export function matchRoute(pattern: string, urlPath: string): boolean {
  return (
    pattern === urlPath ||
    pattern + "/" === urlPath ||
    pattern === urlPath + "/"
  );
}
