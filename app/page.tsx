"use client";

import React, { useState, useEffect } from "react";

/* ==========================
   TIPOS
========================== */
type TipoInvestimento =
  | "acoes"
  | "fii"
  | "etf"
  | "renda_fixa"
  | "montar_carteira";

type TipoAnalise =
  | "completa"
  | "fundamentalista"
  | "tecnica"
  | "dividendos"
  | "fii"
  | "comparar"
  | "setor"
  | "resumo";

type PerfilInvestidor = "conservador" | "moderado" | "agressivo";

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

/* ==========================
   formatarAnalise
========================== */
function formatarAnalise(texto: string) {
  if (!texto) return "";

  let t = texto
    .replace(/^\s*\{.*?"resposta":\s*"/, "")
    .replace(/"}\s*$/, "")
    .replace(/\*\*(.*?)\*\*/g, `<span style="color:#38bdf8;font-weight:600;">$1</span>`)
    .replace(/\\n/g, "\n")
    .replace(/\n{2,}/g, "\n");

  // Títulos com emoji
  t = t.replace(
    /^([📌📊📈⚠️🎯🏛🏢].+)$/gm,
    `<div style="margin-top:12px;margin-bottom:4px;color:#22c55e;font-weight:700;font-size:1.05rem;">$1</div>`
  );

  // Títulos numerados
  t = t.replace(
    /^(\d+\.\s+[^\n]+)$/gm,
    `<div style="margin-top:12px;margin-bottom:4px;color:#38bdf8;font-weight:700;font-size:1.05rem;">$1</div>`
  );

  // Bullets
  t = t.replace(
    /^- (.*)$/gm,
    `<div style="color:#38bdf8;margin-left:10px;margin-bottom:2px;font-weight:500;">• $1</div>`
  );

  t = t.replace(
    /^•\s*(.*)$/gm,
    `<div style="color:#38bdf8;margin-left:10px;margin-bottom:2px;font-weight:500;">• $1</div>`
  );

  // Separador entre parágrafos
  const linhas = t.split("\n");
  const proc: string[] = [];

  for (let linha of linhas) {
    const l = linha.trim();
    if (!l) {
      proc.push("");
      continue;
    }

    const isTitleEmoji = /^[📌📊📈⚠️🎯🏛🏢]/.test(l);
    const isTitleNum = /^\d+\./.test(l);
    const isBullet = l.startsWith("•");

    if (isTitleEmoji || isTitleNum || isBullet) {
      proc.push(linha);
      continue;
    }

    proc.push(
      linha +
        `<div style="border-bottom:1px solid rgba(56,189,248,0.35);margin:6px 0;"></div>`
    );
  }

  return proc.join("<br>");
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
      soma <= 7 ? "conservador" : soma <= 11 ? "moderado" : "agressivo";

    onResultado(perfil);
    onClose();
  }

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ color: "#22c55e", marginBottom: 10 }}>
          🧠 Descobrir perfil do investidor
        </h3>

        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12 }}>
          Responda rápido. O InvestGram calculará automaticamente seu perfil.
        </p>

        {[
          {
            label: "1. Objetivo dos investimentos:",
            state: p1,
            set: setP1,
            opts: [
              "Preservar patrimônio",
              "Crescer com segurança",
              "Maximizar retorno assumindo risco",
            ],
          },
          {
            label: "2. Horizonte de tempo:",
            state: p2,
            set: setP2,
            opts: ["Menos de 1 ano", "1 a 5 anos", "Mais de 5 anos"],
          },
          {
            label: "3. Reação à queda de 15%:",
            state: p3,
            set: setP3,
            opts: ["Saco tudo", "Espero recuperar", "Compro mais"],
          },
          {
            label: "4. Conhecimento em investimentos:",
            state: p4,
            set: setP4,
            opts: ["Baixo", "Médio", "Alto"],
          },
          {
            label: "5. Segurança financeira atual:",
            state: p5,
            set: setP5,
            opts: [
              "Dependo do dinheiro",
              "Tenho estabilidade",
              "Alta estabilidade",
            ],
          },
        ].map((q, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <p style={labelStyle}>{q.label}</p>
            <select
              value={q.state}
              onChange={(e) => q.set(e.target.value)}
              style={selectStyle}
            >
              <option value="">Selecione...</option>
              <option value="1">{q.opts[0]}</option>
              <option value="2">{q.opts[1]}</option>
              <option value="3">{q.opts[2]}</option>
            </select>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={buttonSecondaryStyle} onClick={onClose}>
            Cancelar
          </button>
          <button style={buttonPrimaryStyle} onClick={calcularPerfil}>
            Confirmar
          </button>
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

  const [tipoAnalise, setTipoAnalise] = useState<TipoAnalise>("completa");
  const [ativo, setAtivo] = useState("");
  const [ativoComparar, setAtivoComparar] = useState("");

  const [dataAnalise, setDataAnalise] = useState("");
  const [perfilInvestidor, setPerfilInvestidor] =
    useState<PerfilInvestidor | "">("");

  const [observacao, setObservacao] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [carregandoFrase, setCarregandoFrase] = useState("Analisando...");
  const [resultado, setResultado] = useState("");
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [panelFlip, setPanelFlip] = useState(false);

  /* animações */
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
    const timer = setInterval(
      () => setCarregandoFrase(frases[i++ % frases.length]),
      4000
    );
    return () => clearInterval(timer);
  }, [carregando]);

  /* ==========================
     SUBMIT
  ========================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!dataAnalise) return alert("⚠️ Informe a data.");

    if (tipoInvestimento !== "montar_carteira" && !ativo.trim())
      return alert("⚠️ Informe o ativo.");

    if (!perfilInvestidor) return alert("⚠️ Informe o perfil.");

    if (tipoAnalise === "comparar" && !ativoComparar.trim())
      return alert("⚠️ Informe o ativo para comparação.");

    setCarregando(true);
    setResultado("");

    try {
      const res = await fetch("/api/investgram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoInvestimento,
          tipoAnalise,
          ativo,
          ativoComparar:
            tipoAnalise === "comparar" ? ativoComparar.trim() : null,
          dataAnalise,
          perfilInvestidor,
          observacao,
        }),
      });

      if (!res.ok) throw new Error("Erro na API");

      const text = await res.text();
      setResultado(text);
      setPanelFlip(true);
    } finally {
      setCarregando(false);
    }
  }

  /* ==========================
     FILTRAR OPÇÕES DO MENU
  ========================== */

  // regras de exibição NO FRONT para o select tipoAnálise:
  const opcoesAnalise = [
    { value: "completa", label: "🔍 Análise Completa", show: true },
    {
      value: "fundamentalista",
      label: "📚 Fundamentalista",
      show:
        tipoInvestimento === "acoes" ||
        tipoInvestimento === "fii" ||
        tipoInvestimento === "etf",
    },
    {
      value: "tecnica",
      label: "📈 Análise Técnica",
      show: tipoInvestimento === "acoes" || tipoInvestimento === "etf",
    },
    {
      value: "dividendos",
      label: "💰 Dividendos",
      show: tipoInvestimento === "acoes",
    },
    {
      value: "fii",
      label: "🏢 Análise FII",
      show: tipoInvestimento === "fii",
    },
    {
      value: "comparar",
      label: "🆚 Comparar com outro ativo",
      show:
        tipoInvestimento === "acoes" ||
        tipoInvestimento === "fii" ||
        tipoInvestimento === "etf",
    },
    {
      value: "setor",
      label: "🏭 Comparar com o setor",
      show:
        tipoInvestimento === "acoes" ||
        tipoInvestimento === "etf" ||
        tipoInvestimento === "fii",
    },
    {
      value: "resumo",
      label: "⚡ Resumo Executivo",
      show: true,
    },
  ];

  // se a opção atual ficar inválida após troca de tipoInvestimento → reset
  useEffect(() => {
    const opcaoAtual = opcoesAnalise.find((o) => o.value === tipoAnalise);
    if (!opcaoAtual?.show) {
      setTipoAnalise("completa");
    }
  }, [tipoInvestimento]);
  /* ==========================
     UI
  ========================== */
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0b1324,#111827)",
        color: "#fff",
        fontFamily: "Inter, system-ui",
        padding: "0px 20px 8vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
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
  }}
