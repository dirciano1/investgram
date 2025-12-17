// app/api/investgram/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * ✅ Vercel fix:
 * - Node runtime + maxDuration maior para evitar "did not return an initial response within 25s"
 * - Busca dados direto do Investidor10 via URL (rápido)
 * - NÃO usa Google Search (grounding) por padrão (evita timeout)
 * - Passa o texto extraído do Investidor10 para o Gemini e obriga a usar só isso
 *
 * ✅ Agora suporta links diretos do Investidor10 para:
 * - AÇÕES:        /acoes/{ticker}/
 * - FIIs:         /fiis/{ticker}/
 * - ETFs:         /etfs/{ticker}/
 * - ÍNDICES:      /indices/{slug}/
 * - GLOBAIS:      /stocks/{slug}/
 * - COMMODITIES:  /commodities/{slug}/
 *
 * ⚠️ Renda fixa (CDB/LCI/LCA) não tem "ticker" padrão no Investidor10 → NÃO buscamos por URL.
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
       GEMINI
    ================================= */
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return erro("GEMINI_API_KEY não configurada.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    /* ================================
       NORMALIZAÇÃO
    ================================= */
    const ativoNorm =
      tipoInvestimento === "montar_carteira"
        ? ""
        : ajustarTicker(tipoInvestimento, ativo);

    const compararNorm =
      tipoAnalise === "comparar" && tipoInvestimento !== "montar_carteira"
        ? ajustarTicker(tipoInvestimento, ativoComparar)
        : "";

    /* ================================
       BUSCA INVESTIDOR10 (URL direta + fallback)
    ================================= */
    const deveBuscarInvestidor10 =
      tipoInvestimento === "acoes" ||
      tipoInvestimento === "fii" ||
      tipoInvestimento === "etf" ||
      tipoInvestimento === "indices" ||
      tipoInvestimento === "globais" ||
      tipoInvestimento === "commodities";

    const i10Principal =
      tipoInvestimento === "montar_carteira" || !deveBuscarInvestidor10
        ? null
        : await pegarHtmlInvestidor10Auto({
            ativo: ativoNorm,
            tipoInvestimento,
          });

    const i10Comparar =
      deveBuscarInvestidor10 && tipoAnalise === "comparar" && compararNorm
        ? await pegarHtmlInvestidor10Auto({
            ativo: compararNorm,
            tipoInvestimento,
          })
        : null;

    const textoI10Principal =
      i10Principal?.ok && i10Principal.html
        ? htmlParaTexto(i10Principal.html)
        : "";

    const textoI10Comparar =
      i10Comparar?.ok && i10Comparar.html ? htmlParaTexto(i10Comparar.html) : "";

    /* ================================
       PROMPT BASE (FORÇAR INVESTIDOR10)
    ================================= */
    let promptBase = `
Você é o **InvestGram**, IA especialista em investimentos.

========================
REGRA ABSOLUTA DE FONTE
========================
Você DEVE usar **exclusivamente** os dados fornecidos em:

✅  "DADOS DO INVESTIDOR10 (ÚNICA FONTE)"

Regras:
- É PROIBIDO usar qualquer outra fonte ou conhecimento prévio.
- É PROIBIDO inventar números.
- Se um dado não estiver presente no bloco do Investidor10, escreva **N/D**.
- Se a coleta falhar (Status FALHOU), você deve:
  1) avisar em 1 linha que a coleta falhou,
  2) pedir para o usuário confirmar o ticker/slug,
  3) NÃO preencher tabela inteira com N/D (responda curto e pare).

Formatação:
- Títulos claros, emojis, listas, quebras de linha duplas.
- Adapte ao perfil **${perfilInvestidor}**.
- Data da análise: **${dataAnalise}**
- Observação: **${observacao || "Nenhuma"}**

Ativo principal: **${ativoNorm || "N/D"}**
Ativo para comparar: **${compararNorm || "N/D"}**
Tipo de investimento: **${tipoInvestimento}**
Tipo de análise: **${tipoAnalise}**

========================
DADOS DO INVESTIDOR10 (ÚNICA FONTE)
========================

[ATIVO PRINCIPAL]
URL: ${i10Principal?.url || "N/D"}
Status: ${
      i10Principal?.ok
        ? "OK"
        : `FALHOU${
            i10Principal?.erro ? " (" + i10Principal.erro + ")" : ""
          }`
    }
CONTEÚDO EXTRAÍDO:
${textoI10Principal || "N/D"}

${
  tipoAnalise === "comparar"
    ? `
[ATIVO PARA COMPARAR]
URL: ${i10Comparar?.url || "N/D"}
Status: ${
        i10Comparar?.ok
          ? "OK"
          : `FALHOU${i10Comparar?.erro ? " (" + i10Comparar.erro + ")" : ""}`
      }
CONTEÚDO EXTRAÍDO:
${textoI10Comparar || "N/D"}
`
    : ""
}

========================
INSTRUÇÃO FINAL
========================
Gere a resposta usando SOMENTE o bloco do Investidor10 acima, seguindo a estrutura do tipo de análise.
`;

    /* ================================
       PROMPTS ESPECÍFICOS
    ================================= */
    let promptFinal = "";

    // ✅ Renda fixa: não tenta Investidor10 (não existe ticker padrão)
    if (tipoInvestimento === "renda_fixa") {
      promptFinal = `
Você é o **InvestGram**, especialista em renda fixa no Brasil.

Regras:
- Não invente taxas, rentabilidades ou "melhor CDB do mercado".
- Se faltar informação, peça o que falta em checklist (bem direto).
- Foque: indexador (CDI/IPCA/Prefixado), prazo, liquidez, carência, IR, FGC, risco do emissor.

Dados do usuário:
- Produto (descrição): ${ativo || "N/D"}
- Data: ${dataAnalise}
- Observação: ${observacao || "Nenhuma"}
- Perfil: ${perfilInvestidor}

Entregue:
📌 Resumo do produto (com base no que foi informado)
📊 Checklist do que falta (emissor, %CDI/taxa, prazo, liquidez, FGC, carência, etc.)
⚠️ Riscos e armadilhas comuns
🎯 Conclusão para o perfil ${perfilInvestidor}
`;
    } else if (tipoInvestimento === "montar_carteira") {
      promptFinal = `
Você é o **InvestGram**, IA especialista em investimentos brasileiros.

Regras:
- Não prometa ganhos.
- Não invente “dados do mercado”.
- Seja prático e adaptado ao perfil **${perfilInvestidor}**.

Monte uma carteira diversificada conforme o perfil **${perfilInvestidor}**:

📊 Percentuais por classe (use faixas plausíveis)
🏛 Ações (exemplos por setor)
🏢 FIIs (tijolo/papel/híbrido)
💵 Renda fixa
⚠️ Riscos
🎯 Conclusão estratégica
`;
    } else if (tipoAnalise === "completa") {
      promptFinal = `
${promptBase}

Gere uma **análise completa** contendo:

📌 **1. Resumo do Ativo**
📊 **2. Tabela Rápida**
- Preço/Cotação
- P/L, P/VP, ROE
- Liquidez diária
- Dividendos últimos 12m
- DY 12m
- Setor/Segmento
- Se FII: Vacância, tipo (papel/tijolo/híbrido), VP/patrimônio (se existir)

📈 **3. Fundamentos**
📉 **4. Análise Técnica Simplificada** (não invente números)
⚠️ **5. Riscos relevantes**
🎯 **6. Conclusão personalizada**
`;
    } else if (tipoAnalise === "fundamentalista") {
      promptFinal = `
${promptBase}

Gere uma **análise fundamentalista** com:
📌 Resumo
📊 Tabela com múltiplos que existirem no texto (P/L, P/VP, ROE, ROIC, margens, dívida, caixa…)
⚠️ Riscos
🎯 Conclusão para o perfil ${perfilInvestidor}
`;
    } else if (tipoAnalise === "tecnica") {
      promptFinal = `
${promptBase}

Gere uma **análise técnica** com:
📈 Tendência principal (se houver base no texto)
📉 Suportes (somente se houver base; senão N/D)
📈 Resistências (somente se houver base; senão N/D)
📊 Volatilidade (se houver)
⚠️ Alertas técnicos
`;
    } else if (tipoAnalise === "dividendos") {
      promptFinal = `
${promptBase}

Gere uma análise focada em **Dividendos**:
💰 Histórico (se existir no texto)
📦 Consistência (se existir no texto)
📊 Dividend Yield (se existir no texto)
⚠️ Riscos de corte
🎯 Conclusão para o perfil ${perfilInvestidor}
`;
    } else if (tipoAnalise === "fii") {
      promptFinal = `
${promptBase}

Gere uma análise de **FII**:
🏢 Tipo (papel/tijolo/híbrido) (se existir)
📊 Vacância (se existir)
🏛 Gestão (sem inventar fatos)
📜 Informações operacionais (somente se existir)
💰 Dividendos (se existir)
⚠️ Riscos
🎯 Conclusão
`;
    } else if (tipoAnalise === "comparar") {
      promptFinal = `
${promptBase}

Gere análise comparativa entre **${ativoNorm}** e **${compararNorm}**:

🆚 **1. Tabela lado a lado**
- Setor/Segmento
- Preço/Cotação
- P/L, P/VP, ROE
- DY 12m
- Liquidez
- Pontos de atenção

📈 **2. Quem parece mais barato** (só se houver base)
📉 **3. Quem parece mais arriscado** (conceitual com base no texto)
🎯 **4. Melhor para o perfil ${perfilInvestidor}**
`;
    } else if (tipoAnalise === "setor") {
      promptFinal = `
${promptBase}

Compare **${ativoNorm}** com o setor (somente se o texto trouxer referência de setor/segmento e múltiplos):
🏭 Contexto do setor
📉 Caro/barato (somente se houver múltiplos)
⚠️ Riscos setoriais
🎯 Conclusão para ${perfilInvestidor}
`;
    } else if (tipoAnalise === "resumo") {
      promptFinal = `
${promptBase}

Gere um **resumo executivo** com no máximo 6 linhas:
📌 O que é o ativo
📊 2 indicadores (se existirem)
⚠️ 1 risco principal
🎯 Decisão rápida para ${perfilInvestidor}
`;
    } else {
      // fallback
      promptFinal = `${promptBase}\n\nGere a análise solicitada com base somente no texto.`;
    }

    /* ================================
       SE COLETA FALHOU E ERA PRA BUSCAR, RESPONDE CURTO (evita gastar token)
    ================================= */
    if (
      deveBuscarInvestidor10 &&
      tipoInvestimento !== "montar_carteira" &&
      tipoInvestimento !== "renda_fixa" &&
      (!i10Principal || !i10Principal.ok)
    ) {
      return respostaStream(
        `❌ A coleta de dados para o ativo principal (${ativoNorm || ativo || "N/D"}) falhou.\n\n` +
          `URL tentada: ${i10Principal?.url || "N/D"}\n` +
          `Motivo: ${i10Principal?.erro || "N/D"}\n\n` +
          `Confirme o ticker/slug e tente novamente.\n` +
          `Exemplos: HGLG11, PETR4, IVVB11, IBOV, SPX, NVDA, OURO.`
      );
    }

    /* ================================
       CHAMADA GEMINI COM TIMEOUT
    ================================= */
    const resposta = await gerarGeminiComTimeout(
      () => model.generateContent(promptFinal),
      25000
    );

    const texto = await resposta.response.text();
    return respostaStream(texto);
  } catch (err) {
    console.error("Erro InvestGram API:", err);
    return erro("Erro interno no servidor.");
  }
}

