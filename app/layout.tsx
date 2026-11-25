import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KP & Sons Wholesale — Auth & Verification Portal',
  description: 'Wholesale retailer verification and account approval portal for KP & Sons Wholesale.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
