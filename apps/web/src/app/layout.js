import "./globals.css";

export const metadata = {
  title: "ACCI Platform",
  description: "Plataforma educativa cristiana (LMS)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
