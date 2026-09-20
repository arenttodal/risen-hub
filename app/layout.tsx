import type { Metadata } from 'next';
import { IBM_Plex_Sans, Newsreader } from 'next/font/google';
import './globals.css';
import './hub.css';

// Visual system v2: Newsreader carries display and important numbers,
// IBM Plex Sans carries UI and body. See CLAUDE-HANDOFF.md section 3.
const newsreader = Newsreader({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Risen — Farm platform',
  description: 'One shared platform for the Risen farm, its projects, funding, community and public story.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className={`${newsreader.variable} ${plexSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
