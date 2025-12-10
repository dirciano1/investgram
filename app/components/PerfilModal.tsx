"use client";

import { useState } from "react";

interface PerfilModalProps {
  onClose: () => void;
  onPerfilDefinido: (perfil: "conservador" | "moderado" | "agressivo") => void;
}

export default function PerfilModal({ onClose, onPerfilDefinido }: PerfilModalProps) {
  const [respostas, setRespostas] = useState<number[]>([0, 0, 0, 0, 0]);
  const [etapa, setEtapa] = useState(0);

  const perguntas = [
    {
      pergunta: "Qual é o principal objetivo dos seus investimentos?",
      opcoes: [
        { texto: "Preservar meu patrimônio", valor: 1 },
        { texto: "Crescer moderadamente com segurança", valor: 2 },
        { texto: "Maximizar o retorno assumindo mais risco", valor: 3 },
      ],
    },
    {
      pergunta: "Por quanto tempo pretende deixar o dinheiro investido?",
      opcoes: [
        { texto: "Menos de 1 ano", valor: 1 },
        { texto: "Entre 1 e 5 anos", valor: 2 },
        { texto: "Mais de 5 anos", valor: 3 },
      ],
    },
    {
      pergunta: "Como você reage a uma perda de 15% no investimento?",
      opcoes: [
        { texto: "Vendo tudo imediatamente", valor: 1 },
        { texto: "Aguardo recuperar", valor: 2 },
        { texto: "Aproveito para comprar mais", valor: 3 },
      ],
    },
    {
      pergunta: "Qual é seu nível de conhecimento sobre investimentos?",
      opcoes: [
        { texto: "Baixo", valor: 1 },
        { texto: "Médio", valor: 2 },
        { texto: "Alto", valor: 3 },
      ],
    },
    {
      pergunta: "Como está sua estabilidade financeira?",
      opcoes: [
        { texto: "Dependo desse dinheiro, não posso arriscar", valor: 1 },
        { texto: "Posso arriscar moderadamente", valor: 2 },
        { texto: "Posso assumir riscos elevados", valor: 3 },
      ],
    },
  ];

  const selecionarOpcao = (valor: number) => {
    const novas = [...respostas];
    novas[etapa] = valor;
    setRespostas(novas);
  };

  const proximaEtapa = () => {
    if (etapa < perguntas.length - 1) {
      setEtapa(etapa + 1);
    } else {
      finalizarPerfil();
    }
  };

  const finalizarPerfil = () => {
    const total = respostas.reduce((acc, v) => acc + v, 0);

    let perfil: "conservador" | "moderado" | "agressivo";

    if (total <= 7) perfil = "conservador";
    else if (total <= 11) perfil = "moderado";
    else perfil = "agressivo";

    onPerfilDefinido(perfil);
    onClose();
  };

  const etapaAtual = perguntas[etapa];

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="bg-gray-900 border border-green-500 rounded-2xl p-6 w-[92%] max-w-md shadow-xl animate-fadeIn">
        
        <h2 className="text-xl font-semibold text-green-400 mb-4 text-center">
          Descubra seu Perfil de Investidor
        </h2>

        <p className="text-gray-300 text-sm mb-4 text-center">
          Pergunta {etapa + 1} de {perguntas.length}
        </p>

        <h3 className="text-white font-medium mb-4">{etapaAtual.pergunta}</h3>

        <div className="flex flex-col gap-3">
          {etapaAtual.opcoes.map((op, idx) => (
            <button
              key={idx}
              onClick={() => selecionarOpcao(op.valor)}
              className={`p-3 rounded-lg text-left border transition ${
                respostas[etapa] === op.valor
                  ? "bg-green-600 border-green-400 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {op.texto}
            </button>
          ))}
        </div>

        <button
          disabled={respostas[etapa] === 0}
          onClick={proximaEtapa}
          className={`mt-6 w-full py-3 rounded-lg font-semibold transition ${
            respostas[etapa] === 0
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-green-500 text-black hover:bg-green-400"
          }`}
        >
          {etapa === perguntas.length - 1 ? "Finalizar" : "Próxima"}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-gray-400 hover:text-white text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
