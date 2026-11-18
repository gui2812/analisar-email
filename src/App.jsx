// src/App.jsx
// Login por email e senha + tela de triagem (só aparece logado).

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import TriagemEmail from "./pages/TriagemEmail";

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>;

  if (!sessao) return <Login />;

  const usuario = {
    nome: sessao.user.email.split("@")[0],
    email: sessao.user.email,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 24px" }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ padding: "6px 12px", cursor: "pointer" }}
        >
          Sair
        </button>
      </div>
      <TriagemEmail usuario={usuario} />
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("Email ou senha inválidos.");
    setEnviando(false);
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Entrar</h1>
      <form onSubmit={entrar}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 8, marginTop: 4 }}
          />
        </label>
        <button type="submit" disabled={enviando} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
        {erro && <p style={{ color: "#b00020" }}>{erro}</p>}
      </form>
    </div>
  );
}
