# @abe-stack/sdk

This package provides a Software Development Kit (SDK) for interacting with the abe-stack API. It is designed to be used in web, desktop, and mobile applications.

## Features

- Type-safe API client built with `@ts-rest/react-query`.
- Data fetching and caching using `@tanstack/react-query`.
- Offline support with persistence and mutation queueing.
- Real-time updates with subscriptions.

## Installation

```bash
pnpm add @abe-stack/sdk
```

## Usage

The SDK provides a React Query client that can be used to interact with the API.

```typescript
import { createAbeStackSdk } from '@abe-stack/sdk';
import { QueryClientProvider } from '@tanstack/react-query';

const sdk = createAbeStackSdk({
  baseUrl: 'http://localhost:3000',
});

function App() {
  return (
    <QueryClientProvider client={sdk.queryClient}>
      {/* Your application components */}
    </QueryClientProvider>
  );
}
```
