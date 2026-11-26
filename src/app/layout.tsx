import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Mountains_of_Christmas, Orbitron } from "next/font/google";
import "./globals.css";

// DM Sans sustituye a LL Circular, la tipografía de la marca (docs/estilo.md, apartado 4).
const dmSans = DM_Sans({
  variable: "--font-sans", // shadcn/ui espera la fuente en --font-sans (ver globals.css)
  // latin-ext: la «ō» de «learnby_dō» y «hackan_dō» (la marca) no está en el subconjunto latin.
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Letras de los anuncios de temporada de la home (Google Fonts, licencia OFL). Sin precarga: solo las usan dos títulos.
const orbitron = Orbitron({ variable: "--font-orbitron", subsets: ["latin"], weight: "700", preload: false });
const mountainsOfChristmas = Mountains_of_Christmas({
  variable: "--font-mountains-of-christmas",
  subsets: ["latin"],
  weight: "700",
  preload: false,
  // Turbopack no tiene sus medidas y avisaba en cada petición («Failed to find font override values»):
  // sin respaldo ajustado, con una letra manuscrita del sistema mientras carga.
  adjustFontFallback: false,
  fallback: ["cursive"],
});

export const metadata: Metadata = {
  title: "480 Academy",
  description: "Aprende con un tutor de IA en cada módulo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${geistMono.variable} ${orbitron.variable} ${mountainsOfChristmas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
