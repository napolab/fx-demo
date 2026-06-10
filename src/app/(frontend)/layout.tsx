import '../../styles/globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'fluid-simulation',
  description: 'WebGPU/WGSL fluid simulation VJ canvas with webcam + mouse interaction',
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="ja">
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
