import React, { ReactNode } from 'react';

type SectionContainerProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: 'section' | 'div' | 'header' | 'footer';
};

export default function SectionContainer({
  children,
  className = '',
  id,
  as: Component = 'section'
}: SectionContainerProps) {
  return (
    <Component
      id={id}
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20 ${className}`}
    >
      {children}
    </Component>
  );
}
