import type { Metadata } from "next";
import { DemoResetButton } from "@/components/DemoResetButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Process Flow PoC V1",
  description: "Process step template and process flow instance proof of concept"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body>
        <TooltipProvider>
          {children}
          <DemoResetButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
