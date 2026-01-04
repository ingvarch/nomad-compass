import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastContainer } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nomad Compass',
  description: 'A web UI for managing Hashicorp Nomad clusters',
};

const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === 'system' && systemDark) || (!theme && systemDark)) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
      </body>
      </html>
  );
}
