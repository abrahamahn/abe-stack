export type ClientPubsubMessage =
  | { type: "subscribe"; key: string }
  | { type: "unsubscribe"; key: string };

export type ServerPubsubMessage = {
  type: "update";
  key: string;
  value: unknown;
};

export type PubSubEvent = {
  type: string;
  data?: unknown;
};

export type PubSubCallback = (event: PubSubEvent) => void | Promise<void>;

export type PubSubUnsubscribe = () => void;
