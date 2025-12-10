import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";      // para fugir do limite de 25s do Edge
export const maxDuration = 60;        // segurança extra no Vercel

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento,
      ativo,
      dataAnalise,
      perfilInvestidor,
      focoAnalise,
      observacao,
    } = body;

    // Normaliza strings
    const tipo = String(tipoInvestimento || "").toLowerCase();
    const perfil = String(perfilInvestidor || "").toLowerCase();
    const foco = String(focoAnalise || "").toLowerCase();
    const data = String(dataAnalise || "").trim();

    if (!tipo || !ativo || !perfil) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando (tipo, ativo ou perfil)." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // Se o seu plano tiver Grounding com Google Search, isso ativa busca na web
      tools: [{ googleSearch: {} }],
    });

    // Regras gerais para números
    const instrucoesNumeros = `
REGRAS IMPORTANTES PARA NÚMEROS:
- Sempre que possível, use Google Search para buscar dados ATUAIS do ativo.
- Foque em fontes brasileiras de finanças (B3, Status Invest, Fundamentus, sites de bancos, etc).
- Se não conseguir um número confiável, NÃO escreva "não encontrado" nem "data futura".
- Em vez disso, use algo como "não disponível com segurança" ou comente qualitativamente.
- Não invente números aleatórios só para preencher tabela.
`;

    let prompt = "";

    // ==========================
    // 1) AÇÕES / FII / ETF
    // ==========================
    if (tipo === "acoes" || tipo === "fii" || tipo === "etf") {
      prompt = `
Você é o InvestGram, IA especialista em análise de ativos da B3 (ações, FIIs e ETFs).

${instrucoesNumeros}

OBJETIVO:
- Gerar uma análise COMPLETA e ao mesmo tempo prática do ativo solicitado.
- A análise deve respeitar o perfil do investidor (${perfil}) e o foco (${foco || "não informado"}).

PASSO 1 – MONTE UMA TABELA RÁPIDA COM NÚMEROS (SEM MARCAR COMO "DATA FUTURA"):
Use dados ATUAIS aproximados. Campos esperados (quando possível):
- Preço atual aproximado (R$)
- Variação no dia (%)
- Dividend Yield 12 meses (%)
- Dividendos 12 meses (R$ por ação/cota)
- P/L
- P/VP
- ROE (%)
- Margem líquida (%)
- Dívida Líquida / EBITDA (se fizer sentido para o ativo)
- Setor / segmento
- Valor de mercado aproximado (R$ bilhões)

Se algum dado não estiver disponível com segurança, escreva algo como:
- "Dividend Yield 12 meses: não disponível com segurança (manter análise qualitativa)".

PASSO 2 – ESTRUTURE A ANÁLISE EM SEÇÕES COM TÍTULOS E EMOJIS:
Use esse formato:

🏦 VISÃO GERAL  
Explique o que é o ativo, setor, estratégia, tipo (por exemplo: banco, empresa de commodities, FII logístico, FII de escritórios etc).

📊 FUNDAMENTOS  
– Qualidade de receita e lucros  
– Alavancagem / endividamento  
– Margens, ROE, estabilidade do negócio  

💰 DIVIDENDOS  
– Padrão histórico de pagamento  
– Regularidade e previsibilidade  
– Se o ativo é mais "renda" ou mais "crescimento"

⚖️ RISCO x RETORNO  
– Volatilidade  
– Riscos específicos (setor, governo, regulação, vacância, juros, dólar etc)  
– Pontos de atenção para o investidor

🎯 CONCLUSÃO PARA PERFIL ${perfil.toUpperCase()}  
– Fale se o ativo combna mais com conservador, moderado ou agressivo  
– Diga se faz mais sentido para renda, crescimento ou equilíbrio  
– Sugira um papel dentro de uma carteira (por exemplo: "posição satélite", "posição core", etc)

DADOS INFORMADOS PELO USUÁRIO:
- Tipo de investimento: ${tipo}
- Ativo: ${ativo}
- Perfil do investidor: ${perfil}
- Foco declarado: ${foco || "não informado"}
- Data informada na tela: ${data || "não informada (use data atual da consulta)"}
- Observação extra: ${observacao || "nenhuma"}
      `.trim();
    }

    // ==========================
    // 2) MONTAR CARTEIRA
    // (qualquer tipo que contenha "carteira")
    // ==========================
    else if (tipo.includes("carteira")) {
      prompt = `
Você é o InvestGram, IA especialista em montagem de carteiras balanceadas.

TAREFA:
Montar uma carteira bem diversificada para um investidor com perfil ${perfil.toUpperCase()}, com foco em "${foco || "objetivo não especificado"}".

A carteira deve ser dividida EM PERCENTUAIS entre as grandes classes de ativos, por exemplo:
- Renda fixa pós-fixada (CDI)
- Renda fixa IPCA+
- Ações Brasil (setores diversos)
- FIIs
- ETFs internacionais
- Caixa (reserva)

Regras:
- A soma dos percentuais deve dar 100%.
- Adapte a agressividade dos percentuais ao perfil:
  - Conservador: mais renda fixa segura, menos renda variável
  - Moderado: equilíbrio entre renda fixa e variável
  - Agressivo: maior peso em ações / FIIs / exterior
- Considere o foco da análise como direcionador (ex: "foco em dividendos", "crescimento", "proteção contra inflação").

FORMATO DA RESPOSTA:
1) TABELA RESUMO DA CARTEIRA (classe x percentual)  
2) EXPLICAÇÃO CURTA POR CLASSE (por que esse peso faz sentido)  
3) ALERTAS E CUIDADOS (volatilidade, horizonte de tempo sugerido)  
4) CONCLUSÃO resumindo o "espírito" da carteira para o perfil ${perfil.toUpperCase()}.

Dados que o usuário informou:
- Tipo de investimento selecionado: ${tipoInvestimento}
- Perfil: ${perfil}
- Foco: ${foco || "não informado"}
- Data da análise: ${data || "não informada"}
- Observação extra do usuário: ${observacao || "nenhuma"}
      `.trim();
    }

    // ==========================
    // 3) RENDA FIXA (CDB, Tesouro, etc.)
    // ==========================
    else if (tipo === "renda_fixa") {
      prompt = `
Você é o InvestGram, IA especialista em renda fixa brasileira.

O usuário está analisando um investimento de renda fixa cujo identificador informado foi: "${ativo}".

${instrucoesNumeros}

TRAGA:
1) Visão geral do produto informado (ex: CDB de banco médio, Tesouro IPCA+, debênture, LCI/LCA etc).  
2) Principais características:
   - Indexador (CDI, Selic, IPCA, prefixado)
   - Prazo médio
   - Liquidez (D+0, D+30, somente no vencimento etc)
   - Nível de risco do emissor (banco grande, banco médio, empresa privada etc)
3) Tabela com números aproximados:
   - Taxa bruta (% ao ano)
   - Taxa líquida estimada pós imposto (se tiver IR)
   - Rentabilidade real estimada (acima da inflação), se fizer sentido
4) Análise para o perfil ${perfil.toUpperCase()}:
   - O quão adequado é esse ativo para esse perfil
   - Em que parte da carteira poderia entrar (reserva de oportunidade, colchão de segurança, etc)
5) Riscos e pontos de atenção.

Use o foco declarado pelo usuário como orientação (ex: "renda passiva", "proteção contra inflação", "liquidez"):

- Foco informado: ${foco || "não informado"}

Outros dados:
- Data da análise digitada: ${data || "não informada"}
- Observação extra: ${observacao || "nenhuma"}
      `.trim();
    }

    // ==========================
    // 4) QUALQUER OUTRO TIPO GENÉRICO
    // ==========================
    else {
      prompt = `
Você é o InvestGram, IA especialista em investimentos.

Gere uma análise organizada para o ativo "${ativo}", levando em conta:
- Tipo/estratégia selecionado: ${tipo}
- Perfil do investidor: ${perfil}
- Foco: ${foco || "não informado"}
- Data informada: ${data || "não informada"}
- Observação: ${observacao || "nenhuma"}

Estruture com seções e emojis, e quando fizer sentido, monte uma pequena tabela com números importantes.
Evite a expressão "data futura" e não diga "não encontrado"; prefira comentar que o dado não está disponível com segurança.
      `.trim();
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

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
