import "./globals.css";

export const metadata = {
  title: "SupplyShield — Fleet & Logistics Management",
  description:
    "Modern fleet management and supply chain disruption optimization system for tracking vehicles, drivers, trips, cold chain, and disruptions.",
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
