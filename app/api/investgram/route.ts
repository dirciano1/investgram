import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Nomes vindos do front (page.tsx)
    const {
      tipoInvestimento, // "acoes" | "fii" | "etf" | "renda_fixa"
      ativo,            // PETR4, HGLG11, IVVB11, Tesouro IPCA+
      perfilInvestidor, // "conservador" | "moderado" | "agressivo"
      focoAnalise,      // "dividendos" | "valorizacao" | "crescimento" | "renda_passiva"
      dataAnalise,      // dd/mm/yyyy (texto)
      observacao,       // opcional
    } = body;

    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando (tipo, ativo, perfil, foco, data)." },
        { status: 400 }
      );
    }

    // Só pra ter algo em "objetivo" no prompt (já que tiramos do form)
    const objetivo = "não informado";

    // --- checagem da chave ---
    if (!process.env.GEMINI_API_KEY) {
      console.error("Faltando GEMINI_API_KEY no ambiente.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    // ================================
    // 🔹 GEMINI 2.5 FLASH
    // ================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ================================
    // 🔹 PROMPT DA ANÁLISE
    // ================================
   const prompt = `

Você é o InvestGram, IA especialista em ativos brasileiros. 
Gere uma análise extremamente organizada, didática e limpa.

-------------------------
REGRAS GERAIS
-------------------------
- Nunca invente números absurdos.
- Use valores aproximados e realistas.
- Dados desconhecidos devem ser: **N/D (Não disponível)** — nunca escreva “não encontrado”.
- Toda resposta deve ser dividida em seções claras, com espaçamento.
- Use títulos com emojis simples.
- Evite textos longos demais. Prefira blocos curtos.
- SEMPRE inclua uma **Tabela Rápida** no início.
- Nunca traga dados “futuros”. Sempre considere dados próximos da realidade atual.
- Quando houver variações de mercado, use intervalos aproximados.
- Contextualize a recomendação de acordo com o perfil: ${perfilInvestidor}.
- Adapte a análise ao foco escolhido: ${focoAnalise}.

-------------------------
DADOS PARA ANÁLISE
-------------------------
Tipo: ${tipoInvestimento}
Ativo: ${ativo}
Perfil do investidor: ${perfilInvestidor}
Foco da análise: ${focoAnalise}
Data da análise: ${dataAnalise}
Observação extra: ${observacao || "Nenhuma"}

-------------------------
ESTRUTURA OBRIGATÓRIA DA RESPOSTA
-------------------------

📌 **1. Resumo do Ativo**
Descreva rapidamente o que é, setor, tipo e como funciona.

📊 **2. Tabela Rápida (somente dados úteis)**
Exemplo:
- Preço atual aproximado: R$ XX,XX  
- Dividend Yield 12m: XX%  
- Dividendos pagos últimos 12m: R$ X,XX  
- P/L: XX  
- P/VP: XX  
- ROE: XX%  
- Liquidez diária aproximada: R$ XX milhões  
- Setor / Segmento: texto  
- Vacância (se FII de tijolo): XX%  
- Tipo de carteira (FII): papel, tijolo, híbrido  
- Endividamento (ações): Dívida líquida / EBITDA  
Sempre responder com números realistas ou N/D.

📌 **3. Fundamentos**
Explique os principais pontos:
- Qualidade da gestão  
- Crescimento de lucros/receitas  
- Endividamento saudável ou não  
- Dividendos (consistência)  
- P/VP / P/L interpretados  

📈 **4. Análise Técnica Simplificada**
Sem exagero:
- Tendência geral  
- Suporte e resistência aproximados  
- Volatilidade  
- Sentimento do mercado  

⚠️ **5. Riscos**
Mencione apenas os principais e de forma clara.

🎯 **6. Conclusão Personalizada**
Recomendação baseada em:
- Perfil: ${perfilInvestidor}
- Foco: ${focoAnalise}

Frases curtas, diretas, estilo relatório profissional.

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    // 👇 agora bate com o que o front espera: "resposta"
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


