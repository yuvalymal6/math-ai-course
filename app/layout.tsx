import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "מתמטיקה עם AI | קורס מתקדם",
  description: "למד מתמטיקה בשיטה החדשה עם עוזר AI אישי. קורס מקיף שמלמד אותך כיצד להשתמש בבינה מלאכותית ללמידת מתמטיקה.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
