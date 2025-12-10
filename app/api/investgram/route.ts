import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      // nomes antigos (se um dia usar)
      tipo,
      perfil,
      foco,
      objetivo,
      data,
      // nomes que o front atual envia
      tipoInvestimento,
      ativo,
      perfilInvestidor,
      focoAnalise,
      dataAnalise,
      observacao,
    } = body;

    const finalTipo: string = tipo || tipoInvestimento || "acoes";
    const finalAtivo: string = (ativo || "").toString();
    const finalPerfil: string =
      perfil || perfilInvestidor || "moderado";
    const finalFoco: string =
      foco || focoAnalise || "crescimento";
    const finalData: string =
      data ||
      dataAnalise ||
      new Date().toLocaleDateString("pt-BR");

    const finalObjetivo: string =
      objetivo ||
      (finalTipo === "montar_carteira"
        ? "montar_carteira_balanceada"
        : "analise_ativo_pontual");

    // Validação básica
    if (!finalTipo || !finalPerfil || !finalFoco) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando (tipo, perfil ou foco)." },
        { status: 400 }
      );
    }

    if (finalTipo !== "montar_carteira" && !finalAtivo) {
      return NextResponse.json(
        { error: "Informe o ativo para análise." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY não configurada.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const textoObservacao = observacao && observacao.trim().length
      ? observacao
      : "nenhuma";

    // Prompt diferente se for montar carteira
    const prompt =
      finalTipo === "montar_carteira"
        ? `
Você é o InvestGram, IA especialista em estratégia de investimentos e alocação de carteira.

O usuário quer MONTAR UMA CARTEIRA BALANCEADA.

DADOS DO USUÁRIO:
- Perfil do investidor: ${finalPerfil}
- Foco: ${finalFoco}
- Objetivo declarado: ${finalObjetivo}
- Data da análise: ${finalData}
- Observação extra: ${textoObservacao}

TAREFA:
1. Sugira uma alocação percentual da carteira entre:
   - Renda fixa
   - Ações Brasil
   - Ações internacionais / ETFs
   - Fundos imobiliários (FII)
   - Caixa / reserva de oportunidade
2. Explique o porquê de cada percentual, alinhando ao perfil e ao foco.
3. Se fizer sentido, sugira exemplos de ativos dentro de cada classe (ex: tipos de títulos, setores ou classes de ETFs/FIIs – NÃO precisa citar tickers específicos).
4. Mostre:
   - Nível esperado de risco/volatilidade da carteira
   - Horizonte de tempo recomendado
   - Principais riscos a observar
5. Termine com um resumo objetivo: quando essa carteira funciona bem e quando NÃO funciona.

Organize a resposta em seções claras.
`
        : `
Você é o InvestGram, IA especialista em análise de investimentos.

Analise o ativo abaixo com profundidade, trazendo:
- Descrição curta do ativo
- Principais números fundamentais
- Indicadores como DY, P/L, P/VP, ROE, dívida, crescimento
- Indicadores técnicos em alto nível (tendência, volatilidade, suportes e resistências importantes)
- Interpretação com base no foco do investidor
- Principais riscos
- Recomendação final baseada no perfil (${finalPerfil})
- Estrutura bem organizada em seções

DADOS DO USUÁRIO:
- Tipo de investimento: ${finalTipo}
- Ativo: ${finalAtivo}
- Perfil do investidor: ${finalPerfil}
- Foco: ${finalFoco}
- Objetivo: ${finalObjetivo}
- Data da análise: ${finalData}
- Observação extra: ${textoObservacao}

IMPORTANTE:
- Seja direto, claro e completo
- Não invente números absurdos: use intervalos ou ordem de grandeza quando necessário
- Gere uma análise no estilo profissional InvestGram
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    return NextResponse.json(
      {
        sucesso: true,
        analise: texto,
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
