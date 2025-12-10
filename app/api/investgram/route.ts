import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento, // "acoes", "fii", "etf", "renda_fixa", "carteira_balanceada"
      ativo,            // PETR4, HGLG11, IVVB11, Tesouro IPCA+
      dataAnalise,      // "10/12/2025"
      perfilInvestidor, // "conservador" | "moderado" | "agressivo"
      focoAnalise,      // "dividendos" | "valorizacao" | "crescimento" | "renda_passiva"
      observacao,       // texto opcional
    } = body;

    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada nas variáveis de ambiente." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt: string;

    // ===========================
    // MODO 1 – MONTAR CARTEIRA
    // ===========================
    if (tipoInvestimento === "carteira_balanceada") {
      prompt = `
Você é o InvestGram, uma IA especialista em montar carteiras balanceadas de investimento.

Monte uma carteira balanceada personalizada para o investidor abaixo.

DADOS DO USUÁRIO
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise}
- Data da análise: ${dataAnalise || "não informada"}
- Ativo de referência ou exemplo inicial informado: ${ativo}
- Observação extra: ${observacao || "nenhuma"}

TAREFA
1. Sugira uma carteira completa, com porcentagem IDEAL para cada classe:
   - Caixa / Reserva de oportunidade
   - Renda fixa
   - Ações Brasil
   - Fundos imobiliários (FIIs)
   - ETFs
   - (Opcional) Ações/ETFs internacionais
2. Mostre uma TABELA textual com:
   - Classe
   - Percentual recomendado
   - Nível de risco de 1 a 5
3. Explique POR QUE essa distribuição faz sentido para o perfil "${perfilInvestidor}".
4. Dê exemplos de ativos dentro de cada classe (ex.: PETR4, HGLG11, IVVB11, Tesouro IPCA+ etc.).
5. Aponte os principais riscos da carteira.
6. Termine com um "Resumo Final InvestGram" em 3–5 frases.

IMPORTANTE
- Respeite o perfil do investidor (conservador, moderado, agressivo).
- Ajuste a exposição a risco conforme o perfil e o foco escolhido (${focoAnalise}).
- Seja direto, organizado em seções e use listas para facilitar a leitura.
      `;
    } else {
      // ===========================
      // MODO 2 – ANÁLISE DE UM ATIVO
      // ===========================
      prompt = `
Você é o InvestGram, IA especialista em análise de investimentos.

Analise o ativo abaixo com profundidade, trazendo:

1) Visão geral do ativo
   - Descrição curta
   - Setor, tipo de ativo e contexto no mercado brasileiro

2) Fundamentos (dados estimados e coerentes, não invente números absurdos)
   - Principais indicadores: DY, P/L, P/VP, ROE, margem, dívida líquida/EBITDA
   - Ponto de atenção em relação a endividamento, crescimento e geração de caixa

3) Análise qualitativa
   - Tese principal de investimento
   - Riscos específicos do ativo e do setor
   - Vantagens competitivas (se houver)

4) Análise alinhada ao investidor
   - Perfil do investidor: ${perfilInvestidor}
   - Foco da análise: ${focoAnalise}
   - Como esse ativo se encaixa em uma carteira de ${perfilInvestidor}
   - Quando ele pode fazer sentido e quando NÃO faz sentido

5) Conclusão InvestGram
   - Classifique em: "Compra", "Manter", "Observação" ou "Fora do Radar" para esse perfil
   - Explique com clareza sua conclusão

DADOS DO USUÁRIO:
- Tipo de investimento: ${tipoInvestimento}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco: ${focoAnalise}
- Data da análise: ${dataAnalise || "não informada"}
- Observação extra: ${observacao || "nenhuma"}

IMPORTANTE:
- Escreva em português do Brasil.
- Seja direto, organizado em seções com títulos.
- Não prometa retornos garantidos.
      `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    return NextResponse.json(
      {
        sucesso: true,
        resposta: texto, // para o front ler em data.resposta
        analise: texto,  // alias extra se quiser usar em outro lugar
      },
