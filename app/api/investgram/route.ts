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
=========================
REGRAS ESPECIAIS PARA "montar_carteira"
=========================
Se o tipo de investimento for **montar_carteira**, siga estas regras:

1. **A carteira deve ser dividida por percentual**, de acordo com o perfil do investidor:
   - Perfil conservador:
     - 70% Renda Fixa
     - 15% Ações Perenes
     - 10% FIIs Diversificados
     - 5% Caixa
   - Perfil moderado:
     - 40% Renda Fixa
     - 35% Ações Perenes e de Crescimento
     - 20% FIIs Diversificados
     - 5% Caixa
   - Perfil agressivo:
     - 20% Renda Fixa
     - 50% Ações de Crescimento e Setores Cíclicos
     - 25% FIIs Diversificados
     - 5% Caixa

2. **A carteira deve sempre incluir empresas perenes e de alta liquidez**, como:
   - Financeiro: **Banco do Brasil (BBAS3)** ou **Itaú (ITUB4)**
   - Energia: **Engie Brasil (EGIE3)** ou **Energias do Brasil (ENBR3)**
   - Commodities: **Vale (VALE3)** ou **Petrobras (PETR4)**
   - Varejo consolidado: **WEGE3**, **LREN3** (somente para perfis moderado/agressivo)

3. **Diversificação para FIIs obrigatória**, contemplando:
   - Papel: **MXRF11**, **HGLG11**, **KNCR11**
   - Tijolo: **HGLG11**, **GGRC11**, **BCFF11**
   - Agro/Recebíveis Específicos: **RZAG11**, **CAGR11**  
   *Use sempre ativos de alta liquidez. Se não tiver certeza, escreva “N/D”.*

4. **A resposta deve conter estas seções:**

📌 **1. Estratégia Geral da Carteira**  
Explique a lógica adotada conforme o perfil do investidor.

📊 **2. Distribuição em Percentuais**  
Liste exatamente assim (com negrito):  
- **Renda Fixa:** XX%  
- **Ações:** XX%  
- **FIIs:** XX%  
- **Caixa:** XX%

🏛 **3. Ações Recomendadas (alta liquidez)**  
Escolha empresas adequadas ao perfil, sempre perenes ou grandes blue chips.

🏢 **4. FIIs Recomendados (diversificação obrigatória)**  
Inclua pelo menos 1 papel, 1 tijolo, 1 agro.  
Use sempre liquidez alta.

📈 **5. Justificativa da Carteira**  
Explique o porquê de cada classe ter aquele peso.

⚠️ **6. Riscos da Estratégia**  
Riscos reais, sem inventar dados numéricos.

🎯 **7. Conclusão Personalizada**  
Resumo e recomendação final conforme o perfil e foco do usuário.

Observações importantes:
- Nunca invente preços; se precisar, coloque **N/D**.
- Sempre que não tiver confiança sobre liquidez de um FII, coloque “alta liquidez aproximada” ou “N/D”.
- Não retorne nada colado; sempre use DUAS quebras de linha entre seções.


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



