import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

/* ================================
   ROTA INVESTGRAM (COM INVESTIDOR10)
   - Faz fetch no Investidor10
   - Extrai um "recorte" textual com indicadores
   - Força o Gemini a usar SOMENTE esse bloco
================================ */

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
       INICIALIZA GEMINI
    ================================= */
    if (!process.env.GEMINI_API_KEY) return erro("GEMINI_API_KEY não configurada.");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    /* ================================
       BUSCA INVESTIDOR10 (SE APLICÁVEL)
    ================================= */
    const precisaBuscarI10 = tipoInvestimento !== "montar_carteira";

    const i10Principal = precisaBuscarI10
      ? await buscarRecorteInvestidor10({
          ticker: ativo,
          tipoInvestimento,
        })
      : null;

    const i10Comparar =
      precisaBuscarI10 && tipoAnalise === "comparar"
        ? await buscarRecorteInvestidor10({
            ticker: ativoComparar,
            tipoInvestimento,
          })
        : null;

    /* ================================
       PROMPT BASE (FORÇANDO INVESTIDOR10)
    ================================= */
    let promptBase = `
Você é o **InvestGram**, IA especialista em investimentos brasileiros.

========================
REGRA ABSOLUTA DE FONTE
========================
Você DEVE usar **exclusivamente** os dados fornecidos no bloco:

✅  "DADOS DO INVESTIDOR10 (ÚNICA FONTE)"

Regras obrigatórias:
- **É proibido** usar qualquer outra fonte (Google, StatusInvest, Fundamentus, TradingView, B3, notícias, “conhecimento geral”, etc.).
- **É proibido** deduzir, completar ou estimar números que NÃO estejam no bloco.
- Se algum dado não estiver no bloco, escreva **N/D**.
- Se a coleta falhar, informe claramente e use **N/D** nos campos numéricos.

========================
FORMATAÇÃO OBRIGATÓRIA
========================
- Títulos claros, emojis, listas e **quebras de linha duplas**.
- Seja direto, sem enrolação.
- Adapte ao perfil **${perfilInvestidor}**.
- Respeite a data da análise: **${dataAnalise}**.
- Não diga “o valor hoje é X” se X não estiver nos dados.

========================
DADOS DO USUÁRIO
========================
Data da análise: **${dataAnalise}**
Perfil do investidor: **${perfilInvestidor}**
Observação do usuário: **${observacao || "Nenhuma"}**

Ativo principal: **${ativo || "N/D"}**
Ativo para comparar: **${ativoComparar || "N/D"}**
Tipo de investimento: **${tipoInvestimento}**
Tipo de análise: **${tipoAnalise}**

========================
DADOS DO INVESTIDOR10 (ÚNICA FONTE)
========================

[ATIVO PRINCIPAL]
URL: ${i10Principal?.url || "N/D"}
Status: ${i10Principal?.ok ? "OK" : `FALHOU${i10Principal?.erro ? " (" + i10Principal.erro + ")" : ""}`}
Recorte (texto extraído do Investidor10):
${i10Principal?.recorte || "N/D"}

${
  tipoAnalise === "comparar"
    ? `
