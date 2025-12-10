"use client";

import React, { useState, useEffect } from "react";

type TipoInvestimento = "acoes" | "fii" | "etf" | "renda_fixa";
type PerfilInvestidor = "conservador" | "moderado" | "agressivo";
type FocoAnalise =
  | "dividendos"
  | "valorizacao"
  | "crescimento"
  | "renda_passiva";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(17,24,39,0.8)",
  color: "#fff",
  marginBottom: "14px",
  outline: "none",
  transition: "0.2s",
  fontSize: "1rem",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "0.92rem",
  color: "#e5e7eb",
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  background: "#111827",
  border: "2px solid #22c55e",
  borderRadius: "16px",
  padding: "24px 22px",
  width: "90%",
  maxWidth: "420px",
  textAlign: "left",
  boxShadow: "0 0 30px rgba(34,197,94,0.3)",
};

const buttonPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #22c55e, #16a34a)",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  borderRadius: "10px",
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: "0.95rem",
};

const buttonSecondaryStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.9)",
  border: "1px solid #4b5563",
  color: "#e5e7eb",
  fontWeight: 500,
  borderRadius: "10px",
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: "0.9rem",
};

interface PerfilModalProps {
  open: boolean;
  onClose: () => void;
  onResultado: (perfil: PerfilInvestidor) => void;
}

