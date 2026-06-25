import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZeroCo — AI-Native Company Builder',
  description: 'Build and govern AI-native companies from zero with digital FTEs, workflows, policies, simulation, and a database-backed operating ledger.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
