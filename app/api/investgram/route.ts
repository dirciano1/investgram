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

    // ================================
    // 🔹 VALIDAÇÕES
    // ================================
    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando (tipo, ativo, perfil, foco, data)." },
        { status: 400 }
      );
    }

    const objetivo = "não informado";

    if (!process.env.GEMINI_API_KEY) {
      console.error("Faltando GEMINI_API_KEY no ambiente.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    // ================================
    // 🔹 GOOGLE GEMINI
    // ================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ================================
    // 🔹 PROMPT FINAL, FECHADO CORRETAMENTE
    // ================================
    const prompt = `
Você é o InvestGram, IA especialista em ativos brasileiros. Gere uma análise extremamente organizada, limpa e realista.

==========================
REGRAS GERAIS
==========================
- Nunca invente números absurdos.
- Use valores aproximados e compatíveis com o mercado.
- Dados desconhecidos devem ser: **N/D (Não disponível)** — nunca escreva “não encontrado”.
- Estruture a resposta com seções claras e bem espaçadas.
- Use títulos com emojis simples.
- Respostas diretas, estilo relatório.
- Inclua SEMPRE uma **Tabela Rápida**.
- SEMPRE usar dados próximos da realidade atual (nunca dados futuros).
- Recomende com base no perfil: **${perfilInvestidor}**.
- Ajuste a análise ao foco: **${focoAnalise}**.

==========================
DADOS DA ANÁLISE
==========================
Tipo: ${tipoInvestimento}
Ativo: ${ativo}
Perfil: ${perfilInvestidor}
Foco: ${focoAnalise}
Data: ${dataAnalise}
Objetivo: ${objetivo}
Observação: ${observacao || "Nenhuma"}

==========================
ESTRUTURA OBRIGATÓRIA
==========================

📌 **1. Resumo do Ativo**
- Explique o que é o ativo.
- Setor, funcionamento, natureza.

📊 **2. Tabela Rápida (somente dados úteis)**
Lista em texto, assim:
- Preço aproximado: R$ XX,XX  
- Dividend Yield 12m: XX%  
- Dividendos últimos 12m: R$ X,XX  
- P/L: XX  
- P/VP: XX  
- ROE: XX%  
- Liquidez diária: R$ XX milhões  
- Vacância (se FII de tijolo): XX%  
- Tipo de carteira: papel / tijolo / híbrido  
- Endividamento (ações): Dívida Líquida / EBITDA  
Use números realistas ou **N/D**.

📌 **3. Fundamentos**
- Qualidade da gestão  
- Histórico de lucro e crescimento  
- Dividendos  
- Valuation (P/L, P/VP)  
- Endividamento  

📈 **4. Análise Técnica (Simplificada)**
- Tendência  
- Suportes e resistências aproximados  
- Volatilidade  
- Sentimento do mercado  

⚠️ **5. Riscos**
Liste apenas riscos reais e relevantes.

🎯 **6. Conclusão Personalizada**
Baseada em:
- Perfil: ${perfilInvestidor}
- Foco: ${focoAnalise}
- Dê uma recomendação clara e profissional.
`;

    // ================================
    // 🔹 CHAMADA AO GEMINI
    // ================================
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    return NextResponse.json(
      { sucesso: true, resposta: texto },
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
