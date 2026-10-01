import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Poppins, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "../components/ConvexClientProvider";

const cinzel = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "900"] });
const cinzelDeco = Cinzel_Decorative({ variable: "--font-deco", subsets: ["latin"], weight: ["700", "900"] });
const poppins = Poppins({ variable: "--font-body", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const robotoMono = Roboto_Mono({ variable: "--font-mono2", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "RF Frozen Meat Corp — Since 2023",
  description: "Premium frozen meats. Order online, track like Shopee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${cinzel.variable} ${cinzelDeco.variable} ${poppins.variable} ${robotoMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-body">
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('rf-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})` }} />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
