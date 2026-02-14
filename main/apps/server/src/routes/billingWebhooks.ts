// main/apps/server/src/routes/billingWebhooks.ts
/**
 * Billing Webhook Route Registration (app-layer)
 *
 * Fastify/raw-body registration belongs to apps/server runtime composition.
 * Core billing keeps provider verification and event-processing logic.
 */

import { handlePayPalWebhook, handleStripeWebhook } from '@abe-stack/core/billing';
import { HTTP_STATUS } from '@abe-stack/shared';

import type { AppContext } from '@shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export function registerBillingWebhookRoutes(app: FastifyInstance, ctx: AppContext): void {
  if (!ctx.config.billing.enabled) return;

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
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Missing stripe-signature header' });
      }

      if (ctx.config.billing.stripe.secretKey === '') {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: 'Stripe not configured' });
      }

      if (request.rawBody === undefined) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Missing request body' });
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
            db: ctx.db,
            billingEvents: ctx.repos.billingEvents,
            subscriptions: ctx.repos.subscriptions,
            invoices: ctx.repos.invoices,
            plans: ctx.repos.plans,
            customerMappings: ctx.repos.customerMappings,
          },
          ctx.log,
        );

        return await reply.status(HTTP_STATUS.OK).send(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name === 'WebhookSignatureError') {
          return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Invalid webhook signature' });
        }
        if (err.name === 'WebhookEventAlreadyProcessedError') {
          return reply.status(HTTP_STATUS.OK).send({ success: true, message: 'Event already processed' });
        }
        ctx.log.error({ error: err }, 'Stripe webhook error');
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: 'Webhook processing failed' });
      }
    },
  );

  app.post(
    '/api/webhooks/paypal',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const transmissionId = request.headers['paypal-transmission-id'];
      const transmissionTime = request.headers['paypal-transmission-time'];
      const certUrl = request.headers['paypal-cert-url'];
      const transmissionSig = request.headers['paypal-transmission-sig'];

      const signature = JSON.stringify({
        transmissionId,
        transmissionTime,
        certUrl,
        transmissionSig,
      });

      if (ctx.config.billing.paypal.clientId === '') {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: 'PayPal not configured' });
      }

      if (request.rawBody === undefined) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Missing request body' });
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
            db: ctx.db,
            billingEvents: ctx.repos.billingEvents,
            subscriptions: ctx.repos.subscriptions,
            invoices: ctx.repos.invoices,
            plans: ctx.repos.plans,
            customerMappings: ctx.repos.customerMappings,
          },
          ctx.log,
        );

        return await reply.status(HTTP_STATUS.OK).send(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name === 'WebhookSignatureError') {
          return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Invalid webhook signature' });
        }
        if (err.name === 'WebhookEventAlreadyProcessedError') {
          return reply.status(HTTP_STATUS.OK).send({ success: true, message: 'Event already processed' });
        }
        ctx.log.error({ error: err }, 'PayPal webhook error');
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: 'Webhook processing failed' });
      }
    },
  );
}