>
  {!panelFlip ? (
    <form onSubmit={handleSubmit}>
      {/* TIPO INVESTIMENTO */}
      <label style={labelStyle}>📂 Tipo de investimento:</label>
      <select
        style={selectStyle}
        value={tipoInvestimento}
        onChange={(e) =>
          setTipoInvestimento(e.target.value as TipoInvestimento)
        }
      >
        <option value="acoes">📈 Ações</option>
        <option value="fii">🏢 Fundos Imobiliários</option>
        <option value="etf">📊 ETFs</option>
        <option value="renda_fixa">💵 Renda Fixa</option>
        <option value="montar_carteira">📊 Montar Carteira</option>
      </select>

      {/* ATIVO + DATA + PERFIL AUTOMÁTICO */}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        
        {/* ATIVO */}
        {tipoInvestimento !== "montar_carteira" && (
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>💼 Ativo:</label>
            <input
              style={inputStyle}
              placeholder="PETR4, HGLG11..."
              value={ativo}
              onChange={(e) => setAtivo(e.target.value)}
            />
          </div>
        )}

        {/* DATA */}
        <div style={{ width: "150px" }}>
          <label style={labelStyle}>📅 Data:</label>
          <input
            style={{ ...inputStyle, textAlign: "center" }}
            value={dataAnalise}
            onChange={(e) => setDataAnalise(e.target.value)}
            placeholder="10/12/2025"
          />
        </div>

        {/* PERFIL AUTOMÁTICO (abre o modal) */}
        <div style={{ width: "180px" }}>
          <label style={labelStyle}>🧬 Perfil:</label>
          <select
            style={selectStyle}
            value={perfilInvestidor}
            onChange={(e) => {
              if (e.target.value === "descobrir") {
                setShowPerfilModal(true);
              } else {
                setPerfilInvestidor(e.target.value as PerfilInvestidor);
              }
            }}
          >
            <option value="">Selecione...</option>
            <option value="conservador">Conservador</option>
            <option value="moderado">Moderado</option>
            <option value="agressivo">Agressivo</option>

            {/* abre o modal */}
            <option value="descobrir">✨ Descobrir automaticamente</option>
          </select>
        </div>

      </div>

      {/* TIPO DE ANÁLISE */}
      <label style={labelStyle}>📊 Tipo de Análise:</label>
      <select
        style={selectStyle}
        value={tipoAnalise}
        onChange={(e) => setTipoAnalise(e.target.value as TipoAnalise)}
      >
        {opcoesAnalise
          .filter((o) => o.show)
          .map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>

      {/* INPUT EXTRA: COMPARAR */}
      {tipoAnalise === "comparar" && (
        <>
          <label style={labelStyle}>🆚 Comparar com:</label>
          <input
            style={inputStyle}
            placeholder="VALE3, HGLG11..."
            value={ativoComparar}
            onChange={(e) => setAtivoComparar(e.target.value)}
          />
        </>
      )}

      {/* OBSERVAÇÃO */}
      <label style={labelStyle}>📝 Observação (opcional):</label>
      <textarea
        style={{ ...inputStyle, minHeight: 70 }}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
      />

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
    <>
      <h3 style={{ color: "#22c55e", marginBottom: 8 }}>
        📊 Resultado da análise
      </h3>

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
        onClick={() => setPanelFlip(false)}
        style={{
          marginTop: 14,
          background: "rgba(14,165,233,0.18)",
          border: "1px solid #0ea5e955",
          color: "#38bdf8",
          borderRadius: 9,
          padding: 10,
          fontWeight: 600,
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



