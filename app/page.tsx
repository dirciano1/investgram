function formatarAnalise(texto: string) {
  if (!texto) return "";

  let t = texto
    // Remove JSON residual
    .replace(/^\s*\{.*?"resposta":\s*"/, "")
    .replace(/"}\s*$/, "")

    // Negrito → azul
    .replace(/\*\*(.*?)\*\*/g, `<span style="color:#38bdf8;font-weight:600;">$1</span>`)

    // Ajusta \n vindo do Gemini
    .replace(/\\n/g, "\n")

    // Remove múltiplas quebras
    .replace(/\n{2,}/g, "\n");

  // ======================================================
  // TÍTULOS COM EMOJI → VERDE
  // ======================================================
  t = t.replace(
    /^([📌📊📈⚠️🎯🏛🏢].+)$/gm,
    `<div style="
      margin-top:14px;
      margin-bottom:4px;
      color:#22c55e;
      font-weight:700;
      font-size:1.05rem;
    ">$1</div>`
  );

  // ======================================================
  // TÍTULOS NUMERADOS → AZUL
  // ======================================================
  t = t.replace(
    /^(\d+\.\s+[^\n]+)$/gm,
    `<div style="
      margin-top:14px;
      margin-bottom:4px;
      color:#38bdf8;
      font-weight:700;
      font-size:1.05rem;
    ">$1</div>`
  );

  // ======================================================
  // BULLETS: "- " e "•"
  // ======================================================
  t = t.replace(
    /^- (.*)$/gm,
    `<div style="color:#38bdf8;margin-left:10px;margin-bottom:2px;font-weight:500;">
      • $1
    </div>`
  );

  t = t.replace(
    /^•\s*(.*)$/gm,
    `<div style="color:#38bdf8;margin-left:10px;margin-bottom:2px;font-weight:500;">
      • $1
    </div>`
  );

  // ======================================================
  // SEPARADOR AZUL ENTRE PARÁGRAFOS (SEM QUEBRAR HTML)
  // Regras:
  // ✔ NÃO coloca linha após títulos
  // ✔ NÃO coloca linha dentro de bullets
  // ✔ Só marca parágrafos textuais
  // ======================================================

  t = t.replace(
    /(^[^<\n].+?)(?=\n|$)/gm,
    (linha) => {
      const trimmed = linha.trim();
      if (!trimmed) return "";

      // não colocar separador depois de títulos
      if (
        trimmed.match(/^📌|^📊|^📈|^⚠️|^🎯|^🏛|^🏢/) || // titulo com emoji
        trimmed.match(/^\d+\./)                       // titulo numerado
      ) {
        return linha; 
      }

      // não colocar separador em bullets
      if (trimmed.startsWith("•")) {
        return linha;
      }

      // parágrafos normais → recebe linha + separador
      return (
        linha +
        `<div style="border-bottom:1px solid rgba(56,189,248,0.35);margin:6px 0;"></div>`
      );
    }
  );

  // último: transformar \n em <br>
  t = t.replace(/\n/g, "<br>");

  return t;
}
