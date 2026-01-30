// packages/billing/src/webhooks/routes.ts
/**
 * Webhook Routes
 *
 * Webhooks require special handling:
 * - Raw body access for signature verification
 * - No authentication (verified by provider signature)
 * - Content-Type: application/json (but accessed as raw Buffer)
 *
 * This module uses Fastify types as a peer dependency since webhook
 * routes require framework-specific raw body access.
 */

import { handlePayPalWebhook } from './paypal-webhook';
import { handleStripeWebhook } from './stripe-webhook';

import type { BillingAppContext, BillingLogger } from '../types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Extend FastifyRequest to include rawBody (provided by fastify config)
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register webhook routes on a Fastify instance.
 *
 * These are registered separately from regular routes because they need:
 * - Raw body access for signature verification
 * - No authentication middleware
 *
 * Only registers routes if billing is enabled in the configuration.
 *
 * @param app - Fastify instance to register routes on
 * @param ctx - Application context with billing configuration and repositories
 * @complexity O(1)
 */
export function registerWebhookRoutes(app: FastifyInstance, ctx: BillingAppContext): void {
  // Only register if billing is enabled
  if (!ctx.config.billing.enabled) {
    return;
  }

  const log: BillingLogger = ctx.log;

  // Stripe webhook
  app.post(
    '/api/webhooks/stripe',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'];

      if (typeof signature !== 'string') {
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      if (ctx.config.billing.stripe.secretKey === '') {
        return reply.status(500).send({ error: 'Stripe not configured' });
      }

      if (request.rawBody === undefined) {
        return reply.status(400).send({ error: 'Missing request body' });
      }

      try {
        const result = await handleStripeWebhook(
          request.rawBody,
          signature,
          {
            secretKey: ctx.config.billing.stripe.secretKey,
            publishableKey: ctx.config.billing.stripe.publishableKey,
            webhookSecret: ctx.config.billing.stripe.webhookSecret,
          },
          {
            billingEvents: ctx.repos.billingEvents,
            subscriptions: ctx.repos.subscriptions,
            invoices: ctx.repos.invoices,
            plans: ctx.repos.plans,
            customerMappings: ctx.repos.customerMappings,
          },
          log,
        );

        return await reply.status(200).send(result);
      } catch (error) {
        // Use error name/code checking for reliability across module boundaries
        if (error instanceof Error) {
          if (error.name === 'WebhookSignatureError') {
            return reply.status(400).send({ error: 'Invalid webhook signature' });
          }
          if (error.name === 'WebhookEventAlreadyProcessedError') {
            // Return success for idempotent requests
            return reply.status(200).send({ success: true, message: 'Event already processed' });
          }
        }
        log.error({ error }, 'Stripe webhook error');
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }
    },
  );

  // PayPal webhook
  app.post(
    '/api/webhooks/paypal',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // PayPal sends various headers for signature verification
      // The exact headers depend on the webhook version
      const transmissionId = request.headers['paypal-transmission-id'];
      const transmissionTime = request.headers['paypal-transmission-time'];
      const certUrl = request.headers['paypal-cert-url'];
      const transmissionSig = request.headers['paypal-transmission-sig'];

      // Create signature string for verification
      const signature = JSON.stringify({
        transmissionId,
        transmissionTime,
        certUrl,
        transmissionSig,
      });

      if (ctx.config.billing.paypal.clientId === '') {
        return reply.status(500).send({ error: 'PayPal not configured' });
      }

      if (request.rawBody === undefined) {
        return reply.status(400).send({ error: 'Missing request body' });
      }

      try {
        const result = await handlePayPalWebhook(
          request.rawBody,
          signature,
          {
            clientId: ctx.config.billing.paypal.clientId,
            clientSecret: ctx.config.billing.paypal.clientSecret,
            webhookId: ctx.config.billing.paypal.webhookId,
            sandbox: ctx.config.billing.paypal.sandbox,
          },
          {
            billingEvents: ctx.repos.billingEvents,
            subscriptions: ctx.repos.subscriptions,
            invoices: ctx.repos.invoices,
            plans: ctx.repos.plans,
            customerMappings: ctx.repos.customerMappings,
          },
          log,
        );

        return await reply.status(200).send(result);
      } catch (error) {
        // Use error name/code checking for reliability across module boundaries
        if (error instanceof Error) {
          if (error.name === 'WebhookSignatureError') {
            return reply.status(400).send({ error: 'Invalid webhook signature' });
          }
          if (error.name === 'WebhookEventAlreadyProcessedError') {
            // Return success for idempotent requests
            return reply.status(200).send({ success: true, message: 'Event already processed' });
          }
        }
        log.error({ error }, 'PayPal webhook error');
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }
    },
  );
}
