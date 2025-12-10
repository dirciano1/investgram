import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipo,        // ações, fii, etf, renda_fixa
      ativo,       // PETR4, HGLG11, IVVB11, Tesouro IPCA
      perfil,      // conservador, moderado, agressivo
      foco,        // dividendos, crescimento, curto prazo, etc.
      objetivo,    // curto, medio, longo
      data,        // dd/mm/yyyy
      observacao   // texto opcional
    } = body;

    if (!tipo || !ativo || !perfil || !foco || !objetivo) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    // ================================
    // 🔹 G E M I N I   2.5   F L A S H
    // ================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    // ================================
    // 🔹 P R O M P T   D A   A N Á L I S E
    // ================================
    const prompt = `
Você é o InvestGram, IA especialista em análise de investimentos.

Analise o ativo abaixo com profundidade, trazendo:
- Descrição curta do ativo
- Principais números fundamentais
- Indicadores como DY, P/L, P/VP, ROE, dívida, crescimento
- Indicadores técnicos (RSI, MACD, tendência)
- Interpretação com base no foco do investidor
- Riscos
- Recomendação final baseada no perfil (${perfil})
- Estrutura bem organizada em seções

DADOS DO USUÁRIO:
- Tipo de investimento: ${tipo}
- Ativo: ${ativo}
- Perfil do investidor: ${perfil}
- Foco: ${foco}
- Objetivo: ${objetivo}
- Data da análise: ${data}
- Observação extra: ${observacao || "nenhuma"}

IMPORTANTE:
- Seja direto, claro e completo
- Se o ativo possuir indicadores específicos (como vacância no FII), traga
- Não invente valores absurdamente imprecisos
- Gere uma análise no estilo profissional InvestGram
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    return NextResponse.json(
      {
        sucesso: true,
        analise: texto
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("Erro InvestGram API:", err);
    return NextResponse.json(
      { error: "Erro interno na API do InvestGram" },
      { status: 500 }
    );
  }
}
