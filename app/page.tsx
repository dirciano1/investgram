"use client";

import React, { useState, useEffect } from "react";

type TipoInvestimento = "acoes" | "fii" | "etf" | "renda_fixa" | "montar_carteira";
type PerfilInvestidor = "conservador" | "moderado" | "agressivo";
type FocoAnalise = "dividendos" | "valorizacao" | "crescimento" | "renda_passiva";

/* ==========================
   ESTILOS GLOBAIS
========================== */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(17,24,39,0.8)",
  color: "#fff",
  marginBottom: "10px",
  outline: "none",
  transition: "0.2s",
  fontSize: "0.95rem",
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
  marginBottom: "3px",
  fontSize: "0.85rem",
  color: "#e5e7eb",
};

function formatarAnalise(texto: string) {
  if (!texto) return "";

  let formatted = texto

    // Remove JSON residual
    .replace(/^\s*\{.*?"resposta":\s*"/, "")
    .replace(/"}\s*$/, "")

    // Negrito → azul
    .replace(/\*\*(.*?)\*\*/g, `<span style="color:#38bdf8;font-weight:600;">$1</span>`)

    // Conserta \n vindo do Gemini
    .replace(/\\n/g, "\n")

    // Remove quebras duplas
    .replace(/\n{2,}/g, "\n")

    // ======================================================
    // TÍTULOS COM EMOJI → VERDE, sem linha antes
    // ======================================================
    .replace(
      /^([📌📊📈⚠️🎯🏛🏢].+)$/gm,
      `<div style="
        margin-top:12px;
        margin-bottom:4px;
        color:#22c55e;
        font-weight:700;
        font-size:1.05rem;">
        $1
      </div>`
    )

    // ======================================================
    // TÍTULOS NUMERADOS → AZUL
    // ======================================================
    .replace(
      /^(\d+\.\s+[^\n]+)$/gm,
      `<div style="
        margin-top:12px;
        margin-bottom:4px;
        color:#38bdf8;
        font-weight:700;
        font-size:1.05rem;">
        $1
      </div>`
    )

    // ======================================================
    // "- item" em bullet azul
    // ======================================================
    .replace(
      /^- (.*)$/gm,
      `<div style="color:#38bdf8; margin-left:8px; margin-bottom:2px; font-weight:500;">
        • $1
      </div>`
    )

    // "• item" existente → azul universal
    .replace(
      /^•\s*(.*)$/gm,
      `<div style="color:#38bdf8; margin-left:8px; margin-bottom:2px; font-weight:500;">
        • $1
      </div>`
    );

  // ======================================================
  // ADICIONAR SEPARADOR ENTRE PARÁGRAFOS (SEM REGEX 's')
  // ======================================================
  formatted = formatted.split("\n").map(linha => {
    if (linha.trim() === "") return "";
    return linha + `<div style="border-bottom:1px solid rgba(56,189,248,0.35); margin:8px 0;"></div>`;
  }).join("");

  // Transformar \n em <br> no final
  formatted = formatted.replace(/\n/g, "<br>");

  return formatted;
}


/* ==========================
   MODAL DE PERFIL
========================== */
interface PerfilModalProps {
  open: boolean;
  onClose: () => void;
  onResultado: (perfil: PerfilInvestidor) => void;
}

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
  padding: "9px 16px",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const buttonSecondaryStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.9)",
  border: "1px solid #4b5563",
  color: "#e5e7eb",
  fontWeight: 500,
  borderRadius: "10px",
  padding: "9px 16px",
  cursor: "pointer",
  fontSize: "0.85rem",
};

function PerfilModal({ open, onClose, onResultado }: PerfilModalProps) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [p4, setP4] = useState("");
  const [p5, setP5] = useState("");

  if (!open) return null;

  function calcularPerfil() {
    const respostas = [p1, p2, p3, p4, p5];
    if (respostas.some((r) => r === "")) return alert("⚠️ Responda tudo.");

    const soma = respostas.reduce((acc, r) => acc + Number(r), 0);
    const perfil =
      soma <= 7 ? "conservador" :
      soma <= 11 ? "moderado" :
      "agressivo";

    onResultado(perfil);
    onClose();
  }

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ color: "#22c55e", marginBottom: 10 }}>🧠 Descobrir perfil do investidor</h3>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12 }}>
          Responda rápido. O InvestGram calculará automaticamente seu perfil.
        </p>

        {/* Perguntas */}
        {[{
          label: "1. Qual é o principal objetivo dos seus investimentos?",
          state: p1, set: setP1,
          opts: ["Preservar patrimônio", "Crescer com segurança", "Maximizar retorno assumindo risco"]
        },
        {
          label: "2. Por quanto tempo deixará o dinheiro investido?",
          state: p2, set: setP2,
          opts: ["Menos de 1 ano", "1 a 5 anos", "Mais de 5 anos"]
        },
        {
          label: "3. Se cair 15% no mês, o que faz?",
          state: p3, set: setP3,
          opts: ["Saco tudo", "Espero recuperar", "Compro mais"]
        },
        {
          label: "4. Seu conhecimento em investimentos:",
          state: p4, set: setP4,
          opts: ["Baixo", "Médio", "Alto"]
        },
        {
          label: "5. Segurança financeira hoje:",
          state: p5, set: setP5,
          opts: [
            "Dependo do dinheiro, não arrisco",
            "Tenho estabilidade, arrisco moderado",
            "Alta estabilidade, aceito riscos maiores"
          ]
        }].map((q, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <p style={labelStyle}>{q.label}</p>
            <select value={q.state} onChange={(e) => q.set(e.target.value)} style={selectStyle}>
              <option value="">Selecione...</option>
              <option value="1">{q.opts[0]}</option>
              <option value="2">{q.opts[1]}</option>
              <option value="3">{q.opts[2]}</option>
            </select>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={buttonSecondaryStyle} onClick={onClose}>Cancelar</button>
          <button style={buttonPrimaryStyle} onClick={calcularPerfil}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ==========================
   PÁGINA PRINCIPAL
========================== */
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
  const [carregandoFrase, setCarregandoFrase] = useState("Analisando...");
  const [resultado, setResultado] = useState("");
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [panelFlip, setPanelFlip] = useState(false);

  /* frases animadas */
  useEffect(() => {
    if (!carregando) return;
    const frases = [
      "Buscando dados do ativo…",
      "Cruzando indicadores fundamentais…",
      "Analisando histórico de preço e risco…",
      "Calculando relação risco x retorno…",
      "Gerando conclusão personalizada…",
    ];
    let i = 0;
    const timer = setInterval(() => setCarregandoFrase(frases[i++ % frases.length]), 4000);
    return () => clearInterval(timer);
  }, [carregando]);

  /* SUBMIT */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!dataAnalise) return alert("⚠️ Informe a data.");
    if (tipoInvestimento !== "montar_carteira" && !ativo.trim())
      return alert("⚠️ Informe o ativo.");
    if (!perfilInvestidor) return alert("⚠️ Escolha o perfil.");
    if (!focoAnalise) return alert("⚠️ Foco obrigatório.");

    setCarregando(true);
    setResultado("");

    try {
      const res = await fetch("/api/investgram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoInvestimento,
          ativo,
          dataAnalise,
          perfilInvestidor,
          focoAnalise,
          observacao,
        }),
      });

      if (!res.ok) throw new Error("Erro na API");
      if (!res.body) throw new Error("Resposta vazia");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let texto = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        texto += dec.decode(value, { stream: true });
      }

      setResultado(texto);
      setPanelFlip(true);
    } finally {
      setCarregando(false);
    }
  }

  /* ==========================
     RENDER FINAL
  ========================== */
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0b1324,#111827)",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "0px 20px 8vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ position: "absolute", left: -9999 }}>
        InvestGram - Analisador de Investimentos
      </h1>

      <h2 style={{ display: "flex", gap: 8, marginTop: 22 }}>
        <img src="/investgram-icon.png" alt="Logo" style={{ width: 46 }} />
        <span style={{ color: "#22c55e" }}>
          InvestGram - <span style={{ color: "#fff" }}>Analisador de Ativos</span>
        </span>
      </h2>

      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "rgba(17,24,39,0.85)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 0 25px rgba(34,197,94,0.08)",
        }}
      >
        {!panelFlip ? (
          /* ======================
             FORMULÁRIO
          ====================== */
          <form onSubmit={handleSubmit}>

            {/* LINHA 1 */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>📂 Tipo de investimento:</label>
                <select
                  style={selectStyle}
                  value={tipoInvestimento}
                  onChange={(e) => setTipoInvestimento(e.target.value as TipoInvestimento)}
                >
                  <option value="acoes">📈 Ações</option>
                  <option value="fii">🏢 Fundos Imobiliários</option>
                  <option value="etf">📊 ETFs</option>
                  <option value="renda_fixa">💵 Renda Fixa</option>
                  <option value="montar_carteira">📊 Montar Carteira</option>
                </select>
              </div>

              <div style={{ width: 150 }}>
                <label style={labelStyle}>📅 Data:</label>
                <input
                  style={{ ...inputStyle, textAlign: "center" }}
                  placeholder="10/12/2025"
                  value={dataAnalise}
                  onChange={(e) => setDataAnalise(e.target.value)}
                />
              </div>
            </div>

            {/* ATIVO */}
            {tipoInvestimento !== "montar_carteira" && (
              <div>
                <label style={labelStyle}>💼 Ativo:</label>
                <input
                  style={inputStyle}
                  placeholder="PETR4, HGLG11, IVVB11..."
                  value={ativo}
                  onChange={(e) => setAtivo(e.target.value)}
                />
              </div>
            )}

            {/* PERFIL */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>🧬 Perfil:</label>
                <select
                  style={selectStyle}
                  value={perfilInvestidor}
                  onChange={(e) => setPerfilInvestidor(e.target.value as PerfilInvestidor)}
                >
                  <option value="">Selecione...</option>
                  <option value="conservador">Conservador</option>
                  <option value="moderado">Moderado</option>
                  <option value="agressivo">Agressivo</option>
                </select>
              </div>

              <button
                type="button"
                style={{
                  ...buttonSecondaryStyle,
                  width: 190,
                  marginTop: 22,
                  background: "rgba(22,163,74,0.1)",
                  borderColor: "#22c55e55",
                  color: "#22c55e",
                }}
                onClick={() => setShowPerfilModal(true)}
              >
                ❓ Descobrir perfil
              </button>
            </div>

            {/* DESCRIÇÃO DO PERFIL */}
            {perfilInvestidor && (
              <div
                style={{
                  background: "rgba(15,23,42,0.95)",
                  padding: 8,
                  borderRadius: 9,
                  border: "1px solid rgba(148,163,184,0.4)",
                  marginTop: 8,
                  fontSize: 13,
                  color: "#9ca3af",
                }}
              >
                <b style={{ color: "#22c55e" }}>Perfil selecionado:</b>{" "}
                {perfilInvestidor.toUpperCase()}
              </div>
            )}

            {/* FOCO */}
            <div>
              <label style={labelStyle}>🎯 Foco:</label>
              <select
                style={selectStyle}
                value={focoAnalise}
                onChange={(e) => setFocoAnalise(e.target.value as FocoAnalise)}
              >
                <option value="">Selecione...</option>
                <option value="dividendos">📤 Dividendos</option>
                <option value="renda_passiva">🏦 Renda Passiva</option>
                <option value="valorizacao">📈 Valorização</option>
                <option value="crescimento">🚀 Crescimento</option>
              </select>
            </div>

            {/* OBSERVAÇÃO */}
            <div>
              <label style={labelStyle}>📝 Observação (opcional):</label>
              <textarea
                rows={3}
                style={{ ...inputStyle, minHeight: 70 }}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            {/* BOTÃO */}
            <button
              type="submit"
              disabled={carregando}
              style={{
                width: "100%",
                padding: 12,
                marginTop: 8,
                borderRadius: 12,
                border: "none",
                background: carregando
                  ? "#15803d"
                  : "linear-gradient(90deg,#22c55e,#16a34a)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: carregando ? "not-allowed" : "pointer",
              }}
            >
              {carregando ? carregandoFrase : "Analisar ativo"}
            </button>
          </form>
        ) : (
          /* ======================
             RESULTADO
          ====================== */
          <>
            <h3 style={{ color: "#22c55e", marginBottom: 8 }}>📊 Resultado da análise</h3>

            <div
              style={{
                background: "rgba(11,19,36,0.9)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 10,
                padding: 12,
                maxHeight: 340,
                overflowY: "auto",
                fontSize: "0.93rem",
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{ __html: formatarAnalise(resultado) }}
            />

            <button
              type="button"
              onClick={() => setPanelFlip(false)}
              style={{
                marginTop: 14,
                background: "rgba(14,165,233,0.18)",
                border: "1px solid #0ea5e955",
                color: "#38bdf8",
                borderRadius: 9,
                padding: 10,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              ↩ Nova análise
            </button>
          </>
        )}
      </div>

      {/* Modal */}
      <PerfilModal
        open={showPerfilModal}
        onClose={() => setShowPerfilModal(false)}
        onResultado={(perfil) => setPerfilInvestidor(perfil)}
      />
    </main>
  );
}








