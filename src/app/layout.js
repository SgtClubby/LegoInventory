// src/app/layout.js

import "./globals.css";
import { LegoProvider } from "@/Context/LegoContext";
import { StatusProvider } from "@/Context/StatusContext";

export const metadata = {
  title: "LEGO Inventory",
  description: "Track your LEGO pieces inventory and needs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body>
        <StatusProvider>
          <LegoProvider>{children}</LegoProvider>
        </StatusProvider>
      </body>
    </html>
  );
}
