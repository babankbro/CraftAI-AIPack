import type { Metadata } from "next";
import { Prompt, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  weight: ["500", "600", "700"],
  subsets: ["thai", "latin"],
});

const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai",
  weight: ["400", "500", "600"],
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ALPR — ระบบตรวจประเมินแผนการสอน AIPACK",
  description:
    "ระบบตรวจประเมินแผนการจัดการเรียนรู้แบบบูรณาการ AIPACK · โครงการพัฒนา RL & CT จ.กาฬสินธุ์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${ibmPlexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