/* ================================
   INVESTIDOR10 HELPERS
================================ */

function normSlug(input?: string) {
  return (input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/&/g, "and")
    .replace(/[^\w]/g, ""); // remove símbolos/espacos
}

function ajustarTicker(tipo: string, t?: string) {
  const x = (t || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!x) return x;

  // FIIs/ETFs BR: normalmente terminam com 11
  if ((tipo === "fii" || tipo === "etf") && !/\d{2}$/.test(x)) return `${x}11`;

  return x;
}

function slugPorTipo(tipo: string, ativo: string) {
  const s = normSlug(ativo);
  if (!s) return "";

  if (tipo === "indices") {
    const aliases: Record<string, string> = {
      ibov: "ibov",
      ibovespa: "ibov",
      spx: "spx",
      sp500: "spx",
      sandp500: "spx",
      nasdaq: "ixic",
      ixic: "ixic",
      dowjones: "dji",
      dji: "dji",
    };
    return aliases[s] || s;
  }

  if (tipo === "commodities") {
    const aliases: Record<string, string> = {
      ouro: "ouro",
      gold: "ouro",
      petroleo: "petroleo",
      oil: "petroleo",
      brent: "brent",
      wti: "wti",
    };
    return aliases[s] || s;
  }

  // globais normalmente é o ticker (nvda, aapl, msft…)
  return s;
}

