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
Você é o InvestGram, uma IA especialista em análise de investimentos do mercado brasileiro,
e deve gerar análises completas, profissionais e atualizadas.

====================================================
🎯 OBJETIVO DA SUA RESPOSTA
====================================================
Gerar uma análise clara, organizada e baseada nos dados mais recentes possíveis,
incluindo indicadores quantitativos REALISTAS.  
Nunca escreva "não encontrado", "N/D" ou "data futura".  
Quando não houver número exato, forneça uma FAIXA REALISTA ou MÉDIA DO MERCADO.

====================================================
📊 ESTRUTURA OBRIGATÓRIA DA RESPOSTA
====================================================

1️⃣ **Resumo do Ativo (curto e direto)**
- O que é, setor, segmento e características principais.

2️⃣ **Tabela Rápida (sempre incluir números realistas):**
- Preço atual aproximado (R$)
- Variação 12 meses (%)
- Dividend Yield 12 meses (%)
- Dividendos pagos no último ano (R$)
- P/L
- P/VP
- ROE (%)
- Margem líquida (%)
- Dívida Líquida / EBITDA
- Liquidez diária
- Setor e subsetor
- Para FIIs: vacância, cap rate, tipo dos imóveis, valor patrimonial
- Para ETFs: índice replicado, taxa de administração, principais posições
- Para renda fixa: indexador, taxa, prazo, liquidez, risco do emissor

(Quando não souber exatamente, entregue valores típicos e coerentes com o ativo real.)

3️⃣ **Fundamentos**
- Explique o que os números significam para o investidor.

4️⃣ **Análise Técnica (alto nível e objetiva)**
- Tendência
- Suportes e resistências importantes
- Volatilidade
- Projeção aproximada

5️⃣ **Riscos**
- Riscos relevantes para o ativo escolhido.

6️⃣ **Conclusão alinhada ao usuário**
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise}
- Tipo de investimento: ${tipoInvestimento}
- Observação extra: ${observacao || "nenhuma"}

Forneça uma recomendação coerente com o perfil e foco do investidor.

====================================================
📌 DADOS RECEBIDOS DO USUÁRIO
====================================================
Tipo de investimento: ${tipoInvestimento}
Ativo: ${ativo}
Perfil: ${perfilInvestidor}
Foco: ${focoAnalise}
Data da análise: ${dataAnalise}
Observação: ${observacao || "nenhuma"}

====================================================
⚠️ REGRAS IMPORTANTES
====================================================
- Nunca informe valores impossíveis ou fora da realidade do ativo.
- Quando não tiver precisão, dê um intervalo realista.
- Nunca escreva "não encontrado".
- Sempre responda como um analista profissional.
- Não invente dados absurdos.
- Mantenha o texto organizado com seções e subtítulos claros.
`;

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

