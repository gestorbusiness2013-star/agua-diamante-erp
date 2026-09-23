import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context';
import { InventoryProvider } from '@/context/inventory-context';
import { DOMGuardian } from '@/components/dom-guardian';

export const metadata: Metadata = {
  title: 'Agua Diamante ERP',
  description: 'ERP for Agua Diamante',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="notranslate" translate="no">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Agua Diamante" />
        <meta name="google" content="notranslate" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="font-body antialiased notranslate" translate="no">
        <DOMGuardian />
        <AuthProvider>
          <InventoryProvider>
            {children}
            <Toaster />
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
