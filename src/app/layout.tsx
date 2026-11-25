import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextStep - One-on-One AI Task Planning Chatbot",
  description: "Turn overwhelming to-do lists into a realistic daily plan. Answer: What should I do next?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-800">
        {children}
      </body>
    </html>
  );
}
