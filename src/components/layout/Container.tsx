import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  as?: 'div' | 'header' | 'main' | 'section' | 'footer';
}

/**
 * Shared container component providing identical max-width (max-w-6xl)
 * and horizontal padding (px-4 sm:px-6 lg:px-8) across the Navbar and every page.
 * Guarantees zero horizontal misalignment (CLS = 0 and pixel-perfect edge alignment).
 */
export function Container({
  children,
  className = '',
  as: Component = 'div',
  ...props
}: ContainerProps) {
  return (
    <Component
      className={`max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
