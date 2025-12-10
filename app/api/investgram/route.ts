// app/api/investgram/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  // Isso aparece só no log da Vercel
  console.error("⚠️ GEMINI_API_KEY não configurada nas variáveis de ambiente.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento,   // "acoes" | "fii" | "etf" | "renda_fixa" | "carteira_balanceada"
      ativo,              // PETR4, HGLG11, etc (não obrigatório p/ carteira_balanceada)
      dataAnalise,        // "10/12/2025"
      perfilInvestidor,   // "conservador" | "moderado" | "agressivo"
      focoAnalise,        // "dividendos" | "crescimento" | etc (opcional)
      observacao,         // texto extra opcional
    } = body;

    if (!tipoInvestimento || !perfilInvestidor || !dataAnalise) {
      return NextResponse.json(
        { error: "tipoInvestimento, perfilInvestidor e dataAnalise são obrigatórios." },
        { status: 400 }
      );
    }

    // Para qualquer coisa que NÃO seja "montar carteira", ativo é obrigatório
    if (tipoInvestimento !== "carteira_balanceada" && !ativo) {
      return NextResponse.json(
        { error: "O campo 'ativo' é obrigatório para esse tipo de investimento." },
        { status: 400 }
      );
    }

    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt: string;

    // ==========================
    // CASO 1: MONTAR CARTEIRA
    // ==========================
    if (tipoInvestimento === "carteira_balanceada") {
      prompt = `
Você é o InvestGram, IA especialista em alocação de carteira.

Monte uma CARTEIRA BALANCEADA em porcentagem (%) do capital total,
considerando:

- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise || "equilíbrio entre risco e retorno"}
- Data da análise: ${dataAnalise}
- Contexto extra do usuário: ${observacao || "nenhum"}

Regras da resposta:
1. Divida em GRANDES CLASSES de ativos, por exemplo:
   - Renda fixa (pós, prefixado, IPCA)
   - Ações Brasil
   - FIIs (fundos imobiliários)
   - ETFs (Brasil e/ou exterior)
   - Caixa / reserva de oportunidade
2. Para cada classe:
   - Informe a porcentagem ideal (%)
   - Explique a lógica dessa classe para o perfil ${perfilInvestidor}
   - Sugira 2 ou 3 exemplos de ativos / tipos, sem tratar como recomendação definitiva.
3. Mostre:
   - Versão resumida da carteira em forma de tabela ou lista organizada
   - Possíveis ajustes caso o investidor queira mais segurança ou mais risco
4. Termine com um lembrete claro:
   - É uma análise educacional, não uma recomendação formal de investimento.
`;
    }

    // ==========================
    // CASO 2: ANALISAR UM ATIVO
    // ==========================
    else {
      prompt = `
Você é o InvestGram, IA especialista em análise de investimentos.

Analise o ativo abaixo com profundidade, gerando uma análise clara, organizada
e profissional, em português do Brasil.

DADOS:
- Tipo de investimento: ${tipoInvestimento}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise || "análise completa do ativo"}
- Data da análise: ${dataAnalise}
- Observação extra do usuário: ${observacao || "nenhuma"}

Na resposta, siga esta estrutura:

1. Visão geral do ativo
2. Principais pontos fundamentais (sem inventar números absurdos)
3. Pontos fortes
4. Principais riscos
5. Como esse ativo se encaixa no perfil ${perfilInvestidor}
6. Interpretação específica com foco em: ${focoAnalise || "análise geral"}
7. Conclusão final:
   - Compra, manter, observar, reduzir exposição, etc. (sempre com justificativa)
8. Aviso final:
   - Lembrar que é uma análise educacional e não substitui consultoria profissional.
`;
    }

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
  } catch (err: any) {
    console.error("Erro InvestGram API:", err);
    return NextResponse.json(
      {
        error: "Erro interno na API do InvestGram.",
        detalhe: err?.message || "Sem mensagem detalhada.",
      },
      { status: 500 }
    );
  }
}
