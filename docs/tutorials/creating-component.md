# Tutorial: Creating a New React Component

This guide walks you through the process of creating a new React component in ABE Stack.

## 1. Component Structure

ABE Stack organizes components into a logical hierarchy:

- **Atoms**: Basic building blocks (buttons, inputs, etc.)
- **Molecules**: Combinations of atoms (form fields, cards, etc.)
- **Organisms**: Complex UI sections (forms, tables, etc.)
- **Templates**: Page layouts
- **Pages**: Full pages with data integration

## 2. Creating a Basic Component

Let's create a reusable button component:

```tsx
// src/client/components/atoms/Button/Button.tsx
import React from 'react';
import './Button.css'; // We'll create this next

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  children,
}) => {
  return (
    <button
      className={`button button-${variant} button-${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

## 3. Adding Styles

Create a CSS file for your component:

```css
/* src/client/components/atoms/Button/Button.css */
.button {
  font-family: inherit;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  border: none;
  transition: background-color 0.2s, transform 0.1s;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Variants */
.button-primary {
  background-color: #3182ce;
  color: white;
}

.button-secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.button-danger {
  background-color: #e53e3e;
  color: white;
}

.button-success {
  background-color: #38a169;
  color: white;
}

/* Sizes */
.button-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.button-medium {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.button-large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

/* Hover effects */
.button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.button-primary:hover:not(:disabled) {
  background-color: #2b6cb0;
}

.button-secondary:hover:not(:disabled) {
  background-color: #cbd5e0;
}

.button-danger:hover:not(:disabled) {
  background-color: #c53030;
}

.button-success:hover:not(:disabled) {
  background-color: #2f855a;
}
```

## 4. Creating an Index File

For easier imports, create an index file:

```tsx
// src/client/components/atoms/Button/index.ts
export { Button } from './Button';
```

## 5. Building a More Complex Component

Now, let's create a card component (molecule) that uses our button:

```tsx
// src/client/components/molecules/Card/Card.tsx
import React from 'react';
import { Button } from '../../atoms/Button';
import './Card.css';

interface CardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  imageUrl,
  description,
  actionText = 'Learn More',
  onAction,
}) => {
  return (
    <div className="card">
      {imageUrl && (
        <div className="card-image-container">
          <img src={imageUrl} alt={title} className="card-image" />
        </div>
      )}
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {description && <p className="card-description">{description}</p>}
        {onAction && (
          <div className="card-actions">
            <Button variant="primary" size="small" onClick={onAction}>
              {actionText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
```

## 6. Add CSS for the Card Component

```css
/* src/client/components/molecules/Card/Card.css */
.card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.card-image-container {
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  padding: 1rem;
}

.card-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.card-subtitle {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.875rem;
}

.card-description {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 0.875rem;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}
```

## 7. Using the Component in a Page

Now you can use your components in a page:

```tsx
// src/client/pages/Products/ProductsPage.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '../../components/molecules/Card';
import { fetchProducts } from '../../services/api';
import './ProductsPage.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await fetchProducts();
        setProducts(data);
        setError(null);
      } catch (err) {
        setError('Failed to load products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="products-page">
      <h1>Our Products</h1>
      <div className="products-grid">
        {products.map((product) => (
          <Card
            key={product.id}
            title={product.name}
            subtitle={`$${product.price.toFixed(2)}`}
            imageUrl={product.imageUrl}
            description={product.description}
            actionText="View Details"
            onAction={() => window.location.href = `/products/${product.id}`}
          />
        ))}
      </div>
    </div>
  );
};
```

## 8. Testing Your Component

Create a test file for your component:

```tsx
// src/client/components/atoms/Button/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button component', () => {
  test('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('button-primary');
    expect(button).toHaveClass('button-medium');
    expect(button).not.toBeDisabled();
  });

  test('applies variant and size classes', () => {
    render(<Button variant="danger" size="large">Delete</Button>);
    
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('button-danger');
    expect(button).toHaveClass('button-large');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('handles disabled state', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

## 9. Best Practices for Components

- **Keep components focused**: Each component should do one thing well
- **Use TypeScript interfaces**: Define prop types clearly
- **Default props**: Provide sensible defaults
- **Responsive design**: Ensure components work on all screen sizes
- **Accessibility**: Use semantic HTML and ARIA attributes
- **Testing**: Test all component states and interactions
- **Documentation**: Add comments for complex logic
- **CSS organization**: Use consistent naming conventions
- **Reusability**: Design components to be reused across the application
- **Performance**: Memoize components when necessary with React.memo

## 10. Component Documentation

Consider adding a documentation file for more complex components:

```markdown
# Button Component

A customizable button component with multiple variants and sizes.

## Props

| Name     | Type                                        | Default    | Description                        |
|----------|---------------------------------------------|------------|------------------------------------|
| variant  | 'primary' \| 'secondary' \| 'danger' \| 'success' | 'primary'  | Visual style of the button         |
| size     | 'small' \| 'medium' \| 'large'              | 'medium'   | Size of the button                 |
| onClick  | () => void                                  | undefined  | Function called when button clicked|
| disabled | boolean                                     | false      | Whether the button is disabled     |
| children | React.ReactNode                             | (required) | Button content                     |

## Examples

```jsx
<Button variant="primary" size="medium">
  Click Me
</Button>

<Button variant="danger" disabled>
  Delete
</Button>
```

By following these steps and best practices, you'll create components that are maintainable, reusable, and consistent throughout your application. 