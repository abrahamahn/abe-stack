# Tutorial: Adding a New API Endpoint

This guide walks you through the process of creating a new API endpoint in ABE Stack.

## 1. Understanding the Structure

ABE Stack follows a layered architecture for the backend:

- **Routes**: Define URL endpoints and HTTP methods
- **Controllers**: Handle request/response logic
- **Services**: Implement business logic
- **Repositories**: Interact with the database

## 2. Define the Repository

Start by defining how your data will be accessed from the database.

Create a new file in `src/server/repositories`:

```typescript
// src/server/repositories/productRepository.ts
import { db } from '../database/connection';
import { Product } from '../models/Product';

export class ProductRepository {
  async findAll(): Promise<Product[]> {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows;
  }

  async findById(id: string): Promise<Product | null> {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const result = await db.query(
      'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
      [product.name, product.description, product.price]
    );
    return result.rows[0];
  }

  // Add more methods as needed
}

export const productRepository = new ProductRepository();
```

## 3. Create the Service

Next, create the service that will use the repository and implement business logic.

```typescript
// src/server/services/productService.ts
import { Product } from '../models/Product';
import { productRepository } from '../repositories/productRepository';
import { ValidationError } from '../utils/errors';

export class ProductService {
  async getAllProducts(): Promise<Product[]> {
    return productRepository.findAll();
  }

  async getProductById(id: string): Promise<Product> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ValidationError('Product not found');
    }
    return product;
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    // Validate input
    if (!productData.name || !productData.price) {
      throw new ValidationError('Name and price are required');
    }

    if (productData.price <= 0) {
      throw new ValidationError('Price must be greater than zero');
    }

    return productRepository.create(productData);
  }

  // Add more methods as needed
}

export const productService = new ProductService();
```

## 4. Create the Controller

Now, create a controller to handle the HTTP requests and responses.

```typescript
// src/server/controllers/productController.ts
import { Request, Response } from 'express';
import { productService } from '../services/productService';
import { asyncHandler } from '../utils/asyncHandler';

export const productController = {
  getAllProducts: asyncHandler(async (req: Request, res: Response) => {
    const products = await productService.getAllProducts();
    res.json(products);
  }),

  getProductById: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.params.id);
    res.json(product);
  }),

  createProduct: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  }),

  // Add more controller methods as needed
};
```

## 5. Create the Routes

Finally, define the routes that will expose your API endpoints.

```typescript
// src/server/routes/productRoutes.ts
import express from 'express';
import { productController } from '../controllers/productController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected routes
router.post('/', authMiddleware, productController.createProduct);

export default router;
```

## 6. Register the Routes

Add your new routes to the main Express application:

```typescript
// src/server/app.ts (or where you configure your Express app)
import productRoutes from './routes/productRoutes';

// ... existing code ...

app.use('/api/products', productRoutes);

// ... remaining code ...
```

## 7. Create a Data Model

Don't forget to define the data model:

```typescript
// src/server/models/Product.ts
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: Date;
}
```

## 8. Test Your Endpoint

After implementing all the above, you can test your new endpoint:

```bash
# Get all products
curl http://localhost:8080/api/products

# Get a specific product
curl http://localhost:8080/api/products/123

# Create a new product (requires authentication)
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "New Product", "description": "Description", "price": 29.99}'
```

## 9. Add Database Migration (if needed)

If your endpoint requires a new database table, create a migration:

```sql
-- src/server/database/migrations/[timestamp]_create_products.sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Best Practices

- Keep your controllers thin - they should only handle HTTP concerns
- Put business logic in services
- Use repositories for all database interactions
- Add proper validation and error handling
- Write tests for each layer
- Document your API endpoints

By following this pattern, you'll maintain a clean and maintainable codebase as your application grows. 