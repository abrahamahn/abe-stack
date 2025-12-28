# 🧪 Job Storage Unit Tests

## 📋 Overview

This directory contains unit tests for the job storage components of the background job system. The tests validate the persistence mechanisms used to store and retrieve job information across application restarts.

## 🧩 Test Files

| File                                               | Description                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [FileJobStorage.test.ts](./FileJobStorage.test.ts) | Tests the file-based storage implementation for job persistence                            |
| [IJobStorage.test.ts](./IJobStorage.test.ts)       | Tests the job storage interface contract to ensure implementations conform to requirements |

## 🔍 Key Test Scenarios

### Job Persistence

- Job data serialization
- Job data storage
- Job metadata tracking
- Job state persistence
- Storage initialization
- Storage cleanup

### Job Retrieval

- Retrieving pending jobs
- Retrieving completed jobs
- Retrieving failed jobs
- Filtering by job type
- Sorting by creation date
- Pagination support

### Concurrency

- Concurrent job storage
- Atomic operations
- Race condition prevention
- Transaction support
- Lock management

### Error Handling

- Storage corruption recovery
- Invalid data handling
- Disk space limitations
- Permission issues
- File locking conflicts

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock file system
- Sample job data
- Mock serializers
- Timestamp manipulation

### Common Patterns

```typescript
// Example pattern for testing job storage and retrieval
it("should store and retrieve jobs correctly", async () => {
  // Arrange
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-storage-test-"));
  const jobStorage = new FileJobStorage({ storagePath: tempDir });

  const job = {
    id: "test-job-1",
    type: "email-notification",
    data: { recipient: "user@example.com", subject: "Test Email" },
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Act
  await jobStorage.saveJob(job);
  const retrievedJob = await jobStorage.getJob("test-job-1");

  // Assert
  expect(retrievedJob).toEqual(job);

  // Cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
});

// Example pattern for testing job listing
it("should list pending jobs", async () => {
  // Arrange
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-storage-test-"));
  const jobStorage = new FileJobStorage({ storagePath: tempDir });

  // Create test jobs with different statuses
  const pendingJob1 = createTestJob("pending-job-1", "pending");
  const pendingJob2 = createTestJob("pending-job-2", "pending");
  const completedJob = createTestJob("completed-job", "completed");
  const failedJob = createTestJob("failed-job", "failed");

  await jobStorage.saveJob(pendingJob1);
  await jobStorage.saveJob(pendingJob2);
  await jobStorage.saveJob(completedJob);
  await jobStorage.saveJob(failedJob);

  // Act
  const pendingJobs = await jobStorage.listJobs({ status: "pending" });

  // Assert
  expect(pendingJobs).toHaveLength(2);
  expect(pendingJobs.map((j) => j.id)).toEqual(
    expect.arrayContaining(["pending-job-1", "pending-job-2"]),
  );

  // Cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

## 📚 Advanced Testing Techniques

### Durability Testing

- Application restart simulation
- Power failure recovery
- Partial write handling
- File rotation and archiving

### Performance Testing

- Large job volume handling
- Retrieval speed optimization
- Storage size optimization
- Indexing and searching

### Security Testing

- Sensitive data handling
- Storage encryption
- Access control
- Secure deletion

## 🔗 Related Components

- [Jobs](../README.md) - For the main job system tests
- [Files](../../files/README.md) - For file system operations
- [Database](../../database/README.md) - For alternative database-backed storage
