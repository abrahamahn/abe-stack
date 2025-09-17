# 🔍 Search Infrastructure Unit Tests

## 📋 Overview

This directory contains unit tests for the search infrastructure components of the application. These tests validate the functionality, performance, and reliability of various search-related features.

## 🛡️ Search Areas Covered

- **📑 Indexing**: Document indexing, update/delete operations
- **🔎 Querying**: Full-text search, filtering, faceted search
- **🔢 Pagination**: Result pagination, offset and cursor-based approaches
- **🔄 Synchronization**: Index maintenance, reindexing operations
- **📊 Aggregations**: Statistical operations, grouping, metrics

## 🧩 Test Files

| File                                             | Description                                        |
| ------------------------------------------------ | -------------------------------------------------- |
| [SearchService.test.ts](./SearchService.test.ts) | Tests for core search service functionality        |
| [SearchIndex.test.ts](./SearchIndex.test.ts)     | Tests for search index creation and management     |
| [QueryBuilder.test.ts](./QueryBuilder.test.ts)   | Tests for search query construction                |
| [SearchFilters.test.ts](./SearchFilters.test.ts) | Tests for filter and facet functionality           |
| [ResultMapper.test.ts](./ResultMapper.test.ts)   | Tests for mapping search results to domain objects |

## 🔍 Key Test Scenarios

### 📑 Document Indexing

- Document creation in index
- Document updates
- Document removal from index
- Batch operations
- Schema validation

### 🔎 Search Functionality

- Exact match searching
- Fuzzy matching
- Phrase searching
- Relevance scoring
- Boosting fields

### 🎯 Advanced Features

- Filtering search results
- Faceted search
- Geospatial search
- Highlighting matched terms
- Suggestions and autocomplete

### 🔢 Pagination and Sorting

- Offset-based pagination
- Cursor-based pagination
- Results sorting
- Custom sort functions
- Result size limits

### 📊 Analytics

- Result aggregations
- Statistical operations
- Metadata extraction
- Search analytics

## 🚀 Running Tests

To run all search tests:

```bash
npm test src/tests/server/unit/infrastructure/search
```

To run a specific test file:

```bash
npm test src/tests/server/unit/infrastructure/search/[test-file-name]
```

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock search engine clients
- Mock document repositories
- Mock index configurations
- Mock query builders

### Common Patterns

```typescript
// Example pattern for testing search functionality
it("should find documents matching search query", async () => {
  // Arrange
  const mockDocuments = [
    { id: "doc1", title: "First document", content: "This is about search" },
    { id: "doc2", title: "Second document", content: "Another topic" },
  ];

  const mockSearchResponse = {
    hits: {
      total: { value: 1 },
      hits: [
        {
          _id: "doc1",
          _source: mockDocuments[0],
          _score: 0.87,
        },
      ],
    },
  };

  mockSearchClient.search.mockResolvedValueOnce(mockSearchResponse);

  const searchService = new SearchService(mockSearchClient);

  // Act
  const results = await searchService.search("search", { index: "documents" });

  // Assert
  expect(results.total).toBe(1);
  expect(results.items).toHaveLength(1);
  expect(results.items[0].id).toBe("doc1");
  expect(mockSearchClient.search).toHaveBeenCalledWith({
    index: "documents",
    body: expect.objectContaining({
      query: expect.anything(),
    }),
  });
});
```

## 📈 Test Coverage

The tests aim to provide comprehensive coverage of:

- ✅ All public methods and functions
- ⚠️ Error handling and edge cases
- 🔍 Search algorithm correctness
- 🛠️ Configuration options and customization
- 🚀 Performance characteristics

## 📝 Adding New Tests

When adding new search features:

1. Create a corresponding test file following the naming convention `[feature].test.ts`
2. Use the existing test structure as a template
3. Cover both successful and failed search scenarios
4. Test with various document types and query complexities
5. Include performance considerations where relevant

## ✅ Best Practices

- 🔄 Mock external search engines for isolation
- 📚 Use representative test data
- 🧩 Test complex queries thoroughly
- 🔍 Verify result relevance and ordering
- ⚠️ Test edge cases (empty results, malformed queries)

## 🔗 Related Components

- [Data](../data/README.md) - For data model integration
- [API](../api/README.md) - For search endpoint integration
- [Caching](../caching/README.md) - For search result caching
