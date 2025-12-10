// app/api/investgram/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY não configurada.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      tipoInvestimento, // "acoes" | "fii" | "etf" | "renda_fixa" | "montar_carteira" etc.
      ativo,            // PETR4, KNRI11, IVVB11, Tesouro IPCA+
      perfilInvestidor, // conservador | moderado | agressivo
      focoAnalise,      // dividendos | valorizacao | crescimento | renda_passiva
      dataAnalise,      // dd/mm/yyyy digitada pelo usuário
      observacao,       // texto opcional
    } = body;

    const tipo = String(tipoInvestimento || "").toLowerCase();

    const isCarteira =
      tipo.includes("carteira") ||
      tipo.includes("balanceada") ||
      tipo.includes("montar");

    // Validações básicas (em carteira não obrigo "ativo")
    if (!tipoInvestimento) {
      return NextResponse.json(
        { error: "Tipo de investimento é obrigatório." },
        { status: 400 }
      );
    }

    if (!isCarteira && !ativo) {
      return NextResponse.json(
        { error: "Informe o ativo (código ou nome)." },
        { status: 400 }
      );
    }

    if (!dataAnalise) {
      return NextResponse.json(
        { error: "Informe a data da análise." },
        { status: 400 }
      );
    }

    if (!perfilInvestidor) {
      return NextResponse.json(
        { error: "Perfil do investidor é obrigatório." },
        { status: 400 }
      );
    }

    if (!focoAnalise) {
      return NextResponse.json(
        { error: "Foco da análise é obrigatório." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.45,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 900, // ainda controlamos o tamanho pra não pesar demais
      },
    });

    const perfilUpper = String(perfilInvestidor).toUpperCase();
    const focoTexto = String(focoAnalise).toLowerCase();
    const obs =
      observacao && observacao.trim().length > 0 ? observacao : "nenhuma";

    let prompt = "";

    // ============================
    // 1) MODO MONTAR CARTEIRA
    // ============================
    if (isCarteira) {
      prompt = `
Você é o InvestGram, uma IA especializada em montar carteiras balanceadas para investidores brasileiros.

OBJETIVO:
Montar uma CARTEIRA BALANCEADA para um investidor de perfil "${perfilInvestidor}" com foco em "${focoTexto}".
Data informada pelo usuário: ${dataAnalise}.
Observação extra do usuário: ${obs}.

REGRAS IMPORTANTES:
- Use SEMPRE dados e práticas de alocação atuais para o mercado brasileiro.
- A soma das porcentagens da carteira DEVE ser exatamente 100%.
- NÃO repita "não encontrado" nem "data futura" em nenhum momento.
- Não cite que está usando dados "futuros". Se não tiver algo exato, explique de forma qualitativa.

FORMATO OBRIGATÓRIO DA RESPOSTA (em português do Brasil):

1) TÍTULO RÁPIDO
Escreva uma linha como:
"📊 Estratégia de carteira balanceada para perfil ${perfilUpper} focado em ${focoTexto}"

2) TABELA DE ALOCAÇÃO POR CLASSE (SIMPLES)
Liste, linha a linha, as classes de ativos e a porcentagem ideal para esse perfil e foco.
Exemplo de formato (apenas exemplo de formato, não copie os números):
- Ações Brasil: 35%
- Ações EUA / Internacional: 15%
- Fundos Imobiliários (FIIs): 20%
- Renda Fixa Pós-fixada (CDI, CDB, Tesouro Selic): 15%
- Renda Fixa IPCA / Prefixada: 10%
- Caixa / Reserva de oportunidade: 5%

Ajuste a alocação de acordo com o perfil:
- Conservador: mais renda fixa e caixa, menos ações/risco.
- Moderado: equilíbrio entre renda fixa, FIIs e ações.
- Agressivo: mais ações e FIIs, menos renda fixa e caixa.

3) BREVE COMENTÁRIO POR CLASSE
Para cada classe da tabela, faça 2–3 frases explicando:
- Qual o papel dessa classe na carteira.
- Por que esse peso faz sentido para o perfil informado.

4) EXEMPLOS PRÁTICOS (SEM SER RECOMENDAÇÃO)
Dê exemplos de 2–6 ativos para cada classe (tickers ou tipos), SEM parecer recomendação personalizada.
Exemplo de formato:
"Exemplos de ativos nessa classe (apenas para estudo, não é recomendação):"
- Ações Brasil: PETR4, ITUB4, VALE3...
- FIIs: KNRI11, HGLG11...

5) RISCOS E CUIDADOS
Liste de forma objetiva:
- Principais riscos dessa estratégia para o perfil informado.
- Erros comuns que o investidor deve evitar.

6) CONCLUSÃO PARA O PERFIL ${perfilUpper}
Traga uma conclusão clara, explicando:
- Por que a carteira está alinhada com o perfil e o foco.
- Qual horizonte de tempo mínimo recomendado (ex: 5+ anos).
- Lembrar de rebalancear a carteira periodicamente.

Use parágrafos curtos, bullets com "•" ou "-", e emojis discretos (📊, 💸, ⚠️, 🎯).
Não seja prolixo demais para não ultrapassar o limite de tokens.
      `.trim();
    }
    // ============================
    // 2) FIIs
    // ============================
    else if (tipo.includes("fii")) {
      prompt = `
Você é o InvestGram, IA especialista em Fundos Imobiliários (FIIs) do mercado brasileiro.

Gere uma análise profissional e organizada para o FII abaixo.

DADOS DO USUÁRIO:
- Tipo de investimento: FII (Fundo Imobiliário)
- Ativo (ticker): ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoTexto}
- Data informada pelo usuário: ${dataAnalise}
- Observação extra: ${obs}

REGRAS PARA DADOS NUMÉRICOS (TABELA):
1. Antes de começar o texto, monte uma TABELA RÁPIDA com as principais métricas, neste formato:

📊 TABELA RÁPIDA (FII)
- Preço atual da cota (R$):
- Dividend Yield 12 meses (%):
- Dividendos 12 meses (R$ por cota):
- P/VP:
- Vacância física (%):
- Vacância financeira (%):
- Tipo de FII (tijolo, papel, híbrido):
- Segmentos/Setores principais (ex: escritórios, logística, shoppings):
- Prazo médio dos contratos (se disponível):
- Índice de correção predominante (ex: IPCA, IGP-M, CDI):

2. Sempre que não tiver certeza de um número, NÃO escreva:
   - "não encontrado"
   - "data futura"
   Em vez disso, escreva exatamente: "N/D" (não disponível) e explique depois em texto.

3. Use os dados mais recentes que você conseguir acessar.
Não diga que está usando "dados futuros".

ESTRUTURA DA ANÁLISE (DEPOIS DA TABELA):
Use seções com títulos claros, por exemplo:

🔹 VISÃO GERAL DO FUNDO
🔹 QUALIDADE DA CARTEIRA E IMÓVEIS
🔹 RENDA E DIVIDENDOS
🔹 RISCOS RELEVANTES
🔹 LEITURA PARA O PERFIL ${perfilUpper}
🔹 CONCLUSÃO FINAL

Use parágrafos curtos, bullets e linguagem simples, mas profissional.
      `.trim();
    }
    // ============================
    // 3) ETFs
    // ============================
    else if (tipo.includes("etf")) {
      prompt = `
Você é o InvestGram, IA especialista em ETFs e fundos de índice.

Analise o ativo abaixo.

DADOS DO USUÁRIO:
- Tipo de investimento: ETF
- Ativo (ticker): ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoTexto}
- Data informada pelo usuário: ${dataAnalise}
- Observação extra: ${obs}

TABELA RÁPIDA (OBRIGATÓRIA ANTES DO TEXTO):

📊 TABELA RÁPIDA (ETF)
- Preço atual da cota (R$):
- Variação no ano (%):
- Taxa de administração (% ao ano):
- Índice de referência (benchmark):
- Dividend Yield 12 meses (%), se houver:
- Patrimônio líquido aproximado:
- Número aproximado de ativos na carteira:
- Principais países/setores (quando fizer sentido):

Se não tiver certeza de algum dado, use "N/D" no lugar do número.

ESTRUTURA DA ANÁLISE:
🔹 VISÃO GERAL DO ETF
🔹 COMO ELE REPLICA O ÍNDICE
🔹 CUSTOS, LIQUIDEZ E RISCOS
🔹 COMO SE ENCAIXA NO PERFIL ${perfilUpper}
🔹 CONCLUSÃO FINAL
      `.trim();
    }
    // ============================
    // 4) RENDA FIXA
    // ============================
    else if (tipo.includes("renda_fixa") || tipo.includes("renda fixa")) {
      prompt = `
Você é o InvestGram, IA especializada em Renda Fixa no Brasil.

Analise o ativo de renda fixa abaixo (Tesouro, CDB, LCI, LCA, debênture, etc.).

DADOS DO USUÁRIO:
- Tipo de investimento: Renda Fixa
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoTexto}
- Data informada pelo usuário: ${dataAnalise}
- Observação extra: ${obs}

TABELA RÁPIDA (ANTES DO TEXTO):

📊 TABELA RÁPIDA (Renda Fixa)
- Tipo de título (Tesouro Selic, CDB pós, IPCA+, prefixado, etc.):
- Taxa atual (ex: IPCA + 5,50% a.a.):
- Prazo de vencimento:
- Liquidez (ex: diária, D+X, somente no vencimento):
- Garantia (Tesouro Nacional, FGC, sem garantia, etc.):
- Tributação (IR, IOF, isento, etc.):

Se algum dado não estiver claro, use "N/D".

ESTRUTURA DA ANÁLISE:
🔹 VISÃO GERAL DO TÍTULO
🔹 COMO GANHA DINHEIRO (MECÂNICA)
🔹 PRINCIPAIS RISCOS
🔹 ADEQUAÇÃO AO PERFIL ${perfilUpper} COM FOCO EM "${focoTexto}"
🔹 CONCLUSÃO E HORIZONTE DE TEMPO
      `.trim();
    }
    // ============================
    // 5) AÇÕES (DEFAULT)
    // ============================
    else {
      prompt = `
Você é o InvestGram, IA especialista em ações brasileiras.

Gere uma análise profissional da ação abaixo.

DADOS DO USUÁRIO:
- Tipo de investimento: Ações
- Ticker: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoTexto}
- Data informada pelo usuário: ${dataAnalise}
- Observação extra: ${obs}

INSTRUÇÕES PARA DADOS NUMÉRICOS:

1. Use a cotação e indicadores mais recentes que você conseguir para ${ativo}.
2. Monte uma TABELA RÁPIDA logo no começo, nesse formato:

📊 TABELA RÁPIDA (Ação)
- Preço atual (R$):
- Variação no dia (%):
- Variação no ano (%):
- Dividend Yield 12 meses (%):
- Dividendos 12 meses (R$ por ação):
- P/L:
- P/VP:
- ROE (%):
- Margem líquida (%):
- Dívida Líquida / EBITDA:
- Setor / segmento:
- Valor de mercado aproximado (R$ bilhões):

3. Se NÃO tiver certeza de algum número, use "N/D" no lugar do valor.
   NÃO escreva "não encontrado" e NÃO fale "data futura".

4. Não diga que está usando dados futuros.
   Se os dados forem aproximados, apenas deixe claro que são estimativas.

ESTRUTURA DA ANÁLISE (DEPOIS DA TABELA):
🔹 VISÃO GERAL DA EMPRESA
🔹 FUNDAMENTOS E INDICADORES
🔹 DIVIDENDOS E GERAÇÃO DE CAIXA
🔹 CRESCIMENTO / TESE DE INVESTIMENTO
🔹 RISCOS RELEVANTES
🔹 LEITURA PARA O PERFIL ${perfilUpper} COM FOCO EM "${focoTexto}"
🔹 CONCLUSÃO FINAL
      `.trim();
    }

    // ============================
    // STREAMING COM GEMINI
    // ============================
    const streamingResult = await model.generateContentStream(prompt);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamingResult.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    // Resposta em TEXTO PURO (stream), não mais JSON
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err: any) {
    console.error("Erro InvestGram API:", err);
    return NextResponse.json(
      { error: "Erro interno na API do InvestGram" },
      { status: 500 }
    );
  }
}