function PerfilModal({ open, onClose, onResultado }: PerfilModalProps) {
  const [p1, setP1] = useState<string>("");
  const [p2, setP2] = useState<string>("");
  const [p3, setP3] = useState<string>("");
  const [p4, setP4] = useState<string>("");
  const [p5, setP5] = useState<string>("");

  if (!open) return null;

  function calcularPerfil() {
    const respostas = [p1, p2, p3, p4, p5];
    if (respostas.some((r) => r === "")) {
      alert("⚠️ Responda todas as perguntas para descobrir seu perfil.");
      return;
    }

    const soma = respostas.reduce((acc, r) => acc + parseInt(r, 10), 0);

    let perfil: PerfilInvestidor;
    if (soma <= 7) perfil = "conservador";
    else if (soma <= 11) perfil = "moderado";
    else perfil = "agressivo";

    onResultado(perfil);
    onClose();
  }

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContentStyle}>
        <h3
          style={{
            color: "#22c55e",
            marginBottom: "12px",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🧠 Descobrir perfil do investidor
        </h3>
        <p
          style={{
            color: "#9ca3af",
            fontSize: "0.9rem",
            marginBottom: "14px",
            lineHeight: 1.4,
          }}
        >
          Responda rápido, igual nas corretoras. Ao final, o InvestGram define
          automaticamente seu perfil.
        </p>

        {/* Pergunta 1 */}
        <div style={{ marginBottom: "12px" }}>
          <p style={labelStyle}>
            1. Qual é o principal objetivo dos seus investimentos?
          </p>
          <select
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            style={selectStyle}
          >
            <option value="">Selecione...</option>
            <option value="1">Preservar patrimônio</option>
            <option value="2">Crescer com segurança</option>
            <option value="3">Maximizar retorno assumindo mais risco</option>
          </select>
        </div>

        {/* Pergunta 2 */}
        <div style={{ marginBottom: "12px" }}>
          <p style={labelStyle}>
            2. Por quanto tempo pretende deixar o dinheiro investido?
          </p>
          <select
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            style={selectStyle}
          >
            <option value="">Selecione...</option>
            <option value="1">Menos de 1 ano</option>
            <option value="2">Entre 1 e 5 anos</option>
            <option value="3">Mais de 5 anos</option>
          </select>
        </div>

        {/* Pergunta 3 */}
        <div style={{ marginBottom: "12px" }}>
          <p style={labelStyle}>
            3. Se seu investimento cair 15% em um mês, o que você faz?
          </p>
          <select
            value={p3}
            onChange={(e) => setP3(e.target.value)}
            style={selectStyle}
          >
            <option value="">Selecione...</option>
            <option value="1">Saco tudo imediatamente</option>
            <option value="2">Espero recuperar</option>
            <option value="3">Aproveito para comprar mais</option>
          </select>
        </div>

        {/* Pergunta 4 */}
        <div style={{ marginBottom: "12px" }}>
          <p style={labelStyle}>
            4. Como você avalia seu conhecimento em investimentos?
          </p>
          <select
            value={p4}
            onChange={(e) => setP4(e.target.value)}
            style={selectStyle}
          >
            <option value="">Selecione...</option>
            <option value="1">Baixo</option>
            <option value="2">Médio</option>
            <option value="3">Alto</option>
          </select>
        </div>

        {/* Pergunta 5 */}
        <div style={{ marginBottom: "12px" }}>
          <p style={labelStyle}>5. Como está sua segurança financeira hoje?</p>
          <select
            value={p5}
            onChange={(e) => setP5(e.target.value)}
            style={selectStyle}
          >
            <option value="">Selecione...</option>
            <option value="1">
              Dependo desse dinheiro, não posso arriscar
            </option>
            <option value="2">
              Tenho estabilidade, posso arriscar moderadamente
            </option>
            <option value="3">
              Tenho alta estabilidade, posso assumir riscos elevados
            </option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            marginTop: "14px",
          }}
        >
          <button style={buttonSecondaryStyle} onClick={onClose}>
            Cancelar
          </button>
          <button style={buttonPrimaryStyle} onClick={calcularPerfil}>
            Confirmar perfil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvestGramPage() {
  const [tipoInvestimento, setTipoInvestimento] =
    useState<TipoInvestimento>("acoes");
  const [ativo, setAtivo] = useState("");
  const [dataAnalise, setDataAnalise] = useState("");
  const [perfilInvestidor, setPerfilInvestidor] =
    useState<PerfilInvestidor | "">("");
  const [focoAnalise, setFocoAnalise] = useState<FocoAnalise | "">("");
  const [observacao, setObservacao] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [carregandoFrase, setCarregandoFrase] =
    useState("Analisando ativo...");
  const [resultado, setResultado] = useState("");
  const [panelFlip, setPanelFlip] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);

  useEffect(() => {
    if (!carregando) return;

    const frases = [
      "Buscando dados do ativo…",
      "Cruzando indicadores fundamentais…",
      "Analisando histórico de preço e risco…",
      "Calculando relação risco x retorno…",
      "Gerando conclusão personalizada para seu perfil…",
    ];

    let i = 0;
    setCarregandoFrase(frases[0]);

    const intervalo = setInterval(() => {
      i = (i + 1) % frases.length;
      setCarregandoFrase(frases[i]);
    }, 4000);

    return () => clearInterval(intervalo);
  }, [carregando]);

  function descricaoPerfil(p: PerfilInvestidor | "") {
    if (p === "conservador")
      return "Prioriza segurança e preservação de capital, aceitando menor risco e menor volatilidade.";
    if (p === "moderado")
      return "Busca equilíbrio entre segurança e retorno, aceitando oscilações moderadas no curto prazo.";
    if (p === "agressivo")
      return "Focado em retorno máximo, aceitando alta volatilidade e riscos maiores em busca de ganhos.";
    return "";
  }

  function descricaoFoco(f: FocoAnalise | "") {
    if (f === "dividendos")
      return "Ativos com foco em distribuição consistente de dividendos.";
    if (f === "valorizacao")
      return "Ativos com potencial de valorização da cota/preço.";
    if (f === "crescimento")
      return "Empresas/ativos com crescimento forte de receita, lucro e mercado.";
    if (f === "renda_passiva")
      return "Estratégia voltada em gerar fluxo de caixa recorrente com menor necessidade de giro.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!ativo.trim()) {
      alert("⚠️ Informe o código ou nome do ativo.");
      return;
    }
    if (!dataAnalise.trim()) {
      alert("⚠️ Informe a data da análise.");
      return;
    }
    if (!perfilInvestidor) {
      alert(
        "⚠️ Selecione o perfil do investidor (ou descubra no questionário)."
      );
      return;
    }
    if (!focoAnalise) {
      alert("⚠️ Selecione o foco da análise (obrigatório).");
      return;
    }

    setCarregando(true);
    setResultado("");

    try {
      const body = {
        tipoInvestimento,
        ativo,
        dataAnalise,
        perfilInvestidor,
        focoAnalise,
        observacao,
      };

      const res = await fetch("/api/investgram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Erro na API do InvestGram");
      }

      const data = await res.json();

      const texto =
        data.analise ||
        data.resposta ||
        data.resultado ||
        "Análise gerada, mas não consegui ler o campo de resposta.";

      setResultado(texto);
      setPanelFlip(true);
    } catch (err) {
      console.error(err);
      setResultado(
        "❌ Ocorreu um erro ao gerar a análise. Verifique a API /api/investgram e tente novamente."
      );
      setPanelFlip(true);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0b1324,#111827)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        padding: "0px 20px 8vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* H1 SEO escondido */}
      <h1 style={{ position: "absolute", left: "-9999px", top: 0 }}>
        InvestGram - Analisador de Investimentos com Inteligência Artificial
      </h1>

      {/* Título estilo BetGram */}
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: "center",
          fontSize: "1.6rem",
          marginTop: "22px",
          marginBottom: "18px",
        }}
      >
        <img
          src="/investgram-icon.png"
          alt="Logo InvestGram"
          style={{ width: "46px", height: "46px", objectFit: "contain" }}
        />
        <span style={{ color: "#22c55e" }}>
          InvestGram -{" "}
          <span style={{ color: "#fff" }}>Analisador de Ativos</span>
        </span>
      </h2>

      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          background: "rgba(17,24,39,0.85)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: "16px",
          boxShadow: "0 0 25px rgba(34,197,94,0.08)",
          padding: "10px",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Cabeçalho simples */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: "1.05rem" }}>
              👋 <b>Bem-vindo ao InvestGram</b>
              <div
                style={{ color: "#9ca3af", fontSize: "0.88rem", marginTop: 2 }}
              >
                Preencha os dados do ativo e receba uma análise inteligente,
                alinhada ao seu perfil.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(17,24,39,0.6)",
                borderRadius: "999px",
                padding: "4px 12px",
                border: "1px solid rgba(34,197,94,0.3)",
                boxShadow: "0 0 8px rgba(34,197,94,0.2)",
                flexShrink: 0,
                fontSize: "0.82rem",
                color: "#bbf7d0",
              }}
            >
              🧠 IA focada em{" "}
              <span style={{ color: "#22c55e", fontWeight: 600 }}>
                investimentos
              </span>
            </div>
          </div>
        </div>

        {/* Formulário / Resultado, estilo BetGram com flip */}
        {!panelFlip ? (
          <form onSubmit={handleSubmit}>
            {/* Linha tipo + data */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "180px" }}>
                <label style={labelStyle}>📂 Tipo de investimento:</label>
                <select
                  value={tipoInvestimento}
                  onChange={(e) =>
                    setTipoInvestimento(e.target.value as TipoInvestimento)
                  }
                  style={selectStyle}
                >
                  <option value="acoes">📈 Ações</option>
                  <option value="fii">🏢 Fundos Imobiliários (FII)</option>
                  <option value="etf">📊 ETFs</option>
                  <option value="renda_fixa">💵 Renda Fixa</option>
                </select>
              </div>

              <div style={{ width: "150px" }}>
                <label style={labelStyle}>📅 Data da análise:</label>
                <input
                  type="text"
                  placeholder="10/12/2025"
                  value={dataAnalise}
                  onChange={(e) => setDataAnalise(e.target.value)}
                  style={{
                    ...inputStyle,
                    textAlign: "center",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* Ativo */}
            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>💼 Ativo (código ou nome):</label>
              <input
                type="text"
                placeholder="Ex: PETR4, HGLG11, IVVB11, Tesouro IPCA+"
                value={ativo}
                onChange={(e) => setAtivo(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Perfil + botão descobrir */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <div style={{ flex: 1, minWidth: "180px" }}>
                <label style={labelStyle}>
                  🧬 Perfil do investidor (obrigatório):
                </label>
                <select
                  value={perfilInvestidor}
                  onChange={(e) =>
                    setPerfilInvestidor(e.target.value as PerfilInvestidor)
                  }
                  style={selectStyle}
                >
                  <option value="">Selecione...</option>
                  <option value="conservador">Conservador</option>
                  <option value="moderado">Moderado</option>
                  <option value="agressivo">Agressivo</option>
                </select>
              </div>

              <div
                style={{
                  width: "190px",
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <button
                  type="button"
                  style={{
                    ...buttonSecondaryStyle,
                    width: "100%",
                    borderColor: "#22c55e55",
                    color: "#22c55e",
                    background: "rgba(22,163,74,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                  onClick={() => setShowPerfilModal(true)}
                >
                  ❓ Não sei, quero descobrir
                </button>
              </div>
            </div>

            {perfilInvestidor && (
              <div
                style={{
                  background: "rgba(15,23,42,0.95)",
                  borderRadius: "10px",
                  border: "1px solid rgba(148,163,184,0.4)",
                  padding: "8px 10px",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  marginBottom: "10px",
                }}
              >
                <b style={{ color: "#22c55e" }}>Perfil selecionado:</b>{" "}
                {perfilInvestidor.toUpperCase()} —{" "}
                {descricaoPerfil(perfilInvestidor)}
              </div>
            )}

            {/* Foco da análise - obrigatório */}
            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>
                🎯 Foco da análise (obrigatório):
              </label>
              <select
                value={focoAnalise}
                onChange={(e) =>
                  setFocoAnalise(e.target.value as FocoAnalise)
                }
                style={selectStyle}
              >
                <option value="">Selecione o foco...</option>
                <option value="dividendos">Foco em dividendos</option>
                <option value="renda_passiva">Foco em renda passiva</option>
                <option value="valorizacao">Foco em valorização da cota</option>
                <option value="crescimento">
                  Foco em crescimento da empresa/ativo
                </option>
              </select>
            </div>

            {focoAnalise && (
              <div
                style={{
                  background: "rgba(15,23,42,0.95)",
                  borderRadius: "10px",
                  border: "1px solid rgba(56,189,248,0.4)",
                  padding: "8px 10px",
                  fontSize: "0.8rem",
                  color: "#93c5fd",
                  marginBottom: "10px",
                }}
              >
                <b style={{ color: "#38bdf8" }}>Foco selecionado:</b>{" "}
                {descricaoFoco(focoAnalise)}
              </div>
            )}

            {/* Observação opcional */}
            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>
                📝 Observação (opcional – contexto extra, se quiser):
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Já tenho posição nesse ativo, quero comparar com outro, etc."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "70px",
                }}
              />
            </div>

            {/* Botão Analisar - estilo BetGram */}
            <button
              type="submit"
              disabled={carregando}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: carregando
                  ? "#15803d"
                  : "linear-gradient(90deg,#22c55e,#16a34a)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.2rem",
                cursor: carregando ? "not-allowed" : "pointer",
                marginTop: "10px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                opacity: carregando ? 0.9 : 1,
                transition: "0.2s",
              }}
            >
              {carregando ? carregandoFrase : "Analisar ativo"}
            </button>
          </form>
        ) : (
          <>
            <h3 style={{ color: "#22c55e" }}>📊 Resultado da Análise</h3>
            <div
              style={{
                background: "rgba(11,19,36,0.7)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "10px",
                padding: "15px",
                maxHeight: "300px",
                overflowY: "auto",
                fontSize: "0.94rem",
                lineHeight: 1.5,
                color: "#e5e7eb",
              }}
            >
              {resultado.split("\n").map((linha, i) => (
                <p key={i} style={{ marginBottom: "6px" }}>
                  {linha}
                </p>
              ))}
            </div>

            <button
              onClick={() => setPanelFlip(false)}
              style={{
                marginTop: "20px",
                background: "rgba(14,165,233,0.2)",
                border: "1px solid #0ea5e955",
                color: "#38bdf8",
                borderRadius: "8px",
                padding: "12px",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              ↩ Voltar para o formulário
            </button>
          </>
        )}
      </div>

      {/* Modal de perfil */}
      <PerfilModal
        open={showPerfilModal}
        onClose={() => setShowPerfilModal(false)}
        onResultado={(perfil) => setPerfilInvestidor(perfil)}
      />
    </main>
  );
}
