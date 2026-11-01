import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "me studio",
  description: "พื้นที่สร้างสรรค์เรื่องราวและจัดการวิดีโอ",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
