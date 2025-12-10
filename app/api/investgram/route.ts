import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Nomes vindos do front (page.tsx)
    const {
      tipoInvestimento, // "acoes" | "fii" | "etf" | "renda_fixa"
      ativo,            // PETR4, HGLG11, IVVB11, Tesouro IPCA+
      perfilInvestidor, // "conservador" | "moderado" | "agressivo"
      focoAnalise,      // "dividendos" | "valorizacao" | "crescimento" | "renda_passiva"
      dataAnalise,      // dd/mm/yyyy (texto)
      observacao,       // opcional
    } = body;

    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando (tipo, ativo, perfil, foco, data)." },
        { status: 400 }
      );
    }

    // Só pra ter algo em "objetivo" no prompt (já que tiramos do form)
    const objetivo = "não informado";

    // --- checagem da chave ---
    if (!process.env.GEMINI_API_KEY) {
      console.error("Faltando GEMINI_API_KEY no ambiente.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    // ================================
    // 🔹 GEMINI 2.5 FLASH
    // ================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ================================
    // 🔹 PROMPT DA ANÁLISE
    // ================================
    const prompt = `
Você é o InvestGram, IA especialista em análise de investimentos.

Analise o ativo abaixo com profundidade, trazendo:
- Descrição curta do ativo
- Principais números fundamentais (preço, DY, P/L, P/VP, ROE, endividamento, crescimento etc.)
- Para FII, se existir: vacância, tipo de portfólio, qualidade dos imóveis/créditos
- Para ETFs: qual índice replica, principais posições, taxa de administração
- Para renda fixa: tipo de título, indexador, taxa, prazo, liquidez e riscos do emissor
- Indicadores técnicos em alto nível (tendência, volatilidade, zonas de suporte/resistência se fizer sentido)
- Interpretação com base no foco do investidor
- Principais riscos
- Recomendação final baseada no perfil (${perfilInvestidor})
- Estrutura bem organizada em seções, em português.

DADOS DO USUÁRIO (NÃO INVENTE DEMAIS, USE VALORES REALISTAS):
- Tipo de investimento: ${tipoInvestimento}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco: ${focoAnalise}
- Objetivo: ${objetivo}
- Data da análise: ${dataAnalise}
- Observação extra: ${observacao || "nenhuma"}

Responda em texto corrido, organizado por seções com títulos claros (ex: "Resumo do Ativo", "Fundamentos", "Análise Técnica", "Riscos", "Conclusão para o investidor").
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    // 👇 agora bate com o que o front espera: "resposta"
    return NextResponse.json(
      {
        sucesso: true,
        resposta: texto,
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