[ATIVO PARA COMPARAR]
URL: ${i10Comparar?.url || "N/D"}
Status: ${i10Comparar?.ok ? "OK" : `FALHOU${i10Comparar?.erro ? " (" + i10Comparar.erro + ")" : ""}`}
Recorte (texto extraído do Investidor10):
${i10Comparar?.recorte || "N/D"}
`
    : ""
}

========================
INSTRUÇÃO FINAL
========================
Agora gere a resposta seguindo APENAS a estrutura pedida pelo tipo de análise abaixo.
Use SOMENTE os dados do bloco do Investidor10.
`;

    /* ================================
       PROMPTS ESPECÍFICOS
    ================================= */
    let promptFinal = "";

    if (tipoAnalise === "completa") {
      promptFinal = `
${promptBase}

Gere uma **análise completa** contendo:

📌 **1. Resumo do Ativo**
📊 **2. Tabela Rápida**
- Preço / Cotação (se houver)
- P/L, P/VP, ROE (se houver)
- Liquidez diária (se houver)
- Dividendos últimos 12m (se houver)
- DY 12m (se houver)
- Setor / Segmento (se houver)
- No caso de FII (se houver no recorte): Vacância, tipo da carteira (papel/tijolo/híbrido), valor patrimonial, etc.

📈 **3. Fundamentos**
📉 **4. Análise Técnica Simplificada** (sem inventar suportes/resistências numéricas)
⚠️ **5. Riscos relevantes**
🎯 **6. Conclusão personalizada**

Siga a estrutura exatamente como descrita.
`;
    }

    if (tipoAnalise === "fundamentalista") {
      promptFinal = `
${promptBase}

Gere uma **análise fundamentalista aprofundada**, com:

📌 Resumo  
📊 Tabela com fundamentais (somente os que existirem no Investidor10): P/L, P/VP, ROE, ROIC, Margens, Caixa, Dívida, etc.  
🏛 Qualidade da gestão (sem inventar fatos)  
📦 Vantagens competitivas (conceitual, sem inventar dados)  
⚠️ Riscos  
🎯 Conclusão clara para o perfil ${perfilInvestidor}.  
`;
    }

    if (tipoAnalise === "tecnica") {
      promptFinal = `
${promptBase}

Gere uma **análise técnica profissional**, com:

📈 Tendência principal (conceitual)
📉 Suportes (apenas “região aproximada” se houver algo no recorte; caso contrário N/D)
📈 Resistências (mesma regra)
📊 Volatilidade (se houver)
⚠️ Alertas técnicos

Nunca invente valores exatos de preço.
`;
    }

    if (tipoAnalise === "dividendos") {
      promptFinal = `
${promptBase}

Gere uma análise focada em **Dividendos**, com:

💰 Histórico de pagamentos (se houver no recorte)
📦 Consistência dos últimos anos (se houver)
📊 Dividend Yield (se houver)
🔍 Sustentabilidade (com base nos dados disponíveis; sem inventar)
⚠️ Riscos de corte
🎯 Conclusão sobre renda para o perfil ${perfilInvestidor}.
`;
    }

    if (tipoAnalise === "fii") {
      promptFinal = `
${promptBase}

Gere uma análise **especializada para Fundos Imobiliários**, com:

🏢 Tipo do fundo (papel/tijolo/híbrido) (se houver)
📊 Vacância (se houver)
🏛 Qualidade da gestão (sem inventar)
📜 Principais informações operacionais (somente se estiverem no recorte)
💰 Estabilidade dos dividendos (se houver)
⚠️ Riscos reais
🎯 Conclusão alinhada ao perfil ${perfilInvestidor}.
`;
    }

    if (tipoAnalise === "comparar") {
      promptFinal = `
${promptBase}

Gere uma análise comparativa completa entre **${ativo}** e **${ativoComparar}**, contendo:

🆚 **1. Tabela lado a lado**
- Setor/Segmento (se houver)
- Preço/Cotação (se houver)
- P/L, P/VP, ROE (se houver)
- DY 12m (se houver)
- Liquidez (se houver)
- Riscos

📈 **2. Quem está mais barato** (apenas se houver dados suficientes; senão N/D)
📉 **3. Quem tem mais risco** (conceitual)
🎯 **4. Qual faz mais sentido para o perfil ${perfilInvestidor}**
`;
    }

    if (tipoAnalise === "setor") {
      promptFinal = `
${promptBase}

Gere uma análise comparando **${ativo}** com o setor:

🏭 Se há indicação de setor/segmento no recorte
📉 Se o ativo aparenta caro/barato (somente se houver múltiplos no recorte)
⚠️ Riscos setoriais (conceitual)
🎯 Conclusão para o perfil ${perfilInvestidor}.
`;
    }

    if (tipoAnalise === "resumo") {
      promptFinal = `
${promptBase}

Gere um **resumo executivo** com no máximo 6 linhas:

📌 O que é o ativo  
📊 2 indicadores chave (somente se existirem no recorte)  
⚠️ 1 risco principal  
🎯 Decisão rápida para o perfil ${perfilInvestidor}  

Sem enrolação.
Clareza máxima.
`;
    }

    if (tipoInvestimento === "montar_carteira") {
      // Aqui não depende do Investidor10 necessariamente, mas mantive a regra de não inventar números.
      promptFinal = `
Você é o **InvestGram**, IA especialista em investimentos brasileiros.

Regras:
- Não prometa ganhos.
- Não invente números “do mercado”.
- Seja prático e adaptado ao perfil **${perfilInvestidor}**.

Monte uma carteira diversificada conforme o perfil **${perfilInvestidor}**:

📊 Percentuais por classe (use faixas/estimativas coerentes, sem afirmar como “ideal universal”)
🏛 Ações (exemplos por setor)
🏢 FIIs (tijolo, papel, híbrido)
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
   INVESTIDOR10 HELPERS
================================ */

function montarUrlInvestidor10(tipoInvestimento: string, tickerRaw: string) {
  const base = "https://investidor10.com.br";
  const t = (tickerRaw || "").trim().toLowerCase();

  // Ajuste conforme seus tipos reais
  const tipo = (tipoInvestimento || "").toLowerCase();

  if (!t) return null;

  // Mapeamento comum do Investidor10
  if (tipo === "fii" || tipo === "fiis") return `${base}/fiis/${t}/`;
  if (tipo === "acoes" || tipo === "acao" || tipo === "ações") return `${base}/acoes/${t}/`;
  if (tipo === "etf" || tipo === "etfs") return `${base}/etfs/${t}/`;

  // fallback: tenta como ação
  return `${base}/acoes/${t}/`;
}

async function buscarRecorteInvestidor10(opts: {
  ticker: string;
  tipoInvestimento: string;
}) {
  const url = montarUrlInvestidor10(opts.tipoInvestimento, opts.ticker);
  if (!url) return { ok: false, url: "N/D", erro: "Ticker inválido", recorte: "" };

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      // Edge fetch cache control
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        url,
        erro: `HTTP ${res.status}`,
        recorte: "",
      };
    }

    const html = await res.text();

    // Extrai um recorte textual contendo possíveis indicadores
    const recorte = extrairRecorteIndicadores(html);

    return {
      ok: true,
      url,
      erro: "",
      recorte: recorte || "N/D",
    };
  } catch (e: any) {
    return {
      ok: false,
      url,
      erro: e?.message || "Falha no fetch",
      recorte: "",
    };
  }
}

/**
 * Estratégia: transformar HTML em texto e pegar linhas que tenham palavras-chave.
 * (Isso evita depender de seletores que mudam.)
 */
function extrairRecorteIndicadores(html: string) {
  if (!html) return "";

  // remove scripts e styles
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(div|p|li|tr|br|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();

  // Palavras-chave que normalmente aparecem no Investidor10 / indicadores
  const keys = [
    "cotação",
    "preço",
    "p/l",
    "p/ vp",
    "p/vp",
    "p/vpa",
    "roe",
    "roic",
    "dy",
    "dividend",
    "dividend yield",
    "dividendos",
    "liquidez",
    "valor patrimonial",
    "vpa",
    "vacância",
    "segmento",
    "setor",
    "patrimônio",
    "ativos",
    "receita",
    "lucro",
    "ebitda",
    "margem",
    "dívida",
    "caixa",
    "cap rate",
  ];

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Junta frases “parecidas” (o texto às vezes vem em blocos enormes)
  const joined: string[] = [];
  for (const l of lines) {
    if (l.length < 10) continue;
    joined.push(l);
  }

  // Filtra linhas com palavras-chave
  const hits = joined.filter((l) => {
    const low = l.toLowerCase();
    return keys.some((k) => low.includes(k));
  });

  // Limita tamanho para não estourar tokens
  const limited = hits
    .slice(0, 35)
    .map((l) => (l.length > 220 ? l.slice(0, 220) + "..." : l));

  // Se não achou nada, devolve um começo do texto como fallback (ainda é Investidor10)
  if (limited.length === 0) {
    return cleaned.slice(0, 1200) + (cleaned.length > 1200 ? "..." : "");
  }

  return limited.join("\n");
}

/* ================================
   HELPERS HTTP
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
