// main/client/ui/src/elements/Table.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

/**
 * A responsive table component with composable sub-components for header, body, rows, and cells.
 *
 * Wrapped in a scrollable container for horizontal overflow on small screens.
 *
 * @example
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Email</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Alice</TableCell>
 *       <TableCell>alice@example.com</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 */
export const Table = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>(
  ({ className = '', ...props }, ref) => (
    <div className="table-container">
      <table ref={ref} className={`table ${className}`.trim()} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

/** Table header section (`<thead>`) with consistent styling. */
export const TableHeader = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'thead'>>(
  ({ className = '', ...props }, ref) => (
    <thead ref={ref} className={`table-header ${className}`.trim()} {...props} />
  ),
);
TableHeader.displayName = 'TableHeader';

/** Table body section (`<tbody>`) with consistent styling. */
export const TableBody = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tbody'>>(
  ({ className = '', ...props }, ref) => (
    <tbody ref={ref} className={`table-body ${className}`.trim()} {...props} />
  ),
);
TableBody.displayName = 'TableBody';

/** Table footer section (`<tfoot>`) with consistent styling. */
export const TableFooter = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tfoot'>>(
  ({ className = '', ...props }, ref) => (
    <tfoot ref={ref} className={`table-footer ${className}`.trim()} {...props} />
  ),
);
TableFooter.displayName = 'TableFooter';

/** Table row (`<tr>`) with consistent styling. */
export const TableRow = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>(
  ({ className = '', ...props }, ref) => (
    <tr ref={ref} className={`table-row ${className}`.trim()} {...props} />
  ),
);
TableRow.displayName = 'TableRow';

/** Table header cell (`<th>`) with consistent styling. */
export const TableHead = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'th'>>(
  ({ className = '', ...props }, ref) => (
    <th ref={ref} className={`table-head ${className}`.trim()} {...props} />
  ),
);
TableHead.displayName = 'TableHead';

/** Table data cell (`<td>`) with consistent styling. */
export const TableCell = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'td'>>(
  ({ className = '', ...props }, ref) => (
    <td ref={ref} className={`table-cell ${className}`.trim()} {...props} />
  ),
);
TableCell.displayName = 'TableCell';

/** Table caption (`<caption>`) with consistent styling. */
export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  ComponentPropsWithoutRef<'caption'>
>(({ className = '', ...props }, ref) => (
  <caption ref={ref} className={`table-caption ${className}`.trim()} {...props} />
));
TableCaption.displayName = 'TableCaption';
