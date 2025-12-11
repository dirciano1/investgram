"use client";

import React, { useState, useEffect } from "react";

import {
  auth,
  onAuthStateChanged,
  loginComGoogle,
  sair,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "@/lib/firebase";

/* ==========================
   TIPOS
========================== */

type TipoInvestimento =
  | "acoes"
  | "fii"
  | "etf"
  | "renda_fixa"
  | "indices"
  | "commodities"
  | "globais"
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

interface AnaliseHistorico {
  id: string;
  tipoInvestimento: string;
  tipoAnalise: string;
  ativo: string | null;
  dataAnalise: string;
  perfilInvestidor: string;
  criadoEm?: any;
}

/* ==========================
   ESTILOS GLOBAIS
========================== */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 14px",
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

const mainLoginStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  background: "linear-gradient(135deg,#0b1324,#111827)",
  color: "#fff",
};

const loginCardStyle: React.CSSProperties = {
  background: "rgba(17,24,39,0.85)",
  border: "2px solid #22c55e55",
  borderRadius: "16px",
  padding: "40px 30px",
  width: "90%",
  maxWidth: "400px",
  textAlign: "center",
  boxShadow: "0 0 25px rgba(34,197,94,0.15)",
};

const mainStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg,#0b1324,#111827)",
  color: "#fff",
  padding: "0 20px 16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  fontFamily: "Inter, system-ui",
};

const logoStyle: React.CSSProperties = {
  width: "46px",
  height: "46px",
  objectFit: "contain",
};

const cardWrapperStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "700px",
  background: "rgba(17,24,39,0.85)",
  border: "1px solid rgba(34,197,94,0.25)",
  borderRadius: "16px",
  padding: "12px",
  boxShadow: "0 0 18px rgba(34,197,94,0.12)",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
};

/* ==========================
   formatarAnalise
========================== */

