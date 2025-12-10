import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tipoInvestimento,   // "acoes" | "fii" | "etf" | "renda_fixa"
      ativo,              // PETR4, HGLG11, IVVB11, Tesouro IPCA+
      perfilInvestidor,   // conservador | moderado | agressivo
      focoAnalise,        // dividendos | crescimento | valorização | renda_passiva
      dataAnalise,        // dd/mm/yyyy (texto)
      observacao,         // opcional
    } = body;

    // validação simples
    if (!tipoInvestimento || !ativo || !perfilInvestidor || !focoAnalise || !dataAnalise) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    // ================================
    // GEMINI 2.5 FLASH
    // ================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ================================
    // PROMPT AJUSTADO
    // ================================
    const tipoLabelMap: Record<string, string> = {
      acoes: "Ações",
      fii: "Fundos Imobiliários (FII)",
      etf: "ETFs",
      renda_fixa: "Renda Fixa",
    };

    const tipoLabel = tipoLabelMap[tipoInvestimento] ?? tipoInvestimento;

    const prompt = `
Você é o InvestGram, uma IA especialista em análise de investimentos.

Gere uma resposta **em português do Brasil**, bem estruturada, sem enrolação, seguindo EXATAMENTE o formato abaixo.

⚠️ REGRAS IMPORTANTES:
- NÃO comece com "Olá", não se apresente, não fale em primeira pessoa.
- NÃO coloque disclaimer longo no final (no máximo 1 linha curta, se quiser).
- Seja objetivo, claro e profissional.
- Use títulos com "##" e listas com "-", como markdown.
- Foque em números: dividendos, preço, variação, múltiplos, risco e recomendação.
- Se algum número for apenas aproximado, deixe claro com "aprox." ou "faixa".

DADOS DO CONTEXTO:
- Tipo de investimento: ${tipoLabel}
- Ativo: ${ativo}
- Perfil do investidor: ${perfilInvestidor}
- Foco da análise: ${focoAnalise}
- Data da análise: ${dataAnalise}
- Observação do usuário: ${observacao || "nenhuma observação adicional"}

=== FORMATO EXATO QUE VOCÊ DEVE USAR ===

## Visão geral do ativo
- Explique em 3 a 6 frases o que é o ativo, setor, características principais e nível geral de risco.

## Números-chave (fundamentalistas)
Liste em formato de bullet, tentando preencher o máximo possível de forma realista (sem inventar absurdos):
- Preço atual aproximado da cota/ação (em R$)
- Dividend Yield 12m (em %)
- Variação no ano (YTD) em %
- Máxima e mínima em 12 meses (se souber, use faixa aproximada)
- P/L (Preço/Lucro)
- P/VP (Preço/Valor Patrimonial)
- ROE (Retorno sobre Patrimônio)
- Dívida Líquida / EBITDA (ou indicador de alavancagem similar)
- Se for FII, inclua: vacância, tipo do fundo, valor patrimonial por cota, qualidade da carteira.
- Se for renda fixa, foque em: taxa, vencimento, liquidez, risco do emissor, garantia.

Se não tiver certeza de algum item, escreva algo como:
- P/L: faixa baixa (histórico de múltiplos abaixo da média do setor)

## Leitura para o perfil e foco do investidor
Explique como esse ativo se encaixa para:
- Perfil: ${perfilInvestidor}
- Foco: ${focoAnalise}

Ajuste seu tom:
- Se for conservador: enfatize risco, preservação de capital e estabilidade.
- Se for moderado: equilíbrio entre risco e retorno.
- Se for agressivo: potencial de retorno, volatilidade e timing.

Mostre:
- Se o ativo combina ou não com esse perfil.
- Como esse ativo pode contribuir para a carteira no foco escolhido.

## Principais riscos
Liste entre 3 e 6 riscos claros, por exemplo:
- Risco de mercado / setorial
- Risco político / regulatório
- Risco de governança
- Risco de liquidez
- Risco de concentração etc.

## Conclusão final (resumida e prática)
Traga de 3 a 5 bullets, bem diretos, do tipo:
- ✅ Pontos fortes mais importantes
- ⚠️ Pontos de atenção que exigem cuidado
- 🎯 Para o perfil ${perfilInvestidor}, esse ativo tende a ser [adequado / parcialmente adequado / pouco adequado]
- Sugestão geral: observação de uso (ex: posição pequena, médio prazo, foco em dividendos, etc.)

Lembre-se:
- Seja objetivo.
- Não escreva mais do que ~900 palavras.
- Não repita blocos desnecessariamente.
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
