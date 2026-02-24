import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { FloatingThemeToggle } from '@/components/ui/FloatingThemeToggle';

export const metadata = {
  title: 'ACCI Platform',
  description: 'Plataforma educativa cristiana (LMS)',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="light" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light">
          {children}
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
