// app/api/investgram/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash"; // pode trocar por outro modelo

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

    // -------------------------------------
    //  VALIDAÇÕES
    // -------------------------------------
    if (!tipoInvestimento)
      return NextResponse.json(
        { error: "Tipo de investimento é obrigatório." },
        { status: 400 }
      );

    if (tipoInvestimento !== "montar_carteira" && !ativo)
      return NextResponse.json(
        { error: "Ativo é obrigatório." },
        { status: 400 }
      );

    if (!dataAnalise)
      return NextResponse.json(
        { error: "Data da análise é obrigatória." },
        { status: 400 }
      );

    if (!perfilInvestidor)
      return NextResponse.json(
        { error: "Perfil do investidor é obrigatório." },
        { status: 400 }
      );

    if (!focoAnalise)
      return NextResponse.json(
        { error: "Foco da análise é obrigatório." },
        { status: 400 }
      );

    // -------------------------------------
    // CRIA O PROMPT BASEADO NO TIPO
    // -------------------------------------
    const prompt = `
Você é o InvestGram, especialista em análises do mercado brasileiro.
Gere uma análise estruturada para:

Tipo: ${tipoInvestimento}
Ativo: ${ativo || "Carteira"}
Perfil: ${perfilInvestidor}
Foco: ${focoAnalise}
Data: ${dataAnalise}
Observação: ${observacao || "Nenhuma"}

REGRAS:
- Sempre inclua uma TABELA RÁPIDA com métricas essenciais.
- Nunca escreva "não encontrado", use "N/D".
- Use dados mais recentes possíveis.
- Organize a resposta com títulos, bullets e emojis discretos.
`;

    // -------------------------------------
    // CHAMADA À API DO GEMINI VIA HTTP (STREAM)
    // -------------------------------------
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
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

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Erro API Gemini:", errData);
      return NextResponse.json(
        { error: "Falha ao chamar o Gemini", details: errData },
        { status: 500 }
      );
    }

    // -------------------------------------
    //  STREAM DE RESPOSTA (SEM ESTOURAR 25s)
    // -------------------------------------
    const reader = response.body!.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value);
          controller.enqueue(chunkText);
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
      { error: "Erro interno no InvestGram" },
      { status: 500 }
    );
  }
}
