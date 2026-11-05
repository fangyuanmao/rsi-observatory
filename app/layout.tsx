import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'RSI Paper Observatory',description:'Track research on recursive self-improvement and self-evolving agents'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GB"><body>{children}</body></html>}
