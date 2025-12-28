# 🌐 API Overview

## 📋 Introduction

The ABE Stack provides a RESTful API that serves as the primary interface between the frontend client and the backend services. This document provides an overview of the API architecture, conventions, and usage patterns.

## 🏗️ API Architecture

The API follows RESTful design principles and is organized around resources. It provides a consistent and intuitive interface for client applications to interact with the backend services.

### Key Characteristics

- **Resource-Based**: APIs are organized around resources and follow REST principles
- **JSON Payloads**: All API requests and responses use JSON format
- **Stateless**: No server-side session state is maintained between requests
- **Versioned**: API versioning is included in the URL path
- **Authenticated**: Most endpoints require authentication
- **Rate Limited**: Requests are rate-limited to prevent abuse
- **CORS Enabled**: Cross-Origin Resource Sharing is configured for client access

## 🌍 Base URL

The API is available at the following base URL:

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.abestack.com/api/v1`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints:

1. Obtain a token by authenticating via `/auth/login`
2. Include the token in all subsequent requests in the `Authorization` header:
   ```
   Authorization: Bearer <your_token>
   ```

### Authentication Endpoints

```
POST /api/v1/auth/login          # Obtain access and refresh tokens
POST /api/v1/auth/refresh        # Refresh an expired access token
POST /api/v1/auth/logout         # Invalidate current tokens
```

## 📥 Request Format

### Headers

All requests should include the following headers:

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>  # For authenticated endpoints
```

### Body

For `POST`, `PUT`, and `PATCH` requests, the request body should be a valid JSON object:

```json
{
  "property1": "value1",
  "property2": "value2"
}
```

## 📤 Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    /* Response data */
  }, // For successful requests
  "error": {
    /* Error details */
  }, // For failed requests
  "meta": {
    // Metadata about the response
    "requestId": "abc123",
    "timestamp": "2023-10-20T15:30:45Z"
  }
}
```

### Success Responses

For successful requests, the `success` field is `true` and the response data is included in the `data` field:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Example Item",
    "createdAt": "2023-10-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2023-10-20T15:30:45Z"
  }
}
```

### Error Responses

For failed requests, the `success` field is `false` and the error details are included in the `error` field:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "meta": {
    "requestId": "req_def456",
    "timestamp": "2023-10-20T15:31:22Z"
  }
}
```

## 🔢 HTTP Status Codes

The API uses standard HTTP status codes to indicate the success or failure of requests:

| Status Code | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| 200         | OK - The request was successful                                    |
| 201         | Created - A new resource was created successfully                  |
| 204         | No Content - The request was successful but no content is returned |
| 400         | Bad Request - The request was invalid or cannot be served          |
| 401         | Unauthorized - Authentication is required or failed                |
| 403         | Forbidden - The authenticated user doesn't have permission         |
| 404         | Not Found - The requested resource does not exist                  |
| 422         | Unprocessable Entity - Validation error                            |
| 429         | Too Many Requests - Rate limit exceeded                            |
| 500         | Internal Server Error - An error occurred on the server            |

## 📋 Pagination

List endpoints support pagination through query parameters:

```
GET /api/v1/users?page=2&limit=20
```

Paginated responses include pagination metadata in the response:

```json
{
  "success": true,
  "data": [
    /* Array of items */
  ],
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 20,
      "totalItems": 156,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": true
    },
    "requestId": "req_ghi789",
    "timestamp": "2023-10-20T15:32:10Z"
  }
}
```

## 🔍 Filtering and Sorting

Many list endpoints support filtering and sorting through query parameters:

```
GET /api/v1/users?role=admin&sort=createdAt:desc
```

Multiple filters can be combined:

```
GET /api/v1/products?category=electronics&minPrice=100&maxPrice=500
```

## 🔎 Search

Some endpoints support text search functionality:

```
GET /api/v1/products?search=wireless+headphones
```

## 🔄 Partial Updates

For updating resources, the API supports both `PUT` (full resource update) and `PATCH` (partial resource update):

```
PUT /api/v1/users/123    # Replace the entire user resource
PATCH /api/v1/users/123  # Update only specific fields
```

## 📏 Rate Limiting

API requests are rate-limited to prevent abuse. The current limits are:

- **Authenticated requests**: 60 requests per minute
- **Unauthenticated requests**: 20 requests per minute

Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1697815200
```

## 📁 File Uploads

For file uploads, use multipart form data:

```
POST /api/v1/documents
Content-Type: multipart/form-data

form data:
  - file: [binary data]
  - type: "invoice"
  - description: "October Invoice"
```

## 📦 Versioning

The API uses URL path versioning to ensure backward compatibility:

```
/api/v1/users  # Version 1 of the users API
/api/v2/users  # Version 2 of the users API (when available)
```

## 📚 API Documentation

Detailed API documentation is available using OpenAPI/Swagger:

- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://api.abestack.com/api-docs`

## 🚦 Health Check

A health check endpoint is available to verify API availability:

```
GET /health

Response:
{
  "status": "ok",
  "version": "1.2.3",
  "timestamp": "2023-10-20T15:35:00Z"
}
```

## 🛠️ Error Handling Best Practices

When working with the API, follow these error handling best practices:

1. Always check the `success` field to determine if the request was successful
2. Handle 401 errors by refreshing the access token or redirecting to login
3. Implement exponential backoff for retrying failed requests
4. Display user-friendly messages based on error codes
5. Log detailed error information for debugging

## 📚 Further Reading

- Detailed API endpoints documentation (coming soon)
- Authentication details (coming soon)
