// src/pages/TriagemEmail.jsx
// Tela para colar um email, enviar à Edge Function analisar-email e exibir a análise.

import { useState } from "react";
import { supabase } from "../lib/supabase";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisar-email`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EMAIL_VAZIO = {
  de: "",
  para: "",
  cc: "",
  assunto: "",
  data: "",
  corpo: "",
};

export default function TriagemEmail({ usuario }) {
  // usuario: { nome, email }, vindo do contexto de autenticação da aplicação
  const [email, setEmail] = useState(EMAIL_VAZIO);
  const [analise, setAnalise] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [rascunho, setRascunho] = useState("");
  const [copiado, setCopiado] = useState(false);

  function atualizarCampo(campo, valor) {
    setEmail((prev) => ({ ...prev, [campo]: valor }));
  }

  async function analisar(e) {
    e.preventDefault();
    setErro("");
    setAnalise(null);
    setCopiado(false);

    if (!email.corpo.trim()) {
      setErro("Cole o corpo do email antes de analisar.");
      return;
    }

    setCarregando(true);
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao?.session?.access_token;
      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ email, usuario }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.erro ?? `Erro ${res.status}`);
      }

      setAnalise(payload.analise);
      setRascunho(payload.analise.rascunho_resposta ?? "");
    } catch (err) {
      setErro(err.message || "Falha ao analisar o email.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiarRascunho() {
    await navigator.clipboard.writeText(rascunho);
    setCopiado(true);
  }

  function limpar() {
    setEmail(EMAIL_VAZIO);
    setAnalise(null);
    setRascunho("");
    setErro("");
    setCopiado(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Triagem de email</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Cole o email para analisar se ele é direcionado a você.
      </p>

      <form onSubmit={analisar}>
        <div style={grid}>
          <Campo label="De" value={email.de} onChange={(v) => atualizarCampo("de", v)} />
          <Campo label="Para" value={email.para} onChange={(v) => atualizarCampo("para", v)} />
          <Campo label="Cc" value={email.cc} onChange={(v) => atualizarCampo("cc", v)} />
          <Campo label="Data" value={email.data} onChange={(v) => atualizarCampo("data", v)} placeholder="2026-11-18" />
        </div>

        <Campo label="Assunto" value={email.assunto} onChange={(v) => atualizarCampo("assunto", v)} />

        <label style={{ display: "block", marginTop: 12 }}>
          <span style={rotulo}>Corpo do email</span>
          <textarea
            rows={10}
            value={email.corpo}
            onChange={(e) => atualizarCampo("corpo", e.target.value)}
            style={{ ...input, resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit" disabled={carregando} style={botaoPrimario}>
            {carregando ? "Analisando..." : "Analisar"}
          </button>
          <button type="button" onClick={limpar} disabled={carregando} style={botaoSecundario}>
            Limpar
          </button>
        </div>
      </form>

      {erro && <p style={{ color: "#b00020", marginTop: 16 }}>{erro}</p>}

      {analise && (
        <section style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ ...badge, background: analise.para_mim ? "#1b7f3b" : "#777" }}>
              {analise.para_mim ? "Para você" : "Informativo"}
            </span>
            <span style={{ color: "#666" }}>
              Confiança: {Math.round((analise.confianca ?? 0) * 100)}%
            </span>
          </div>

          <Bloco titulo="Motivo da classificação">
            <p>{analise.motivo_classificacao}</p>
          </Bloco>

          <Bloco titulo="Resumo">
            <p>{analise.resumo}</p>
          </Bloco>

          {analise.prazo && (
            <Bloco titulo="Prazo">
              <p>{analise.prazo}</p>
            </Bloco>
          )}

          <Bloco titulo="O que é pedido">
            <Lista itens={analise.o_que_pede} vazio="Nenhuma ação solicitada." />
          </Bloco>

          <Bloco titulo="Pontos de atenção">
            <Lista itens={analise.pontos_de_atencao} vazio="Nenhum ponto identificado." />
          </Bloco>

          <Bloco titulo="Premissas da análise">
            <Lista itens={analise.premissas} vazio="Nenhuma premissa registrada." />
          </Bloco>

          <Bloco titulo="Diretrizes para responder">
            <ol style={{ paddingLeft: 20 }}>
              {(analise.diretrizes_resposta ?? []).map((item, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{item}</li>
              ))}
            </ol>
          </Bloco>

          <Bloco titulo="Rascunho provisório">
            <textarea
              rows={8}
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              style={{ ...input, resize: "vertical" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <button type="button" onClick={copiarRascunho} style={botaoPrimario}>
                Copiar rascunho
              </button>
              {copiado && <span style={{ color: "#1b7f3b" }}>Copiado</span>}
            </div>
          </Bloco>
        </section>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block", marginTop: 12 }}>
      <span style={rotulo}>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </label>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 6, fontSize: 16 }}>{titulo}</h3>
      {children}
    </div>
  );
}

function Lista({ itens = [], vazio }) {
  if (!itens.length) return <p style={{ color: "#777" }}>{vazio}</p>;
  return (
    <ul style={{ paddingLeft: 20 }}>
      {itens.map((item, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const rotulo = { display: "block", fontSize: 13, color: "#444", marginBottom: 4 };

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
};

const botaoPrimario = {
  padding: "8px 16px",
  background: "#1f3a5f",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const botaoSecundario = {
  padding: "8px 16px",
  background: "#fff",
  color: "#1f3a5f",
  border: "1px solid #1f3a5f",
  borderRadius: 6,
  cursor: "pointer",
};

const badge = {
  color: "#fff",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
};
