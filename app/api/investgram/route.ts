import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Aceitar tanto os nomes antigos quanto os novos do front
    const {
      tipo,
      tipoInvestimento,
      ativo,
      perfil,
      perfilInvestidor,
      foco,
      focoAnalise,
      objetivo,
      objetivoInvestimento,
      data,
      dataAnalise,
      observacao,
    } = body;

    const tipoFinal: string = (tipo || tipoInvestimento || "analise_completa").toString();
    const ativoFinal: string = (ativo || "").toString().trim();
    const perfilFinal: string = (perfil || perfilInvestidor || "").toString().trim();
    const focoFinal: string = (foco || focoAnalise || "").toString().trim();
    const objetivoFinal: string = (objetivo || objetivoInvestimento || "").toString().trim();
    const dataFinal: string = (data || dataAnalise || "").toString().trim();
    const observacaoFinal: string = (observacao || "").toString().trim();

    // Para qualquer coisa que NÃO seja carteira balanceada, o ativo é obrigatório
    if (tipoFinal !== "carteira_balanceada" && !ativoFinal) {
      return NextResponse.json(
        { error: "Ativo é obrigatório para esse tipo de análise." },
        { status: 400 }
      );
    }

    if (!perfilFinal) {
      return NextResponse.json(
        { error: "Perfil do investidor é obrigatório." },
        { status: 400 }
      );
    }

    // ==============================
    // DEFINIÇÃO DO PROMPT
    // ==============================
    let prompt = "";

    // 🔹 TIPO ESPECIAL: MONTAR CARTEIRA BALANCEADA
    if (tipoFinal === "carteira_balanceada") {
      prompt = `
Você é o InvestGram, uma IA especialista em montagem de carteiras de investimento para o mercado brasileiro.

Sua missão é montar uma CARTEIRA BALANCEADA para o investidor abaixo.

DADOS DO INVESTIDOR:
- Perfil: ${perfilFinal || "não informado"}
- Foco: ${focoFinal || "não informado"} (ex: dividendos, crescimento, renda passiva)
- Objetivo de prazo: ${objetivoFinal || "não informado"} (ex: curto, médio, longo prazo)
- Data da análise: ${dataFinal || "não informada"}
- Observações extras: ${observacaoFinal || "nenhuma"}

REGRAS GERAIS:
- Use português do Brasil.
- Não dê “dica quente” nem ordem de compra/venda, apenas sugestão de alocação.
- Nunca use linguagem de “recomendação formal”. Fale como “parece interessante”, “pode ser adequado”, etc.
- A carteira deve ser pensada para investidor brasileiro.

ESTRUTURA DA RESPOSTA (SIGA ESSA ORDEM):

1) 🧭 Visão geral da estratégia
   - Explique em poucas linhas a lógica da carteira para esse perfil (${perfilFinal}) e foco (${focoFinal}).

2) 📊 Tabela de alocação por classe de ativo
   Traga algo nesse formato (como texto, não precisa ser Markdown):
   - Renda fixa / pós-fixado (%)
   - Renda fixa / IPCA+ (%)
   - Ações Brasil (%)
   - Ações exterior / ETFs (%)
   - FIIs (%)
   - Caixa / Reserva de oportunidade (%)

   Adapte os percentuais ao perfil:
   - Conservador: mais renda fixa, menos ações.
   - Moderado: equilíbrio entre renda fixa, FIIs e ações.
   - Agressivo: mais exposição em ações, FIIs e exterior.

3) 📌 Exemplos de ativos por classe
   - Liste alguns exemplos de tipos de ativos (sem precisar citar códigos exatos se não tiver certeza).
   Ex: 
   - Renda fixa: Tesouro Selic, CDBs de bancos sólidos, LCIs/LCAs.
   - Ações Brasil: empresas sólidas, setores defensivos ou de crescimento.
   - FIIs: fundos de tijolo/logísticos/shoppings etc.
   - ETFs: BOVA11, IVVB11 como exemplos gerais (se achar adequado).

4) 🎯 Adaptação ao perfil do investidor
   - Explique por que essa distribuição faz sentido para o perfil ${perfilFinal} e foco ${focoFinal}.

5) ⚠️ Riscos principais
   - Liste 3 a 5 riscos importantes (volatilidade, risco de crédito, risco de inflação, risco de concentração etc).

6) ✅ Conclusão do InvestGram
   - Faça um resumo em 3–5 frases, reforçando que a carteira é um ponto de partida e não uma recomendação rígida.

Inclua ao final um pequeno aviso de risco padrão sobre investimentos.
      `.trim();
    } else {
      // 🔹 ANÁLISE DE UM ÚNICO ATIVO (AÇÕES, FII, ETF, RENDA FIXA)
      let blocoMetricas = "";

      if (tipoFinal === "fii") {
        blocoMetricas = `
ANTES DA ANÁLISE TEXTUAL, TRAGA UMA TABELA RESUMO EM TEXTO COM:

📊 TABELA RÁPIDA (FII)
- Preço atual da cota (R$)
- Dividend Yield 12 meses (%)
- Dividendo médio dos últimos 12 meses (R$ por cota)
- Último dividendo pago (R$ por cota)
- P/VP
- Vacância física (%)
- Vacância financeira (%) se encontrar
- Segmento (logístico, lajes, shoppings, híbrido etc.)
- Número aproximado de imóveis
- Principais tipos de inquilinos (ex: logística, escritórios, varejo)
- Liquidez média diária aproximada (R$)

Se não encontrar algum dado com confiança, escreva "não encontrado" ao lado do item em vez de inventar valores.
        `.trim();
      } else if (tipoFinal === "acoes" || tipoFinal === "etf") {
        blocoMetricas = `
ANTES DA ANÁLISE TEXTUAL, TRAGA UMA TABELA RESUMO EM TEXTO COM:

📊 TABELA RÁPIDA (${tipoFinal === "acoes" ? "Ação" : "ETF"})
- Preço atual (R$)
- Variação no ano (%)
- Dividend Yield 12 meses (%)
- Dividendos pagos nos últimos 12 meses (R$ por ação/cota)
- P/L
- P/VP
- ROE (%)
- Margem líquida (%), se encontrar
- Dívida Líquida / EBITDA, se existir
- Setor / segmento
- Valor de mercado aproximado

Se não encontrar algum dado com confiança, escreva "não encontrado" em vez de inventar valores.
        `.trim();
      } else if (tipoFinal === "renda_fixa") {
        blocoMetricas = `
ANTES DA ANÁLISE TEXTUAL, TRAGA UMA TABELA RESUMO EM TEXTO COM:

📊 TABELA RÁPIDA (Renda Fixa)
- Tipo do título (Tesouro, CDB, LCI/LCA, debênture etc.)
- Indexador (CDI, IPCA, prefixado etc.)
- Rentabilidade contratada (% ao ano)
- Prazo / vencimento
- Carência (se houver)
- Nível de risco do emissor (baixo, médio, alto)
- Garantia (FGC, sem FGC, garantia real etc.)

Se não tiver dados exatos, use descrições gerais, deixando claro que são informações de alto nível.
        `.trim();
      } else {
        blocoMetricas = `
Traga, logo no início, uma visão numérica rápida com as principais métricas disponíveis para esse tipo de ativo.
Se não houver números confiáveis, deixe claro que são estimativas gerais e foque mais na interpretação qualitativa.
        `.trim();
      }

      prompt = `
Você é o InvestGram, uma IA especialista em análise de investimentos focada no mercado brasileiro.

Sua missão é gerar uma análise clara, organizada e com números para o ativo abaixo.

DADOS INFORMADOS PELO USUÁRIO:
- Tipo de investimento: ${tipoFinal}
- Ativo: ${ativoFinal}
- Perfil do investidor: ${perfilFinal || "não informado"}
- Foco da análise: ${focoFinal || "não informado"} (ex: dividendos, valorização, crescimento, renda passiva)
- Objetivo de prazo: ${objetivoFinal || "não informado"} (ex: curto, médio, longo prazo)
- Data da análise: ${dataFinal || "não informada"}
- Observação extra: ${observacaoFinal || "nenhuma"}

REGRAS GERAIS:
- Responda em português do Brasil.
- Use títulos com emojis para cada seção (ex: "📌 Visão geral", "📊 Métricas principais", "⚠️ Riscos").
- Use listas com bullet points para organizar.
- Seja direto, porém profundo — sem enrolar.
- Nunca invente números aleatórios. Se não houver dado confiável, escreva explicitamente "não encontrado" e siga com análise qualitativa.
- Adapte a conclusão ao perfil (${perfilFinal || "do investidor"}) e ao foco (${focoFinal || "da análise"}).
- NÃO use linguagem de recomendação formal (“compre/venda”), e sim termos como “parece atrativo”, “neutro”, “arriscado para este perfil”.

${blocoMetricas}

ESTRUTURA DA RESPOSTA (SIGA ESSA ORDEM):

1) 📌 Visão geral do ativo
   - O que é o ativo, em que segmento atua, qual o objetivo principal (renda, crescimento, proteção etc.).

2) 📊 Métricas principais
   - Liste e comente os números trazidos na tabela rápida (ex: DY, P/L, P/VP, vacância, endividamento, rentabilidade etc.).

3) 🧮 Interpretação das métricas
   - Explique se os indicadores estão em nível saudável ou não, comparando de forma qualitativa com o setor ou padrão do mercado.

4) ⚠️ Riscos relevantes
   - Liste de 3 a 6 riscos principais (ex: risco de mercado, risco setorial, risco político, risco de crédito, vacância, juros altos etc.).

5) 🎯 Compatibilidade com o perfil e o foco
   - Explique se esse ativo combina ou não com o perfil ${perfilFinal} e com o foco ${focoFinal}, citando pontos positivos e negativos.

6) ✅ Conclusão do InvestGram
   - Faça um resumo em 3–5 frases, deixando claro se o ativo parece ATRATIVO, NEUTRO ou ARRISCADO para esse investidor, SEM usar linguagem de ordem de compra/venda.

No final, inclua um aviso curto reforçando que se trata de uma análise informativa e que investimentos envolvem riscos.
      `.trim();
    }

    // ==============================
    // CHAMADA GEMINI 2.5 FLASH
    // ==============================
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY não configurada no ambiente.");
      return NextResponse.json(
        { error: "Configuração da IA ausente (GEMINI_API_KEY)." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
