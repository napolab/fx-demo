'use client';

import { useRouter } from 'next/navigation';
import { RouterProvider } from 'react-aria-components';
import type { ReactNode } from 'react';

declare module 'react-aria-components' {
  interface RouterConfig {
    href: string;
  }
}

type ProvidersProps = {
  children: ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  const router = useRouter();

  return <RouterProvider navigate={router.push}>{children}</RouterProvider>;
};
