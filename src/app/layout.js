// src/app/layout.js

import "./globals.css";
import { LegoStateProvider } from "@/Context/LegoStateContext";
import { StatusProvider } from "@/Context/StatusContext.tsx";
import { ModalProvider } from "./Context/ModalContext";

export const metadata = {
  title: "LEGO Inventory",
  description: "Track your LEGO pieces inventory and needs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body>
        <ModalProvider>
          <StatusProvider>
            <LegoStateProvider>{children}</LegoStateProvider>
          </StatusProvider>
        </ModalProvider>
      </body>
    </html>
  );
}