function montarUrlInvestidor10(tipoInvestimento: string, ativo: string) {
  const base = "https://investidor10.com.br";
  const slug = slugPorTipo(tipoInvestimento, ativo);
  if (!slug) return null;

  if (tipoInvestimento === "fii") return `${base}/fiis/${slug}/`;
  if (tipoInvestimento === "acoes") return `${base}/acoes/${slug}/`;
  if (tipoInvestimento === "etf") return `${base}/etfs/${slug}/`;

  if (tipoInvestimento === "indices") return `${base}/indices/${slug}/`;
  if (tipoInvestimento === "globais") return `${base}/stocks/${slug}/`;
  if (tipoInvestimento === "commodities") return `${base}/commodities/${slug}/`;

  return null;
}

async function fetchComTimeout(url: string, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function pegarHtmlInvestidor10Auto(opts: {
  ativo: string;
  tipoInvestimento: string;
}) {
  const base = "https://investidor10.com.br";
  const slugGeral = normSlug(opts.ativo);
  if (!slugGeral)
    return { ok: false, url: "N/D", html: "", erro: "Ativo inválido" };

  const tentativas: string[] = [];
  const push = (u: string | null) => {
    if (u && !tentativas.includes(u)) tentativas.push(u);
  };

  // 1) tenta pelo tipo selecionado (URL direta correta)
  push(montarUrlInvestidor10(opts.tipoInvestimento, opts.ativo));

  // 2) fallback (se usuário escolheu o tipo errado)
  if (slugGeral.endsWith("11")) {
    push(`${base}/fiis/${slugGeral}/`);
    push(`${base}/etfs/${slugGeral}/`);
  }

  // tenta outros caminhos comuns
  push(`${base}/acoes/${slugGeral}/`);
  push(`${base}/fiis/${slugGeral}/`);
  push(`${base}/etfs/${slugGeral}/`);
  push(`${base}/indices/${slugGeral}/`);
  push(`${base}/stocks/${slugGeral}/`);
  push(`${base}/commodities/${slugGeral}/`);

  let lastErro = "";
  for (const url of tentativas) {
    try {
      const res = await fetchComTimeout(url, 12000);
      if (res.ok) {
        const html = await res.text();
        return { ok: true, url, html, erro: "" };
      }
      lastErro = `HTTP ${res.status}`;
    } catch (e: any) {
      lastErro = e?.message || "Falha no fetch";
    }
  }

  return { ok: false, url: tentativas[0] || "N/D", html: "", erro: lastErro };
}

function htmlParaTexto(html: string) {
  const cleaned = (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(div|p|li|tr|br|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // limita tamanho pra não estourar tokens/tempo
  return cleaned.slice(0, 12000);
}

/* ================================
   GEMINI TIMEOUT HELPER
================================ */
async function gerarGeminiComTimeout<T>(fn: () => Promise<T>, ms: number) {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout Gemini")), ms)
    ),
  ]);
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
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
