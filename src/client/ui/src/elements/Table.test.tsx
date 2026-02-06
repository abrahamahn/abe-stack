// client/ui/src/elements/Table.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';

describe('Table', () => {
  it('renders table structure correctly', () => {
    render(
      <Table>
        <TableCaption>A list of invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByText('A list of invoices.')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('INV001')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('applies custom classes', () => {
    const { container } = render(
      <Table className="custom-table">
        <TableBody>
          <TableRow className="custom-row">
            <TableCell className="custom-cell">Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Note: Table renders a wrapper div, the table element is inside
    const table = container.querySelector('table');
    expect(table).toHaveClass('table');
    expect(table).toHaveClass('custom-table');
    expect(container.querySelector('.table-row')).toHaveClass('custom-row');
    expect(container.querySelector('.table-cell')).toHaveClass('custom-cell');
  });

  it('wraps table in container div', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(container.querySelector('.table-container')).toBeInTheDocument();
    expect(container.querySelector('.table-container table')).toBeInTheDocument();
  });

  it('forwards refs to all table elements', () => {
    const tableRef = { current: null };
    const headerRef = { current: null };
    const bodyRef = { current: null };
    const footerRef = { current: null };
    const rowRef = { current: null };
    const headRef = { current: null };
    const cellRef = { current: null };
    const captionRef = { current: null };

    render(
      <Table ref={tableRef}>
        <TableCaption ref={captionRef}>Caption</TableCaption>
        <TableHeader ref={headerRef}>
          <TableRow>
            <TableHead ref={headRef}>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={bodyRef}>
          <TableRow ref={rowRef}>
            <TableCell ref={cellRef}>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter ref={footerRef}>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(tableRef.current).toBeInstanceOf(HTMLTableElement);
    expect(headerRef.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(bodyRef.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(footerRef.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(rowRef.current).toBeInstanceOf(HTMLTableRowElement);
    expect(headRef.current).toBeInstanceOf(HTMLTableCellElement);
    expect(cellRef.current).toBeInstanceOf(HTMLTableCellElement);
    expect(captionRef.current).toBeInstanceOf(HTMLTableCaptionElement);
  });

  it('applies base classes to all components', () => {
    const { container } = render(
      <Table>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(container.querySelector('.table')).toBeInTheDocument();
    expect(container.querySelector('.table-caption')).toBeInTheDocument();
    expect(container.querySelector('.table-header')).toBeInTheDocument();
    expect(container.querySelector('.table-body')).toBeInTheDocument();
    expect(container.querySelector('.table-footer')).toBeInTheDocument();
    expect(container.querySelector('.table-row')).toBeInTheDocument();
    expect(container.querySelector('.table-head')).toBeInTheDocument();
    expect(container.querySelector('.table-cell')).toBeInTheDocument();
  });

  it('supports HTML attributes on all components', () => {
    render(
      <Table data-testid="table">
        <TableHeader data-testid="header">
          <TableRow data-testid="header-row">
            <TableHead scope="col" data-testid="head">
              Name
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody data-testid="body">
          <TableRow data-testid="body-row">
            <TableCell colSpan={2} data-testid="cell">
              Value
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.getByTestId('head')).toHaveAttribute('scope', 'col');
    expect(screen.getByTestId('cell')).toHaveAttribute('colspan', '2');
  });
});
