import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Beta AIDA × INVOGO', description: 'Simulador privado de integración en entorno SANDBOX' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
