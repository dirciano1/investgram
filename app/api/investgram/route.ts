import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento,
      tipoAnalise,
      ativo,
      ativoComparar,
      perfilInvestidor,
      dataAnalise,
      observacao,
    } = body;

    /* ================================
       VALIDAÇÃO BÁSICA
    ================================= */
    if (!tipoInvestimento)
      return erro("Tipo de investimento faltando.");
    if (!tipoAnalise)
      return erro("Tipo de análise faltando.");
    if (!perfilInvestidor)
      return erro("Perfil faltando.");
    if (!dataAnalise)
      return erro("Data faltando.");

    if (tipoInvestimento !== "montar_carteira" && !ativo?.trim())
      return erro("Ativo principal faltando.");

    if (tipoAnalise === "comparar" && !ativoComparar?.trim())
      return erro("Ativo para comparação faltando.");

    /* ================================
       INICIALIZA GEMINI
    ================================= */
    if (!process.env.GEMINI_API_KEY)
      return erro("GEMINI_API_KEY não configurada.");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    /* ================================
       PROMPT BASE
    ================================= */
    let promptBase = `
Você é o **InvestGram**, IA especialista em investimentos brasileiros.

Sempre siga os princípios:
- Nunca invente números exatos; apenas aproximados plausíveis.
- Sempre use **N/D** quando não souber algo.
- Formate com títulos claros, emojis, listas e quebras de linha duplas.
- Adapte tudo ao perfil **${perfilInvestidor}**.
- Data da análise: **${dataAnalise}**
- Observação do usuário: **${observacao || "Nenhuma"}**

Ativo principal: **${ativo || "N/D"}**
Tipo de Investimento: **${tipoInvestimento}**
Tipo de Análise: **${tipoAnalise}**

`;

    /* ================================
       PROMPTS ESPECÍFICOS PARA CADA TIPO DE ANÁLISE
    ================================= */

    let promptFinal = "";

    /* -----------------------------------
       1. ANÁLISE COMPLETA
    ----------------------------------- */
    if (tipoAnalise === "completa") {
      promptFinal = `
${promptBase}

Gere uma **análise completa** contendo:

📌 **1. Resumo do Ativo**
📊 **2. Tabela Rápida**
- Preço aproximado
- P/L, P/VP, ROE
- Liquidez diária
- Dividendos últimos 12m
- DY 12m
- Setor
- No caso de FII: Vacância, tipo da carteira (papel/tijolo/híbrido), Dívida líquida / patrimônio

📈 **3. Fundamentos**
📉 **4. Análise Técnica Simplificada**
⚠️ **5. Riscos relevantes**
🎯 **6. Conclusão personalizada**

Siga a estrutura exatamente como descrita.
`;
    }

    /* -----------------------------------
       2. FUNDAMENTALISTA
    ----------------------------------- */
    if (tipoAnalise === "fundamentalista") {
      promptFinal = `
${promptBase}

Gere uma **análise fundamentalista aprofundada**, com:

📌 Resumo
📊 Tabela com múltiplos fundamentais (P/L, P/VP, ROE, ROIC, Margem, Caixa, Dívida)
📈 Crescimento de receita e lucro (apenas aproximações plausíveis)
🏛 Qualidade da gestão
📦 Vantagens competitivas
⚠️ Riscos
🎯 Conclusão clara para o perfil ${perfilInvestidor}.
`;
    }

    /* -----------------------------------
       3. TÉCNICA
    ----------------------------------- */
    if (tipoAnalise === "tecnica") {
      promptFinal = `
${promptBase}

Gere uma **análise técnica profissional**, com:

📈 Tendência principal
📉 Suportes importantes
📈 Resistências importantes
📊 Volatilidade
🔥 Regiões de interesse
⚠️ Alertas técnicos

Nunca invente valores exatos de preços.
Use apenas frases como "região aproximada".
`;
    }

    /* -----------------------------------
       4. DIVIDENDOS
    ----------------------------------- */
    if (tipoAnalise === "dividendos") {
      promptFinal = `
${promptBase}

Gere uma análise focada em **Dividendos**, com:

💰 Histórico de pagamentos
📦 Consistência dos últimos anos
📊 Dividend Yield aproximado
🔍 Sustentabilidade dos dividendos
⚠️ Riscos de corte
🎯 Conclusão sobre renda para o perfil ${perfilInvestidor}.
`;
    }

    /* -----------------------------------
       5. ANÁLISE FII
    ----------------------------------- */
    if (tipoAnalise === "fii") {
      promptFinal = `
${promptBase}

Gere uma análise **especializada para Fundos Imobiliários**, com:

🏢 Tipo do fundo (papel/tijolo/híbrido)
📊 Vacância física e financeira (aproximada)
🏛 Qualidade da gestão
📜 Principais contratos e vencimentos
💰 Estabilidade dos dividendos
⚠️ Riscos reais
🎯 Conclusão alinhada ao perfil ${perfilInvestidor}.
`;
    }

    /* -----------------------------------
       6. COMPARAR ATIVOS
    ----------------------------------- */
    if (tipoAnalise === "comparar") {
      promptFinal = `
${promptBase}

Ativo para comparar: **${ativoComparar}**

Gere uma análise comparativa completa entre **${ativo}** e **${ativoComparar}**, contendo:

🆚 **1. Tabela lado a lado**
- Setor
- Preço aproximado
- P/L, P/VP, ROE
- DY 12m
- Liquidez
- Riscos

📈 **2. Quem está mais barato**
📉 **3. Quem tem mais risco**
📊 **4. Quem está mais descontado vs setor**
🎯 **5. Qual faz mais sentido para o perfil ${perfilInvestidor}**
`;
    }

    /* -----------------------------------
       7. COMPARAR COM SETOR
    ----------------------------------- */
    if (tipoAnalise === "setor") {
      promptFinal = `
${promptBase}

Gere uma análise comparando **${ativo}** com outros ativos relevantes do mesmo setor:

🏭 Média dos múltiplos do setor
📉 Se o ativo está caro ou barato
📈 Pontos fortes vs concorrentes
⚠️ Riscos setoriais
🎯 Conclusão para o perfil ${perfilInvestidor}.
`;
    }

    /* -----------------------------------
       8. RESUMO EXECUTIVO
    ----------------------------------- */
    if (tipoAnalise === "resumo") {
      promptFinal = `
${promptBase}

Gere um **resumo executivo** com no máximo 6 linhas:

📌 O que é o ativo  
📊 2 indicadores chave  
⚠️ 1 risco principal  
🎯 Decisão rápida para o perfil ${perfilInvestidor}  

Sem enrolação.
Clareza máxima.
`;
    }

    /* -----------------------------------
       9. MONTAR CARTEIRA (mantido da sua versão anterior)
    ----------------------------------- */
    if (tipoInvestimento === "montar_carteira") {
      promptFinal = `
${promptBase}

Monte uma carteira diversificada conforme o perfil **${perfilInvestidor}**:

📊 Percentuais exatos por classe
🏛 Ações recomendadas
🏢 FIIs recomendados (tijolo, papel, agro)
💵 Renda fixa
⚠️ Riscos
🎯 Conclusão estratégica
`;
    }

    /* ==========================================
       EXECUTAR GEMINI
    =========================================== */
    const result = await model.generateContent(promptFinal);
    const resposta = await result.response.text();

    return respostaStream(resposta);

  } catch (err) {
    console.error("Erro InvestGram API:", err);
    return erro("Erro interno no servidor.");
  }
}

/* ================================
   HELPERS
================================ */
function erro(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function respostaStream(text: string) {
  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
