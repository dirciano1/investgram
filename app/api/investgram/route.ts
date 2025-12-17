import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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
    if (!tipoInvestimento) return erro("Tipo de investimento faltando.");
    if (!tipoAnalise) return erro("Tipo de análise faltando.");
    if (!perfilInvestidor) return erro("Perfil faltando.");
    if (!dataAnalise) return erro("Data faltando.");

    if (tipoInvestimento !== "montar_carteira" && !ativo?.trim())
      return erro("Ativo principal faltando.");

    if (tipoAnalise === "comparar" && !ativoComparar?.trim())
      return erro("Ativo para comparação faltando.");

    /* ================================
       INICIALIZA GEMINI + GOOGLE SEARCH TOOL
    ================================= */
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return erro("GEMINI_API_KEY não configurada.");

    const ai = new GoogleGenAI({ apiKey });

    // Grounding com Google Search (busca automática)
    const config = {
      tools: [{ googleSearch: {} }], // <- isso liga a busca automática
      temperature: 0.35,
    };

    /* ================================
       NORMALIZA TICKER (opcional mas ajuda)
       - FIIs/ETFs BR geralmente terminam com 11
    ================================= */
    const norm = (t?: string) => (t || "").trim().toUpperCase().replace(/\s+/g, "");

    const ajustarTicker = (tipo: string, t: string) => {
      const x = norm(t);
      if (!x) return x;
      if ((tipo === "fii" || tipo === "etf") && !/\d{2}$/.test(x)) return `${x}11`;
      return x;
    };

    const ativoNorm =
      tipoInvestimento === "montar_carteira" ? "" : ajustarTicker(tipoInvestimento, ativo);

    const compararNorm =
      tipoAnalise === "comparar" ? ajustarTicker(tipoInvestimento, ativoComparar) : "";

    /* ================================
       PROMPT BASE (força Investidor10)
    ================================= */
    const promptBase = `
Você é o **InvestGram**, IA especialista em investimentos brasileiros.

REGRA DE BUSCA (OBRIGATÓRIA):
- Use a busca automática do Google (grounding) para achar informações.
- Porém, você DEVE buscar e usar DADOS APENAS do Investidor10:
  Pesquise sempre com: site:investidor10.com.br

REGRAS:
- Se NÃO encontrar uma página do Investidor10 para o ativo, responda APENAS:
  "Não encontrei no Investidor10. Confirme o ticker (ex: HGLG11, PETR4, IVVB11)."
  e PARE (não preencha N/D em tabela).
- Nunca invente números.
- Formate com títulos claros, emojis, listas e quebras de linha duplas.
- Adapte ao perfil: ${perfilInvestidor}
- Data: ${dataAnalise}
- Observação: ${observacao || "Nenhuma"}

Ativo principal: ${ativoNorm || "N/D"}
Tipo investimento: ${tipoInvestimento}
Tipo análise: ${tipoAnalise}
`;

    let promptFinal = "";

    if (tipoAnalise === "completa") {
      promptFinal = `
${promptBase}

Tarefa:
1) Ache a página do ativo no Investidor10 (obrigatório):
   - "site:investidor10.com.br ${ativoNorm} ${tipoInvestimento}"
2) Gere a análise nesta estrutura:

📌 **1. Resumo do Ativo**

📊 **2. Tabela Rápida**
- Preço/Cotação
- P/L, P/VP, ROE
- Liquidez diária
- Dividendos últimos 12m
- DY 12m
- Setor/Segmento
- (Se FII) Vacância, tipo (papel/tijolo/híbrido), VP/patrimônio (se existir no Investidor10)

📈 **3. Fundamentos**

📉 **4. Análise Técnica Simplificada**
(sem inventar preços; use “regiões aproximadas” apenas se o Investidor10 trouxer algo)

⚠️ **5. Riscos relevantes**

🎯 **6. Conclusão personalizada**
`;
    }

    if (tipoAnalise === "fundamentalista") {
      promptFinal = `
${promptBase}

Busque com: "site:investidor10.com.br ${ativoNorm}"

Gere análise fundamentalista:
📌 Resumo
📊 Tabela com múltiplos disponíveis no Investidor10
⚠️ Riscos
🎯 Conclusão para ${perfilInvestidor}
`;
    }

    if (tipoAnalise === "tecnica") {
      promptFinal = `
${promptBase}

Busque no Investidor10 com: "site:investidor10.com.br ${ativoNorm} cotação gráfico"

Gere análise técnica:
📈 Tendência
📉 Suportes (regiões aproximadas se tiver base)
📈 Resistências (regiões aproximadas se tiver base)
📊 Volatilidade (se houver)
⚠️ Alertas
`;
    }

    if (tipoAnalise === "dividendos") {
      promptFinal = `
${promptBase}

Busque no Investidor10 com: "site:investidor10.com.br ${ativoNorm} dividendos"

Gere análise de dividendos:
💰 Histórico (conforme Investidor10)
📊 DY (se houver)
🔍 Sustentabilidade (sem inventar)
⚠️ Riscos de corte
🎯 Conclusão
`;
    }

    if (tipoAnalise === "fii") {
      promptFinal = `
${promptBase}

Busque no Investidor10 com: "site:investidor10.com.br ${ativoNorm} fii"

Gere análise de FII:
🏢 Tipo do fundo
📊 Vacância (se houver)
🏛 Gestão
📜 Contratos (se houver)
💰 Dividendos
⚠️ Riscos
🎯 Conclusão
`;
    }

    if (tipoAnalise === "comparar") {
      promptFinal = `
${promptBase}

Ativo para comparar: ${compararNorm}

Busque no Investidor10:
- "site:investidor10.com.br ${ativoNorm}"
- "site:investidor10.com.br ${compararNorm}"

Gere comparativo:
🆚 **1. Tabela lado a lado**
📈 **2. Quem está mais barato** (só se tiver dados)
📉 **3. Quem tem mais risco**
🎯 **4. Qual faz mais sentido para ${perfilInvestidor}**
`;
    }

    if (tipoAnalise === "setor") {
      promptFinal = `
${promptBase}

Busque no Investidor10 com: "site:investidor10.com.br ${ativoNorm} setor"

Compare com o setor (somente com base no que encontrar no Investidor10).
`;
    }

    if (tipoAnalise === "resumo") {
      promptFinal = `
${promptBase}

Busque no Investidor10 com: "site:investidor10.com.br ${ativoNorm}"

Resumo executivo (máx 6 linhas).
`;
    }

    if (tipoInvestimento === "montar_carteira") {
      promptFinal = `
Você é o **InvestGram**.

Monte uma carteira para o perfil ${perfilInvestidor}:
📊 Percentuais por classe
🏛 Ações / 🏢 FIIs / 💵 Renda fixa
⚠️ Riscos
🎯 Conclusão

Sem inventar números “do mercado”.
`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptFinal,
      config,
    });

    return respostaStream(response.text || "");
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
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
