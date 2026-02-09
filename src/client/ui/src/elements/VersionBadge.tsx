// src/client/ui/src/elements/VersionBadge.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type VersionBadgeProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /**
   * Version string to display
   */
  version: string;
  /**
   * Prefix before version (default: 'v')
   * @default 'v'
   */
  prefix?: string;
};

/**
 * Badge component for displaying version information
 *
 * @example
 * ```tsx
 * <VersionBadge version="1.2.3" />
 * <VersionBadge version="2.0.0" prefix="Version " />
 * ```
 */
export const VersionBadge = forwardRef<HTMLSpanElement, VersionBadgeProps>((props, ref) => {
  const { version, prefix = 'v', className = '', ...rest } = props;

  return (
    <span ref={ref} className={`version-badge ${className}`.trim()} {...rest}>
      {prefix}
      {version}
    </span>
  );
});

VersionBadge.displayName = 'VersionBadge';
