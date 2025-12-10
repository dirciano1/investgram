// app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "InvestGram - Analisador de Investimentos com IA",
  description:
    "InvestGram analisa ações, FIIs, ETFs e renda fixa com inteligência artificial, trazendo dados fundamentais, técnicos e recomendações personalizadas.",
  themeColor: "#22c55e",
  openGraph: {
    title: "InvestGram - Analisador Inteligente de Ativos",
    description:
      "Analise ativos de forma avançada com IA: dividendos, múltiplos, fundamentos, risco e projeções.",
    type: "website",
    url: "https://investgram.com.br",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          background: "#0f172a",
          color: "white",
          fontFamily: "Poppins, sans-serif",
          minHeight: "100vh",
          margin: 0,
          padding: 0,
        }}
      >
        {/* FUNDO ANIMADO SUAVE */}
        <div className="bg-animation" />

        {/* CONTEÚDO */}
        {children}
      </body>
    </html>
  );
}
