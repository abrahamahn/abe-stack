import { describe, it, expect } from "vitest";

import {
  parseRoute,
  formatRoute,
  matchRouteWithParams,
  matchRoute,
  type Route,
} from "../../../../../server/shared/helpers/routeHelpers";

describe("routeHelpers", () => {
  describe("parseRoute", () => {
    it("should parse root route", () => {
      const route = parseRoute("http://localhost:3000/");
      expect(route).toEqual({ type: "root" });
    });

    it("should parse design route without page", () => {
      const route = parseRoute("http://localhost:3000/design");
      expect(route).toEqual({ type: "design" });
    });

    it("should parse design route with page", () => {
      const route = parseRoute("http://localhost:3000/design?page=test");
      expect(route).toEqual({ type: "design", page: "test" });
    });

    it("should parse unknown route", () => {
      const url = "http://localhost:3000/unknown";
      const route = parseRoute(url);
      expect(route).toEqual({ type: "unknown", url });
    });

    it("should handle URLs with different protocols", () => {
      const route = parseRoute("https://example.com/");
      expect(route).toEqual({ type: "root" });
    });

    it("should handle URLs with different ports", () => {
      const route = parseRoute("http://localhost:8080/");
      expect(route).toEqual({ type: "root" });
    });
  });

  describe("formatRoute", () => {
    it("should format root route", () => {
      const route: Route = { type: "root" };
      expect(formatRoute(route)).toBe("/");
    });

    it("should format design route without page", () => {
      const route: Route = { type: "design" };
      expect(formatRoute(route)).toBe("/design");
    });

    it("should format design route with page", () => {
      const route: Route = { type: "design", page: "test" };
      expect(formatRoute(route)).toBe("/design?page=test");
    });

    it("should format unknown route", () => {
      const route: Route = { type: "unknown", url: "/unknown" };
      expect(formatRoute(route)).toBe("/unknown");
    });

    it("should handle empty page parameter", () => {
      const route: Route = { type: "design", page: "" };
      expect(formatRoute(route)).toBe("/design?page=");
    });
  });

  describe("matchRouteWithParams", () => {
    it("should match route with single parameter", () => {
      const params = matchRouteWithParams("/thread/:threadId", "/thread/123");
      expect(params).toEqual({ threadId: "123" });
    });

    it("should match route with multiple parameters", () => {
      const params = matchRouteWithParams(
        "/user/:userId/post/:postId",
        "/user/123/post/456",
      );
      expect(params).toEqual({ userId: "123", postId: "456" });
    });

    it("should return undefined for non-matching routes", () => {
      const params = matchRouteWithParams("/thread/:threadId", "/post/123");
      expect(params).toBeUndefined();
    });

    it("should return undefined for different segment counts", () => {
      const params = matchRouteWithParams(
        "/thread/:threadId",
        "/thread/123/extra",
      );
      expect(params).toBeUndefined();
    });

    it("should handle empty segments", () => {
      const params = matchRouteWithParams("/thread/:threadId", "/thread/");
      expect(params).toBeUndefined();
    });

    it("should handle static segments", () => {
      const params = matchRouteWithParams(
        "/api/v1/thread/:threadId",
        "/api/v1/thread/123",
      );
      expect(params).toEqual({ threadId: "123" });
    });
  });

  describe("matchRoute", () => {
    it("should match exact routes", () => {
      expect(matchRoute("/thread/123", "/thread/123")).toBe(true);
    });

    it("should match routes with trailing slash", () => {
      expect(matchRoute("/thread/123", "/thread/123/")).toBe(true);
    });

    it("should match routes without trailing slash", () => {
      expect(matchRoute("/thread/123/", "/thread/123")).toBe(true);
    });

    it("should not match different routes", () => {
      expect(matchRoute("/thread/123", "/post/123")).toBe(false);
    });

    it("should handle empty paths", () => {
      expect(matchRoute("", "")).toBe(true);
    });

    it("should handle root path", () => {
      expect(matchRoute("/", "/")).toBe(true);
    });
  });
});
