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

    // Validar ativo somente quando o tipo NÃO for montar_carteira
if (
  !tipoInvestimento ||
  !perfilInvestidor ||
  !focoAnalise ||
  !dataAnalise ||
  (tipoInvestimento !== "montar_carteira" && (!ativo || ativo.trim() === ""))
) {
  return NextResponse.json(
    { error: "Campos obrigatórios faltando." },
    { status: 400 }
  );
}

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY não configurada!");
      return NextResponse.json(
        { error: "GEMINI_API_KEY ausente." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // PROMPT OTIMIZADO (SEM QUEBRAR FORMATAÇÃO)
    const prompt = `
Você é o InvestGram, IA especialista em ativos brasileiros.

=========================
REGRAS
=========================
- Nunca invente números irreais.
- Use apenas valores aproximados plausíveis.
- Sempre que não souber um dado escreva: **N/D**.
- Organize tudo em seções claras.
- Use títulos com emojis simples.
- Nunca retorne texto grudado. Sempre use quebras de linha duplas.
- Adapte a recomendação para o perfil: ${perfilInvestidor}.
- Ajuste a análise ao foco: ${focoAnalise}.
- Não traga dados futuros. Apenas referências aproximadas reais.

=========================
DADOS DO USUÁRIO
=========================
Tipo: ${tipoInvestimento}
Ativo: ${ativo}
Perfil: ${perfilInvestidor}
Foco: ${focoAnalise}
Data da análise: ${dataAnalise}
Observação: ${observacao || "Nenhuma"}

=========================
ESTRUTURA DA RESPOSTA
=========================

📌 **1. Resumo do Ativo**
Texto curto sobre o que é, setor e características principais.

📊 **2. Tabela Rápida (obrigatório neste formato)**  
Responda exatamente assim (um item por linha):  
- Preço aproximado: R$ XX  
- DY 12m: XX%  
- Dividendos últimos 12m: R$ XX  
- P/L: XX  
- P/VP: XX  
- ROE: XX%  
- Liquidez diária: R$ XX milhões  
- Setor: texto  
- Vacância (FII): XX% ou N/D  
- Tipo de carteira (FII): papel / tijolo / híbrido / N/D  
- Dívida líquida / EBITDA: XX ou N/D  

Nunca junte dois itens na mesma linha.
Nunca escreva tudo colado.
Sempre siga o formato "- item: valor".

📈 **3. Fundamentos**
- Gestão
- Crescimento de resultados
- Endividamento
- Consistência de dividendos
- Interpretação de múltiplos (P/L, P/VP etc.)

📉 **4. Análise Técnica Simplificada**
- Tendência
- Suportes/resistências
- Volatilidade

⚠️ **5. Riscos**
Citar somente riscos relevantes do ativo.

🎯 **6. Conclusão Personalizada**
Recomendação alinhada ao perfil e foco do usuário.

Retorne tudo bem formatado com quebras de linha.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

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
      { error: "Erro interno na API do InvestGram." },
      { status: 500 }
    );
  }
}


