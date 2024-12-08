import "@/styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { ClientProvider } from "@/providers/client-provider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Incentive Protocol",
  description: "Manage your use cases and rewards",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} dark`}>
      <body>
        <ClientProvider>
          <Header />
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}