function formatarAnalise(texto: string) {
  if (!texto) return "";

  let t = texto
    .replace(/^\s*\{.*?"resposta":\s*"/, "")
    .replace(/"}\s*$/, "")
    .replace(
      /\*\*(.*?)\*\*/g,
      `<span style="color:#38bdf8;font-weight:600;">$1</span>`
    )
    .replace(/\\n/g, "\n")
    .replace(/\n{2,}/g, "\n");

  // Títulos com emoji (verde)
  t = t.replace(
    /^([📌📊📈⚠️🎯🏛🏢].+)$/gm,
    `<div style="margin-top:12px;margin-bottom:4px;color:#22c55e;font-weight:700;font-size:1.05rem;">$1</div>`
  );

  // Títulos numerados (azul)
  t = t.replace(
    /^(\d+\.\s+[^\n]+)$/gm,
    `<div style="margin-top:12px;margin-bottom:4px;color:#38bdf8;font-weight:700;font-size:1.05rem;">$1</div>`
  );

  // Bullets "- item"
  t = t.replace(
    /^- (.*)$/gm,
    `<div style="color:#38bdf8;margin-left:10px;margin-bottom:2px;font-weight:500;">• $1</div>`
  );

  // Bullets "• item"
  t = t.replace(
    /^•\s*(.*)$/gm,
    `<div style="color:#38bdf8;margin-left:10px;margin-bottom:2px;font-weight:500;">• $1</div>`
  );

  // Separador entre parágrafos (apenas texto comum)
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
   MODAL PERFIL
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
    const perfil: PerfilInvestidor =
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
   MODAL CONFIRMAÇÃO CRÉDITO
========================== */

interface ConfirmacaoModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  descricao: string;
  creditos: number;
}

const confirmButtonStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #22c55e, #16a34a)",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
  flex: 1,
  minWidth: "120px",
};

const cancelButtonStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid #ef444455",
  color: "#f87171",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
  flex: 1,
  minWidth: "120px",
};

function ConfirmacaoModal({
  open,
  onConfirm,
  onCancel,
  descricao,
  creditos,
}: ConfirmacaoModalProps) {
  if (!open) return null;

  return (
    <div style={modalBackdropStyle}>
      <div
        style={{
          ...modalContentStyle,
          maxWidth: 360,
          textAlign: "center",
        }}
      >
        <h3 style={{ color: "#22c55e", marginBottom: 10 }}>Confirmar Análise</h3>

        <p style={{ color: "#ccc", marginBottom: 16 }}>
          Você está prestes a gerar a análise para:
          <br />
          <b style={{ color: "#38bdf8" }}>{descricao}</b>
        </p>

        <div
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid #facc1555",
            borderRadius: "8px",
            padding: "10px",
            marginBottom: "16px",
            color: "#facc15",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          ⚠️ Esta ação consumirá{" "}
          <b style={{ color: "#fff" }}>1 crédito</b>. O crédito{" "}
          <b style={{ color: "#fff" }}>NÃO É REEMBOLSÁVEL</b>.
        </div>

        <p style={{ color: "#fff", marginBottom: 18 }}>
          Seus créditos restantes:{" "}
          <b>{creditos > 0 ? creditos - 1 : 0}</b>
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <button onClick={onCancel} style={cancelButtonStyle}>
            ❌ Cancelar
          </button>
          <button onClick={onConfirm} style={confirmButtonStyle}>
            ✅ Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================
   MODAL HISTÓRICO
========================== */

interface HistoricoModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  itens: AnaliseHistorico[];
}

function formatarLinhaHistorico(item: AnaliseHistorico) {
  const ativo =
    item.tipoInvestimento === "montar_carteira"
      ? "Carteira personalizada"
      : item.ativo || "—";

  const data = item.dataAnalise || "Sem data";
  return `${data} • ${ativo} • ${item.tipoAnalise.toUpperCase()} • ${item.perfilInvestidor}`;
}

function HistoricoModal({
  open,
  onClose,
  loading,
  itens,
}: HistoricoModalProps) {
  if (!open) return null;

  return (
    <div style={modalBackdropStyle}>
      <div
        style={{
          ...modalContentStyle,
          maxWidth: 520,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ color: "#22c55e", marginBottom: 10 }}>
          📜 Histórico de análises
        </h3>

        {loading ? (
          <p style={{ color: "#e5e7eb" }}>Carregando histórico...</p>
        ) : itens.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>
            Você ainda não gerou nenhuma análise no InvestGram.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 8,
            }}
          >
            {itens.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 8,
                  padding: 10,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  fontSize: "0.85rem",
                  color: "#e5e7eb",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {item.tipoInvestimento === "montar_carteira"
                    ? "📊 Montar Carteira"
                    : item.ativo || "Ativo não informado"}
                </div>
                <div style={{ color: "#9ca3af" }}>
                  {formatarLinhaHistorico(item)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <button style={buttonSecondaryStyle} onClick={onClose}>
            Fechar
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
  // auth / créditos
  const [user, setUser] = useState<any | null>(null);
  const [creditos, setCreditos] = useState<number>(0);

  // formulário
  const [tipoInvestimento, setTipoInvestimento] =
    useState<TipoInvestimento>("acoes");
  const [tipoAnalise, setTipoAnalise] = useState<TipoAnalise>("completa");
  const [ativo, setAtivo] = useState("");
  const [ativoComparar, setAtivoComparar] = useState("");
  const [dataAnalise, setDataAnalise] = useState("");
  const [perfilInvestidor, setPerfilInvestidor] =
    useState<PerfilInvestidor | "">("");
  const [observacao, setObservacao] = useState("");

  // estado UI
  const [carregando, setCarregando] = useState(false);
  const [carregandoFrase, setCarregandoFrase] = useState("Analisando...");
  const [resultado, setResultado] = useState("");
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [panelFlip, setPanelFlip] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  // histórico
  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState<AnaliseHistorico[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  /* ==========================
     AUTH
  =========================== */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            uid: firebaseUser.uid,
            nome: firebaseUser.displayName || "Usuário",
            email: firebaseUser.email || "",
            creditos: 10,
            criadoEm: serverTimestamp(),
            jaComprou: false,
          });
          setCreditos(10);
        } else {
          setCreditos(snap.data().creditos ?? 0);
        }
      } else {
        setUser(null);
        setCreditos(0);
        setResultado("");
        setPanelFlip(false);
      }
    });

    return () => unsub();
  }, []);

  async function handleLogin() {
    try {
      const u = await loginComGoogle();
      setUser(u);

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: u.uid,
          nome: u.displayName || "Usuário",
          email: u.email || "",
          creditos: 10,
          criadoEm: serverTimestamp(),
          jaComprou: false,
        });
        setCreditos(10);
      } else {
        setCreditos(snap.data().creditos ?? 0);
      }
    } catch (err: any) {
      alert("Erro ao fazer login: " + err.message);
    }
  }

  async function handleLogout() {
    await sair();
    setUser(null);
    setCreditos(0);
    setResultado("");
    setPanelFlip(false);
  }

  /* ==========================
     ANIMAÇÃO CARREGANDO
  =========================== */

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
     OPÇÕES ANALISE
  =========================== */

  const opcoesAnalise = [
    { value: "completa", label: "🔍 Análise Completa", show: true },

    {
      value: "fundamentalista",
      label: "📚 Fundamentalista",
      show:
        tipoInvestimento === "acoes" ||
        tipoInvestimento === "etf" ||
        tipoInvestimento === "globais" ||
        tipoInvestimento === "fii",
    },
    {
      value: "tecnica",
      label: "📈 Análise Técnica",
      show
        :

        tipoInvestimento === "acoes" ||
        tipoInvestimento === "indices" ||
        tipoInvestimento === "commodities" ||
        tipoInvestimento === "globais" ||
        tipoInvestimento === "etf",
    },
    {
      value: "dividendos",
      label: "💰 Dividendos",
      show:
        tipoInvestimento === "acoes" ||
        tipoInvestimento === "etf" ||
        tipoInvestimento === "globais" ||
        tipoInvestimento === "fii",
    },
    {
      value: "fii",
      label: "🏢 Análise FII",
      show: tipoInvestimento === "fii",
    },
    {
      value: "comparar",
      label: "🆚 Comparar com outro ativo",
      show: tipoInvestimento !== "montar_carteira",
    },
    {
      value: "setor",
      label: "🏭 Comparar com o setor",
      show:
        tipoInvestimento === "acoes" ||
        tipoInvestimento === "etf" ||
        tipoInvestimento === "renda_fixa" ||
        tipoInvestimento === "commodities" ||
        tipoInvestimento === "indices" ||
        tipoInvestimento === "globais" ||
        tipoInvestimento === "fii",
    },
    {
      value: "resumo",
      label: "⚡ Resumo Executivo",
      show: true,
    },
  ];

  useEffect(() => {
    const atual = opcoesAnalise.find((o) => o.value === tipoAnalise);
    if (!atual?.show) {
      setTipoAnalise("completa");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoInvestimento]);

  /* ==========================
     SUBMIT → ABRE MODAL
  =========================== */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      alert("⚠️ Faça login para usar o InvestGram.");
      return;
    }

    if (!dataAnalise) {
      alert("⚠️ Informe a data da análise.");
      return;
    }

    if (tipoInvestimento !== "montar_carteira" && !ativo.trim()) {
      alert("⚠️ Informe o ativo principal.");
      return;
    }

    if (!perfilInvestidor) {
      alert("⚠️ Informe o perfil do investidor.");
      return;
    }

    if (tipoAnalise === "comparar" && !ativoComparar.trim()) {
      alert("⚠️ Informe o ativo para comparação.");
      return;
    }

    if (creditos <= 0) {
      alert("❌ Você não tem créditos suficientes.");
      return;
    }

    setShowConfirmacao(true);
  }

  /* ==========================
     CONFIRMAR → GERA ANÁLISE
  =========================== */

  async function gerarAnalise() {
    if (!user) return;
    setShowConfirmacao(false);
    setCarregando(true);
    setResultado("");

    try {
      // garantimos crédito atualizado
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const dados = snap.data();
      const saldoAtual = dados?.creditos ?? 0;

      if (saldoAtual <= 0) {
        alert("❌ Você não tem créditos suficientes.");
        return;
      }

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

      // salva histórico básico
      await addDoc(collection(db, "analisesInvestGram"), {
        uid: user.uid,
        tipoInvestimento,
        tipoAnalise,
        ativo: tipoInvestimento === "montar_carteira" ? null : ativo.trim(),
        ativoComparar:
          tipoAnalise === "comparar" ? ativoComparar.trim() : null,
        dataAnalise,
        perfilInvestidor,
        observacao,
        resposta: text,
        criadoEm: serverTimestamp(),
      });

      // desconta crédito
      await updateDoc(ref, { creditos: saldoAtual - 1 });
      setCreditos(saldoAtual - 1);

      setResultado(text);
      setPanelFlip(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar a análise. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  /* ==========================
     DESCRIÇÃO TEXTO MODAL
  =========================== */

  const descricaoAnalise =
    tipoInvestimento === "montar_carteira"
      ? "Montar carteira personalizada"
      : tipoAnalise === "comparar" && ativo.trim() && ativoComparar.trim()
      ? `${ativo.trim()} x ${ativoComparar.trim()}`
      : ativo.trim() || "Análise de ativos";

  /* ==========================
     HISTÓRICO (CARREGAR DO FIRESTORE)
  =========================== */

  async function abrirHistorico() {
    if (!user) return;

    setShowHistorico(true);
    setHistoricoLoading(true);

    try {
      const q = query(
        collection(db, "analisesInvestGram"),
        where("uid", "==", user.uid),
        orderBy("criadoEm", "desc"),
        limit(20)
      );

      const snap = await getDocs(q);
      const lista: AnaliseHistorico[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          tipoInvestimento: data.tipoInvestimento,
          tipoAnalise: data.tipoAnalise,
          ativo: data.ativo ?? null,
          dataAnalise: data.dataAnalise ?? "",
          perfilInvestidor: data.perfilInvestidor ?? "",
          criadoEm: data.criadoEm,
        };
      });

      setHistorico(lista);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar histórico de análises.");
    } finally {
      setHistoricoLoading(false);
    }
  }

  /* ==========================
     LOGIN SCREEN (IGUAL TALKGRAM)
  =========================== */

  if (!user) {
    return (
      <main style={mainLoginStyle}>
        <div style={loginCardStyle}>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            <img src="/investgram-icon.png" style={logoStyle} alt="InvestGram" />
            <span>
              Bem-vindo ao{" "}
              <span style={{ color: "#22c55e" }}>InvestGram</span>
            </span>
          </h2>

          <p style={{ color: "#ccc" }}>
            Analise ações, FIIs, ETFs e renda fixa com uma IA focada em
            investimentos.
          </p>

          <div
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid #22c55e55",
              borderRadius: "12px",
              padding: "10px 20px",
              margin: "20px 0",
              textAlign: "center",
              color: "#a7f3d0",
            }}
          >
            🎁 <b style={{ color: "#22c55e" }}>Ganhe 10 análises grátis</b> ao
            criar sua conta
          </div>

          <button
            onClick={handleLogin}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              background: "#fff",
              color: "#000",
              padding: "14px 28px",
              fontWeight: 600,
              borderRadius: "50px",
              border: "none",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              width={22}
              alt="Google"
            />
            Entrar com Google
          </button>
        </div>
      </main>
    );
  }

  /* ==========================
     DASHBOARD (LAYOUT TALKGRAM)
  =========================== */

  const primeiroNome = user.displayName?.split(" ")[0] || "Usuário";

  return (
    <>
      <main style={mainStyle}>
        {/* TÍTULO IGUAL TALKGRAM */}
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            justifyContent: "center",
            fontSize: "1.6rem",
            marginTop: 22,
          }}
        >
          <img
            src="/investgram-icon.png"
            alt="Logo InvestGram"
            style={logoStyle}
          />
          <span style={{ color: "#22c55e" }}>
            InvestGram -{" "}
            <span style={{ color: "#fff" }}>Analisador de Ativos</span>
          </span>
        </h2>

        <div style={cardWrapperStyle}>
          {/* HEADER COM NOME + CRÉDITOS + SAIR + ADICIONAR CRÉDITOS + HISTÓRICO */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
                alignItems: "center",
              }}
            >
              <div>
                👋 Olá, <b>{primeiroNome}</b>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(17,24,39,0.6)",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(34,197,94,0.3)",
                  fontWeight: 600,
                }}
              >
                💰{" "}
                <span style={{ color: "#22c55e", fontWeight: 700 }}>
                  {creditos}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid #ef444455",
                color: "#f87171",
                padding: "8px 14px",
                borderRadius: "8px",
                width: "100%",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🚪 Sair
            </button>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button
                onClick={abrirHistorico}
                style={{
                  flex: 1,
                  background: "rgba(14,165,233,0.15)",
                  border: "1px solid #0ea5e955",
                  borderRadius: "8px",
                  padding: "8px 0",
                  color: "#38bdf8",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📜 Histórico
              </button>

              <button
                onClick={() => {
                  const url = `https://dirciano1.github.io/neogram/payments?uid=${user.uid}`;
                  window.open(url, "_blank");
                }}
                style={{
                  flex: 1,
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid #22c55e55",
                  borderRadius: "8px",
                  padding: "8px 0",
                  color: "#22c55e",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ➕ Adicionar Créditos
              </button>
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL (FORM / RESULTADO) */}
          <div
            style={{
              marginTop: 14,
              flex: 1,
              overflowY: "auto",
            }}
          >
            {!panelFlip ? (
              <form onSubmit={handleSubmit}>
                {/* TIPO + DATA */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={labelStyle}>📂 Tipo de investimento:</label>
                    <select
                      style={selectStyle}
                      value={tipoInvestimento}
                      onChange={(e) =>
                        setTipoInvestimento(
                          e.target.value as TipoInvestimento
                        )
                      }
                    >
                      <option value="acoes">📈 Ações</option>
                      <option value="fii">🏢 Fundos Imobiliários</option>
                      <option value="etf">📊 ETFs</option>
                      <option value="renda_fixa">💵 Renda Fixa</option>
                      <option value="indices">
                        📉 Índices (IBOV, SP500…)
                      </option>
                      <option value="commodities">
                        🌾 Commodities (Ouro, Petróleo…)
                      </option>
                      <option value="globais">🌍 Ativos Globais</option>
                      <option value="montar_carteira">
                        📊 Montar Carteira
                      </option>
                    </select>
                  </div>

                  <div style={{ width: 160, minWidth: 140 }}>
                    <label style={labelStyle}>📅 Data:</label>
                    <input
                      style={{ ...inputStyle, textAlign: "center" }}
                      value={dataAnalise}
                      onChange={(e) => setDataAnalise(e.target.value)}
                      placeholder="10/12/2025"
                    />
                  </div>
                </div>

                {/* ATIVO PRINCIPAL */}
                {tipoInvestimento !== "montar_carteira" && (
                  <>
                    <label style={labelStyle}>💼 Ativo:</label>
                    <input
                      style={inputStyle}
                      placeholder="PETR4, HGLG11, SP500, OURO..."
                      value={ativo}
                      onChange={(e) => setAtivo(e.target.value)}
                    />
                  </>
                )}

                {/* PERFIL DO INVESTIDOR */}
                <label style={labelStyle}>🧬 Perfil do investidor:</label>
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
                  <option value="descobrir">✨ Descobrir automaticamente</option>
                </select>

                {/* TIPO DE ANÁLISE */}
                <label style={labelStyle}>📊 Tipo de Análise:</label>
                <select
                  style={selectStyle}
                  value={tipoAnalise}
                  onChange={(e) =>
                    setTipoAnalise(e.target.value as TipoAnalise)
                  }
                >
                  {opcoesAnalise
                    .filter((o) => o.show)
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>

                {/* CAMPO EXTRA: COMPARAR */}
                {tipoAnalise === "comparar" && (
                  <>
                    <label style={labelStyle}>🆚 Comparar com:</label>
                    <input
                      style={inputStyle}
                      placeholder="VALE3, SP500, OURO…"
                      value={ativoComparar}
                      onChange={(e) => setAtivoComparar(e.target.value)}
                    />
                  </>
                )}

                {/* OBSERVAÇÃO */}
                <label style={labelStyle}>📝 Observação (opcional):</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 50 }}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />

                {/* BOTÃO ANALISAR (PULSE) */}
                <button
                  type="submit"
                  disabled={carregando}
                  className={carregando ? "botao-loading" : ""}
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  {carregando && <div className="spinner" />}
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
                  dangerouslySetInnerHTML={{
                    __html: formatarAnalise(resultado),
                  }}
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
                    cursor: "pointer",
                  }}
                >
                  ↩ Nova análise
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* MODAIS */}
      <PerfilModal
        open={showPerfilModal}
        onClose={() => setShowPerfilModal(false)}
        onResultado={(perfil) => setPerfilInvestidor(perfil)}
      />

      <ConfirmacaoModal
        open={showConfirmacao}
        onCancel={() => setShowConfirmacao(false)}
        onConfirm={gerarAnalise}
        descricao={descricaoAnalise}
        creditos={creditos}
      />

      <HistoricoModal
        open={showHistorico}
        onClose={() => setShowHistorico(false)}
        loading={historicoLoading}
        itens={historico}
      />
    </>
  );
}


