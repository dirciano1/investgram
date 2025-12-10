// app/api/investgram/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento,
      ativo,
      perfilInvestidor,
      focoAnalise,
      dataAnalise,
      observacao,
    } = body;

    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando (tipo, ativo, perfil, foco, data)." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ============================
    // PROMPT CORRIGIDO + FECHADO
    // ============================
    const prompt = `
Você é o **InvestGram**, IA especialista em análises de ativos brasileiros.

Siga estas regras:

- Nunca invente números irreais.
- Use valores aproximados e realistas.
- Dados desconhecidos → "N/D".
- Estruture a resposta em seções claras.
- Use títulos com emojis simples.
- Sempre inclua uma **Tabela Rápida**.
- Não use textos gigantes; prefira blocos curtos.
- Adapte a análise ao perfil **${perfilInvestidor}**.
- Adapte a recomendação ao foco **${focoAnalise}**.

-------------------------
DADOS PARA ANÁLISE
-------------------------
Tipo: ${tipoInvestimento}
Ativo: ${ativo}
Perfil: ${perfilInvestidor}
Foco: ${focoAnalise}
Data da análise: ${dataAnalise}
Observação: ${observacao || "Nenhuma"}

-------------------------
ESTRUTURA OBRIGATÓRIA
-------------------------

📌 **1. Resumo do Ativo**
Descrição curta e objetiva.

📊 **2. Tabela Rápida**
- Preço aproximado
- DY 12m
- Dividendos últimos 12m
- P/L
- P/VP
- ROE
- Liquidez diária
- Setor
- Vacância (se FII de tijolo)
- Tipo de carteira (FII)
- Endividamento (ações)

📌 **3. Fundamentos**
Interprete os principais indicadores.

📈 **4. Análise Técnica Simplificada**
Tendência, suportes, resistências, volatilidade.

⚠️ **5. Riscos**
Somente os relevantes.

🎯 **6. Conclusão Personalizada**
Baseada no perfil: ${perfilInvestidor}
Baseada no foco: ${focoAnalise}

Texto limpo, direto e profissional.
`;

    // ====================================
    // STREAM – igual o TalkGram (perfeito)
    // ====================================
    const result = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          controller.enqueue(text);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });

  } catch (err) {
    console.error("Erro InvestGram API:", err);
    return NextResponse.json(
      { error: "Erro interno no InvestGram" },
      { status: 500 }
    );
  }
}
