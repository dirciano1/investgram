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

    // =====================================================
    // PROMPT COMPLETO COM ANÁLISE + MONTAR CARTEIRA
    // =====================================================

    const prompt = `
Você é o InvestGram, IA especialista em ativos brasileiros.

=========================
REGRAS GERAIS
=========================
- Nunca invente números irreais.
- Use apenas valores aproximados plausíveis.
- Sempre que não souber um dado escreva: **N/D**.
- Organize tudo em seções claras.
- Use títulos com emojis.
- Sempre use quebras de linha duplas entre seções.
- Adapte a recomendação ao perfil: ${perfilInvestidor}.
- Ajuste a análise ao foco: ${focoAnalise}.
- Não traga dados futuros; use referências históricas aproximadas.

=========================
REGRAS ESPECIAIS PARA "montar_carteira"
=========================
Se o tipo de investimento for **montar_carteira**, siga estas regras:

1. Percentuais por perfil de investidor:
   - Conservador:
     - 70% Renda Fixa
     - 15% Ações Perenes
     - 10% FIIs Diversificados
     - 5% Caixa
   - Moderado:
     - 40% Renda Fixa
     - 35% Ações Perenes e de Crescimento
     - 20% FIIs Diversificados
     - 5% Caixa
   - Agressivo:
     - 20% Renda Fixa
     - 50% Ações de Crescimento e Setores Cíclicos
     - 25% FIIs Diversificados
     - 5% Caixa

2. Ações obrigatoriamente devem ser de alta liquidez:
   - Financeiro: **BBAS3**, **ITUB4**
   - Energia: **EGIE3**, **ENBR3**
   - Commodities: **VALE3**, **PETR4**
   - Varejo consolidado: **WEGE3**, **LREN3** (moderado/agressivo)

3. FIIs obrigatoriamente devem ter diversificação:
   - Papel: **MXRF11**, **KNCR11**
   - Tijolo: **HGLG11**, **GGRC11**
   - Agro: **RZAG11**, **CAGR11**
   - Sempre priorize FIIs líquidos.

4. Estrutura obrigatória da resposta para montar carteira:
📌 **1. Estratégia Geral da Carteira**

📊 **2. Distribuição em Percentuais**
- **Renda Fixa:** XX%
- **Ações:** XX%
- **FIIs:** XX%
- **Caixa:** XX%

🏛 **3. Ações Recomendadas (alta liquidez)**

🏢 **4. FIIs Recomendados (diversificação obrigatória)**

📈 **5. Justificativa da Carteira**

⚠️ **6. Riscos da Estratégia**

🎯 **7. Conclusão Personalizada**

=========================
ESTRUTURA DA RESPOSTA (para análises normais)
=========================

📌 **1. Resumo do Ativo**
Texto curto explicando setor e características.

📊 **2. Tabela Rápida**  
Cada item em **linha separada**, exatamente assim:
- **Preço aproximado:** R$ XX  
- **DY 12m:** XX%  
- **Dividendos últimos 12m:** R$ XX  
- **P/L:** XX  
- **P/VP:** XX  
- **ROE:** XX%  
- **Liquidez diária:** R$ XX milhões  
- **Setor:** texto  
- **Vacância (FII):** XX% ou N/D  
- **Tipo de carteira (FII):** papel / tijolo / híbrido / N/D  
- **Dívida líquida / EBITDA:** XX ou N/D  

📈 **3. Fundamentos**

📉 **4. Análise Técnica Simplificada**

⚠️ **5. Riscos**

🎯 **6. Conclusão Personalizada**

=========================
DADOS DO USUÁRIO
=========================
Tipo: ${tipoInvestimento}
Ativo: ${ativo || "N/D"}
Perfil: ${perfilInvestidor}
Foco: ${focoAnalise}
Data da análise: ${dataAnalise}
Observação: ${observacao || "Nenhuma"}
`;

    // =====================================================

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
