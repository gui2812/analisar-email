// supabase/functions/analisar-email/index.ts
// Recebe um email, pede ao Gemini a análise técnica e devolve JSON estruturado.

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CORPO = 20000; // limite de caracteres do corpo enviado à IA

// Schema da resposta. O Gemini garante que o JSON siga esta estrutura.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    para_mim: {
      type: "BOOLEAN",
      description: "true se o email exige ação ou resposta do usuário",
    },
    confianca: {
      type: "NUMBER",
      description: "Confiança na classificação de para_mim, de 0 a 1",
    },
    motivo_classificacao: {
      type: "STRING",
      description: "Justificativa objetiva baseada em evidências do email (destinatário, pedido, contexto)",
    },
    resumo: {
      type: "STRING",
      description: "Resumo técnico do email em até 3 frases, só com fatos do texto",
    },
    o_que_pede: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Ações ou informações solicitadas, uma por item, formuladas de forma específica. Vazia se não houver",
    },
    prazo: {
      type: "STRING",
      nullable: true,
      description: "Prazo explícito no email (data ou condição), ou null se não houver",
    },
    premissas: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Suposições feitas pela análise que não estão explícitas no email",
    },
    pontos_de_atencao: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Riscos, ambiguidades, dependências ou informações faltantes que podem afetar a resposta",
    },
    diretrizes_resposta: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Passos objetivos e ordenados para o usuário responder",
    },
    rascunho_resposta: {
      type: "STRING",
      description: "Rascunho provisório, no idioma do email, direto e profissional, sem enrolação",
    },
  },
  required: [
    "para_mim",
    "confianca",
    "motivo_classificacao",
    "resumo",
    "o_que_pede",
    "premissas",
    "pontos_de_atencao",
    "diretrizes_resposta",
    "rascunho_resposta",
  ],
};

interface EmailEntrada {
  de?: string;
  para?: string;
  cc?: string;
  assunto?: string;
  data?: string;
  corpo?: string;
}

interface UsuarioEntrada {
  nome: string;
  email: string;
}

function montarPrompt(email: EmailEntrada, usuario: UsuarioEntrada): string {
  const corpo = (email.corpo ?? "").slice(0, MAX_CORPO);

  return `Você é um engenheiro sênior fazendo a triagem técnica de emails para ${usuario.nome} (${usuario.email}).

Forma de raciocinar:
1. Leia o email inteiro antes de concluir. Identifique remetente, destinatários, contexto e o que está sendo pedido.
2. Separe fato de inferência. O resumo e o_que_pede usam somente o que está escrito. Qualquer suposição vai em "premissas".
3. Seja específico. Em vez de "enviar informações", escreva "enviar planilha de custos de outubro". Quando houver número, data, valor ou nome de sistema, preserve-o.
4. Procure bloqueios e dependências: aprovações, documentos anexos não recebidos, decisões de terceiros, prazos conflitantes. Liste em "pontos_de_atencao".
5. Classifique "para_mim" pelas evidências:
   - true se o usuário está em "Para" e há pedido, pergunta ou tarefa para ele, ou se o pedido é dirigido a ele pelo nome ou função.
   - false se ele está só em "Cc", se o email é informativo, circular, automático ou marketing, ou se a ação é de outra pessoa.
   - Em caso de dúvida, reduza "confianca" e explique em "motivo_classificacao".
6. Diretrizes: passos curtos, na ordem em que devem ser feitos, cada um executável.
7. Rascunho: resposta provisória curta, clara e no idioma do email. Não invente dados. Use [colchetes] para o que o usuário precisa confirmar.

Email:
- De: ${email.de ?? "não informado"}
- Para: ${email.para ?? "não informado"}
- Cc: ${email.cc ?? "não informado"}
- Assunto: ${email.assunto ?? "(sem assunto)"}
- Data: ${email.data ?? "não informada"}

Corpo:
"""
${corpo}
"""`;
}

class GeminiError extends Error {
  constructor(public status: number, public detalhe: string) {
    super(`Gemini erro ${status}`);
  }
}

async function chamarGemini(prompt: string, apiKey: string): Promise<unknown> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const erro = await res.text();
    throw new GeminiError(res.status, erro);
  }

  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) {
    throw new GeminiError(502, "Resposta vazia do Gemini");
  }

  return JSON.parse(texto);
}

async function usuarioAutenticado(req: Request): Promise<boolean> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;

  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    },
  });
  return res.ok;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ erro: "Método não permitido" }, 405);
  }

  if (!(await usuarioAutenticado(req))) {
    return json({ erro: "Não autorizado" }, 401);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({ erro: "GEMINI_API_KEY não configurada" }, 500);
  }

  let body: { email?: EmailEntrada; usuario?: UsuarioEntrada };
  try {
    body = await req.json();
  } catch {
    return json({ erro: "JSON inválido" }, 400);
  }

  if (!body.email || !body.usuario?.nome || !body.usuario?.email) {
    return json({ erro: "Envie 'email' e 'usuario' (nome e email)" }, 400);
  }

  try {
    const analise = await chamarGemini(
      montarPrompt(body.email, body.usuario),
      apiKey,
    );
    return json({ analise });
  } catch (err) {
    if (err instanceof GeminiError) {
      if (err.status === 429) {
        return json(
          { erro: "Cota gratuita do Gemini esgotada. Tente mais tarde." },
          429,
        );
      }
      console.error("Gemini:", err.status, err.detalhe);
      return json({ erro: "Falha ao consultar o Gemini" }, 502);
    }
    console.error("Erro inesperado:", err);
    return json({ erro: "Erro interno" }, 500);
  }
});
