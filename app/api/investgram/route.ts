import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada." },
        { status: 500 }
      );
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

    if (!tipoInvestimento)
      return NextResponse.json({ error: "Tipo é obrigatório." }, { status: 400 });

    if (tipoInvestimento !== "montar_carteira" && !ativo)
      return NextResponse.json({ error: "Ativo é obrigatório." }, { status: 400 });

    if (!dataAnalise)
      return NextResponse.json({ error: "Data é obrigatória." }, { status: 400 });

    if (!perfilInvestidor)
      return NextResponse.json({ error: "Perfil é obrigatório." }, { status: 400 });

    if (!focoAnalise)
      return NextResponse.json({ error: "Foco é obrigatório." }, { status: 400 });

    // -------------------------------
    // PROMPT FINAL
    // -------------------------------
    const prompt = `
Você é o InvestGram, especializado no mercado brasileiro.

Gere uma análise estruturada para:

• Tipo: ${tipoInvestimento}
• Ativo: ${ativo || "Carteira"}
• Perfil: ${perfilInvestidor}
• Foco: ${focoAnalise}
• Data solicitada: ${dataAnalise}
• Observação adicional: ${observacao || "Nenhuma"}

REGRAS:
- Sempre inclua uma *Tabela Rápida* com dados essenciais.
- Nunca use "não encontrado" — utilize "N/D".
- Traga números reais quando possível.
- Organize com títulos, listas e ícones discretos.
- Se o ativo for FII, inclua vacância, dividend yield, setor e qualidade dos imóveis.
- Se for ação, inclua P/L, P/VP, ROE, margem, dívida líquida/EBITDA.
- Se for ETF, descreva composição, taxa, benchmark e risco.
- Se for renda fixa, taxa, tipo, emissor e risco.
- Se for carteira, gere a alocação balanceada com percentuais recomendados.
`;

    // -------------------------------
    // CHAMANDO A API DO GEMINI (STREAM)
    // -------------------------------
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            google_search: {},
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => null);
      console.error("Erro Gemini:", err);

      return NextResponse.json(
        { error: "Erro ao chamar o Gemini", details: err },
        { status: 500 }
      );
    }

    // -------------------------------
    // STREAM PARA O CLIENTE
    // -------------------------------
    const reader = apiResponse.body!.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          controller.enqueue(decoder.decode(value));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 200,
    });
  } catch (err) {
    console.error("Erro InvestGram:", err);
    return NextResponse.json(
      { error: "Erro interno do InvestGram." },
      { status: 500 }
    );
  }
}
