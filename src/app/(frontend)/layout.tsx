import '../../styles/globals.css';

import { fontVariables } from '@/themes/fonts';
import { typekitLoaderHtml } from '@/themes/typekit';

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
  // suppressHydrationWarning: the inline Typekit loader in <head> mutates
  // documentElement.className (adds wf-loading) before React hydrates, so the
  // live <html> class legitimately differs from this render.
  <html lang="ja" className={fontVariables} suppressHydrationWarning>
    <head>
      {/* Adobe Fonts (Typekit) async loader — non-blocking; adds the wf-loading
          class hook on <html>. Static vendor snippet, no dynamic content. */}
      <script dangerouslySetInnerHTML={typekitLoaderHtml} />
    </head>
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
