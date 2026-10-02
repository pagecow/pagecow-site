import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NativeNotifyWebPushPrompt } from "@/native-notify/web/NativeNotifyWebPush";
import { NN_APP_ID, NN_WEB_KEY } from "@/native-notify/web/nativeNotifyIds";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PageCOW — Distraction-Free Browser for Study",
  description:
    "PageCOW is a desktop browser that blocks social media, news, entertainment, and AI-heavy sites. Only approved study-focused sites are allowed. Download for Mac, Windows, and Linux.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <NativeNotifyWebPushPrompt appId={NN_APP_ID} webKey={NN_WEB_KEY} />
      </body>
    </html>
  );
}
