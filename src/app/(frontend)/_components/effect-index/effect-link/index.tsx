'use client';

import { Link } from 'react-aria-components';

import type { ReactNode } from 'react';

type EffectLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

// react-aria-components is client-only, so the interactive Link is isolated
// here as the single CSR boundary; the surrounding list stays a Server Component.
export const EffectLink = ({ href, className, children }: EffectLinkProps) => (
  <Link href={href} className={className}>
    {children}
  </Link>
);
