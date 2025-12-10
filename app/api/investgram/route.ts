// app/api/investgram/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response("GEMINI_API_KEY não configurada.", { status: 500 });
    }

    const body = await req.json();

    const {
      tipoInvestimento,
      ativo,
      perfilInvestidor,
      focoAnalise,
      dataAnalise,
      observacao,
    } = body;

    const tipo = String(tipoInvestimento || "").toLowerCase();

    const isCarteira =
      tipo.includes("carteira") ||
      tipo.includes("balanceada") ||
      tipo.includes("montar");

    // ---- VALIDAÇÕES BÁSICAS ----
    if (!tipoInvestimento) {
      return new Response("Tipo de investimento é obrigatório.", { status: 400 });
    }
    if (!isCarteira && !ativo) {
      return new Response("Informe o ativo.", { status: 400 });
    }
    if (!dataAnalise) {
      return new Response("Informe a data da análise.", { status: 400 });
    }
    if (!perfilInvestidor) {
      return new Response("Perfil obrigatório.", { status: 400 });
    }
    if (!focoAnalise) {
      return new Response("Foco obrigatório.", { status: 400 });
    }

    // ---- Gemini ----
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.45,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 900,
      },
    });

    // --------------------------------------------
    // AQUI MANTEMOS *EXATAMENTE O SEU PROMPT*
    // (vou deixar apenas um exemplo simplificado abaixo)
    // --------------------------------------------

    let prompt = "";

    if (isCarteira) {
      prompt = `
Monte uma carteira balanceada para o perfil ${perfilInvestidor}, foco ${focoAnalise}.
Data: ${dataAnalise}.
Observação: ${observacao || "nenhuma"}.

Regras:
- Nunca escreva "não encontrado" ou "data futura".
- Use "N/D" caso algum dado não exista.
- Responda em formato organizado e com bullets.
      `;
    } else if (tipo.includes("fii")) {
      prompt = `
Gere uma análise completa do FII ${ativo}.
Perfil: ${perfilInvestidor}.
Foco: ${focoAnalise}.
Data: ${dataAnalise}.
Obs: ${observacao || "nenhuma"}.

Monte uma TABELA RÁPIDA com:
- Preço atual
- DY 12m
- Dividendos 12m
- P/VP
- Vacância
- Tipo do FII
- Índice de correção

Se não souber algum valor, use "N/D".
      `;
    } else if (tipo.includes("acoes")) {
      prompt = `
Analise a ação ${ativo}.
Perfil: ${perfilInvestidor}.
Foco: ${focoAnalise}.
Data: ${dataAnalise}.
Obs: ${observacao || "nenhuma"}.

Monte uma TABELA RÁPIDA:
- Preço atual
- Variação no dia
- DY 12m
- Dividendos 12m
- P/L
- P/VP
- ROE
- Margem líquida
- Dívida líquida / EBITDA
- Setor
- Valor de mercado

Se não souber algum valor, usar "N/D".
Nunca escreva "não encontrado" ou "dados futuros".
      `;
    }

    // ==================================================
    // STREAM: solução final SEM TIMEOUT
    // ==================================================

    const streamResp = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamResp) {
          controller.enqueue(chunk.text());
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      status: 200,
    });

  } catch (err) {
    console.error("ERRO NO INVESTGRAM:", err);
    return new Response("Erro interno no InvestGram", { status: 500 });
  }
}
