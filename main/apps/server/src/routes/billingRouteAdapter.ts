// main/apps/server/src/routes/billingRouteAdapter.ts
/**
 * Billing Route Adapter
 *
 * Adapts billing module route definitions into server-engine RouteMap format.
 */

import { billingRoutes } from '@abe-stack/core/billing';

import type { BillingBaseRouteDefinition } from '@abe-stack/core/billing';
import type {
  HandlerContext,
  RouteDefinition as DbRouteDefinition,
  RouteMap as DbRouteMap,
} from '@abe-stack/server-engine';
import type { FastifyReply, FastifyRequest } from 'fastify';

export function buildBillingRouteMap(): DbRouteMap {
  const entries: Array<[string, DbRouteDefinition]> = [];

  for (const [path, def] of Object.entries(billingRoutes)) {
    const billingDef: BillingBaseRouteDefinition = def;

    const adaptedHandler = async (
      handlerCtx: HandlerContext,
      body: unknown,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<unknown> => {
      const result = await billingDef.handler(
        handlerCtx as unknown as import('@abe-stack/core/billing').BillingAppContext,
        body,
        req as unknown as import('@abe-stack/core/billing').BillingRequest,
      );
      reply.status(result.status);
      return result.body;
    };

    const routeDef: DbRouteDefinition = {
      method: billingDef.method,
      handler: adaptedHandler,
      isPublic: billingDef.auth === undefined,
    };
    if (billingDef.auth !== undefined) {
      routeDef.roles = [billingDef.auth];
    }
    const schema = billingDef.schema;
    if (schema !== undefined) {
      routeDef.schema = schema as unknown as NonNullable<DbRouteDefinition['schema']>;
    }

    entries.push([path, routeDef]);
  }

  return new Map(entries);
}
