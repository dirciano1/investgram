// app/api/investgram/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// usa Node (mais tempo que Edge)
export const runtime = "nodejs";
// até 60s na Vercel
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento, // "acoes" | "fii" | "etf" | "renda_fixa" | "montar_carteira"
      ativo,            // PETR4, HGLG11, IVVB11, Tesouro IPCA etc. (obrigatório p/ análise de ativo)
      dataAnalise,      // "10/12/2025"
      perfilInvestidor, // "conservador" | "moderado" | "agressivo"
      focoAnalise,      // "dividendos", "crescimento", etc.
      observacao,       // texto opcional
    } = body;

    if (!tipoInvestimento || !perfilInvestidor || !focoAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY não configurada na Vercel");
      return NextResponse.json(
        { error: "Configuração da API ausente." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 1800, // segura o tamanho pra não demorar demais
        temperature: 0.7,
      },
    });

    const data = dataAnalise || "data não informada";
    const obs = observacao && observacao.trim().length > 0 ? observacao : "nenhuma";

    let prompt = "";

    // ==========================
    // 1) MONTAR CARTEIRA
    // ==========================
    if (tipoInvestimento === "montar_carteira") {
      prompt = `
Você é o InvestGram, uma IA especialista em montagem de carteira de investimentos
para investidores brasileiros.

O usuário quer MONTAR UMA CARTEIRA BALANCEADA.

DADOS:
- Perfil do investidor: ${perfilInvestidor}
- Foco principal: ${focoAnalise}
- Data da análise: ${data}
- Observações do usuário: ${obs}

TAREFA:
Monte uma carteira balanceada e bem explicada, seguindo estas regras:

1) Comece com um pequeno RESUMO da estratégia geral da carteira para esse perfil.

2) Traga uma seção "Distribuição por classe de ativos", com porcentagens somando 100%.
   Use classes como (ajuste conforme o perfil):
   - Renda Fixa (Tesouro, CDB, etc.)
   - Ações Brasil
   - Fundos Imobiliários (FIIs)
   - ETFs
   - Exterior (ETFs ou BDRs, se fizer sentido)
   - Caixa / Reserva de oportunidade

3) Para cada classe, traga de 2 a 6 SUGESTÕES de ativos ou tipos de ativos
   (exemplos: "Tesouro IPCA+ 2035", "FII de logística", "ETF de S&P500", etc.),
   sempre deixando claro que são exemplos educacionais.

4) Diferencie bem por perfil:
   - CONSERVADOR: mais renda fixa, baixa volatilidade e foco em proteção.
   - MODERADO: equilíbrio entre renda fixa e renda variável.
   - AGRESSIVO: maior peso em ações, FIIs e exterior, aceitando volatilidade.

5) Inclua uma seção "Riscos e cuidados" explicando os principais riscos
   da carteira proposta para esse perfil.

6) Finalize com "Como usar essa carteira na prática", com dicas de:
   - Aportes mensais
   - Rebalanceamento periódico
   - Importância de não concentrar tudo em um único ativo.

NÃO prometa retorno garantido.
Responda em português do Brasil, de forma didática e direta.
`;
    }

    // ==========================
    // 2) ANÁLISE DE UM ÚNICO ATIVO
    // ==========================
    else {
      if (!ativo || String(ativo).trim().length === 0) {
        return NextResponse.json(
          { error: "Campo 'ativo' é obrigatório para análise de ativo." },
          { status: 400 }
        );
      }

      prompt = `
Você é o InvestGram, IA especialista em análise de investimentos para o mercado brasileiro.

Analise o ativo abaixo com profundidade, trazendo:

1) VISÃO GERAL
   - O que é o ativo (ação, FII, ETF, renda fixa, etc.).
   - Segmento/setor principal.
   - Tipo de estratégia que ele costuma compor na carteira.

2) FUNDAMENTOS (EM ALTO NÍVEL, sem inventar números exatos)
   - Pontos fortes do negócio/ativo.
   - Pontos fracos e riscos (políticos, setoriais, crédito, vacância, etc.).
   - Como esse ativo costuma se comportar em diferentes cenários econômicos.

3) ANÁLISE ALINHADA AO PERFIL "${perfilInvestidor.toUpperCase()}"
   - Por que esse ativo pode ou não fazer sentido para esse perfil.
   - Nível de volatilidade esperado.
   - Papel do ativo dentro de uma carteira desse perfil.

4) FOCO DA ANÁLISE: ${focoAnalise}
   - Se foco for "dividendos" ou "renda_passiva", comente sobre geração de fluxo de caixa.
   - Se foco for "crescimento" ou "valorizacao", comente sobre potencial de crescimento do ativo.
   - Sempre deixe claro que são avaliações gerais, não promessa.

5) QUANDO PODE FAZER SENTIDO TER ESSE ATIVO
   - Situações de mercado em que tende a performar melhor.
   - Situações em que pode sofrer mais.

6) CONCLUSÃO DO INVESTGRAM
   - De forma simples, diga se esse ativo "pode fazer sentido considerar"
     para o perfil e foco informados, reforçando que é apenas uma análise educativa.

DADOS INFORMADOS PELO USUÁRIO:
- Tipo de investimento: ${tipoInvestimento}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise}
- Data da análise: ${data}
- Observação extra: ${obs}

Responda em português do Brasil, com texto bem organizado em seções.
Evite linguagem de recomendação formal (não use "compre", "venda", etc.).
`;
    }

    const result = await model.generateContent(prompt);
    const resp = await result.response;
    const texto = resp.text();

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
      { error: "Erro interno na API do InvestGram." },
      { status: 500 }
    );
  }
}
