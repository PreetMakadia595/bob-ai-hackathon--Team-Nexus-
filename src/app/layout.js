import "./globals.css";

export const metadata = {
  title: "FleetFlow — Fleet & Logistics Management",
  description:
    "Modern fleet management system for tracking vehicles, drivers, trips, maintenance, and fuel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
