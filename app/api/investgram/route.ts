import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento, // "acoes" | "fii" | "etf" | "renda_fixa"
      ativo,            // "PETR4", "HGLG11" etc.
      perfilInvestidor, // "conservador" | "moderado" | "agressivo"
      focoAnalise,      // "dividendos" | "crescimento" | ...
      dataAnalise,      // "10/12/2025"
      observacao,       // opcional
    } = body;

    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Você é o InvestGram, uma IA especialista em análise de investimentos na Bolsa brasileira.

Analise o ativo abaixo com profundidade, trazendo:

1. Resumo rápido do ativo (o que é, setor, papel na carteira).
2. Principais números fundamentais (se fizer sentido para o tipo):
   - Dividend Yield
   - P/L
   - P/VP
   - ROE
   - Nível de endividamento
   - Crescimento de receita e lucro (se houver)
3. Pontos de destaque positivos e negativos.
4. Adapte a análise ao perfil do investidor (${perfilInvestidor}) e ao foco (${focoAnalise}).
5. Liste riscos principais de forma clara.
6. Traga uma conclusão final no formato:
   - "Resumo para o investidor ${perfilInvestidor} com foco em ${focoAnalise}: ..."
   - Diga se o ativo faz mais sentido como: posição pequena, média ou alta na carteira para esse perfil.
7. Use seções bem separadas com títulos e listas.

DADOS INFORMADOS PELO USUÁRIO:
- Tipo de investimento: ${tipoInvestimento}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise}
- Data da análise: ${dataAnalise}
- Observação extra: ${observacao || "nenhuma observação adicional"}

IMPORTANTE:
- Não invente números absurdos ou específicos demais como se fossem dados oficiais exatos.
- Use valores aproximados e linguagem de "em geral / historicamente / normalmente".
- Mantenha o tom profissional, didático e objetivo, como um relatório de casa de análise.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    return NextResponse.json(
      {
        sucesso: true,
        analise: texto,
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
