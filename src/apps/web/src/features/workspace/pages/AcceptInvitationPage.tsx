// src/apps/web/src/features/workspace/pages/AcceptInvitationPage.tsx
/**
 * Accept Invitation Page
 *
 * Accepts a workspace invitation using the token from the URL,
 * then redirects to the workspace.
 */

import {
  Alert,
  Button,
  Card,
  Heading,
  Spinner,
  Text,
  useNavigate,
  useSearchParams,
} from '@abe-stack/ui';
import { useEffect, type ReactElement } from 'react';

import { useAcceptInvitation } from '../hooks';

// ============================================================================
// Component
// ============================================================================

export const AcceptInvitationPage = (): ReactElement => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { accept, isLoading, isSuccess, error, data } = useAcceptInvitation({
    onSuccess: (result) => {
      // Redirect to the workspace after a short delay
      setTimeout(() => {
        navigate(`/workspaces/${result.tenantId}`);
      }, 2000);
    },
  });

  useEffect(() => {
    if (token !== null && token.length > 0) {
      accept(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, []);

  if (token === null || token.length === 0) {
    return (
      <div className="py-16 max-w-md mx-auto px-4">
        <Card className="p-6 text-center">
          <Heading as="h2" size="lg" className="mb-4">
            Invalid Invitation
          </Heading>
          <Text tone="muted">No invitation token found. Please check the link and try again.</Text>
          <Button
            type="button"
            variant="text"
            className="mt-4"
            onClick={() => {
              navigate('/workspaces');
            }}
          >
            Go to Workspaces
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-16 max-w-md mx-auto px-4">
      <Card className="p-6 text-center">
        {isLoading && (
          <>
            <Spinner className="mx-auto mb-4" />
            <Heading as="h2" size="lg" className="mb-2">
              Accepting Invitation
            </Heading>
            <Text tone="muted">Please wait while we process your invitation...</Text>
          </>
        )}

        {isSuccess && data !== null && (
          <>
            <Heading as="h2" size="lg" className="mb-2">
              Invitation Accepted
            </Heading>
            <Alert tone="success" className="mb-4">
              {data.message}
            </Alert>
            <Text tone="muted">Redirecting to your workspace...</Text>
          </>
        )}

        {error !== null && (
          <>
            <Heading as="h2" size="lg" className="mb-2">
              Failed to Accept Invitation
            </Heading>
            <Alert tone="danger" className="mb-4">
              {error.message}
            </Alert>
            <Button
              type="button"
              variant="text"
              onClick={() => {
                navigate('/workspaces');
              }}
            >
              Go to Workspaces
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};
