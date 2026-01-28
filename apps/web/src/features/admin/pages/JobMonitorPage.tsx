// apps/web/src/features/admin/pages/JobMonitorPage.tsx
/**
 * JobMonitorPage
 *
 * Admin page for monitoring background job queue.
 */

import { Heading, PageContainer, SidePeek } from '@abe-stack/ui';
import { useState } from 'react';

import { JobDetailsPanel, JobsTable, QueueStatsCard } from '../components';
import { useJobActions, useJobDetails, useJobsList, useQueueStats } from '../hooks';

import type { JobDetails } from '@abe-stack/contracts';
import type { JSX } from 'react';

// ============================================================================
// Component
// ============================================================================

export const JobMonitorPage = (): JSX.Element => {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);

  // Fetch queue stats
  const queueStats = useQueueStats();

  // Fetch jobs list
  const jobsList = useJobsList();

  // Fetch selected job details
  const jobDetails = useJobDetails(selectedJobId);

  // Job actions
  const { retryJob, cancelJob } = useJobActions();

  const handleJobClick = (job: JobDetails): void => {
    setSelectedJobId(job.id);
  };

  const handleCloseDetails = (): void => {
    setSelectedJobId(undefined);
  };

  const handleRetry = async (jobId: string): Promise<void> => {
    await retryJob(jobId);
    // Refetch the job details if it's the selected job
    if (jobId === selectedJobId) {
      void jobDetails.refetch();
    }
  };

  const handleCancel = async (jobId: string): Promise<void> => {
    await cancelJob(jobId);
    // Refetch the job details if it's the selected job
    if (jobId === selectedJobId) {
      void jobDetails.refetch();
    }
  };

  return (
    <PageContainer>
      <Heading as="h1" size="xl" className="mb-6">
        Job Monitor
      </Heading>

      {/* Queue Statistics */}
      <div className="mb-6">
        <QueueStatsCard
          stats={queueStats.data}
          isLoading={queueStats.isLoading}
          isError={queueStats.isError}
          error={queueStats.error}
        />
      </div>

      {/* Jobs Table */}
      <JobsTable
        data={jobsList.data}
        isLoading={jobsList.isLoading}
        isError={jobsList.isError}
        error={jobsList.error}
        selectedStatus={jobsList.filter.status}
        onStatusChange={jobsList.setStatus}
        onPageChange={jobsList.setPage}
        onJobClick={handleJobClick}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />

      {/* Job Details Side Panel */}
      <SidePeek.Root open={selectedJobId !== undefined} onClose={handleCloseDetails}>
        <SidePeek.Content>
          <JobDetailsPanel
            job={jobDetails.data}
            isLoading={jobDetails.isLoading}
            isError={jobDetails.isError}
            error={jobDetails.error}
            onClose={handleCloseDetails}
            onRetry={handleRetry}
            onCancel={handleCancel}
          />
        </SidePeek.Content>
      </SidePeek.Root>
    </PageContainer>
  );
};
