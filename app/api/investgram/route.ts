// app/api/investgram/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento, // ações, fii, etf, renda_fixa
      ativo,           // PETR4, HGLG11, IVVB11, Tesouro IPCA+
      perfilInvestidor, // conservador, moderado, agressivo
      focoAnalise,      // dividendos, crescimento, etc
      dataAnalise,      // dd/mm/yyyy
      observacao,       // texto opcional
    } = body;

    // validação básica
    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("Falta GEMINI_API_KEY nas variáveis de ambiente.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    // ================================
    // 🔹 G E M I N I   2.5   F L A S H
    // ================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
- Principais riscos
- Recomendação final baseada no perfil (${perfilInvestidor})
- Estrutura bem organizada em seções e subtítulos.

DADOS DO USUÁRIO:
- Tipo de investimento: ${tipoInvestimento}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise}
- Data da análise: ${dataAnalise}
- Observação extra: ${observacao || "nenhuma"}

IMPORTANTE:
- Seja direto, claro e completo.
- Se o ativo possuir indicadores específicos (ex: vacância em FII), traga.
- Não invente valores absurdamente imprecisos.
- Gere a análise num estilo profissional InvestGram.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    return NextResponse.json(
      {
        sucesso: true,
        resposta: texto, // 👈 nome que o front está esperando
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erro InvestGram API:", err);
    return NextResponse.json(
      { error: "Erro interno na API do InvestGram" },
      { status: 500 }
    );
  }
}
