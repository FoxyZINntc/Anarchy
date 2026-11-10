// Anarchy — envio de emails (confirmar email da conta e "Esqueci a senha").
// O servidor do Anarchy chama esta função; ela manda o email pelo Brevo (brevo.com, grátis até 300 por dia).
// Segredos (Supabase > Edge Functions > Secrets):
//   BREVO_API_KEY  chave de API do Brevo (começa com "xkeysib-")
//   EMAIL_FROM     email do remetente, confirmado no Brevo em "Remetentes" (ex.: voce@gmail.com)
// Só aceita pedidos com o token do servidor (o mesmo da função anarchy-db).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const okTokens = new Map<string, number>(); // cache de tokens válidos (5 min)
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function authorized(token: string | null) {
  if (!token || token.length < 20) return false;
  const h = await sha256(token);
  const until = okTokens.get(h);
  if (until && until > Date.now()) return true;
  const { data, error } = await sb.from("servidor_tokens").select("token_hash").eq("token_hash", h).maybeSingle();
  if (error || !data) return false;
  okTokens.set(h, Date.now() + 5 * 60_000);
  return true;
}
const EMAIL_RE = /^[^\s@<>()",;:\\]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/i;
// aceita "voce@x.com" ou "Anarchy <voce@x.com>"
function sender() {
  const raw = (Deno.env.get("EMAIL_FROM") || "").trim();
  const m = /^(.*)<([^>]+)>\s*$/.exec(raw);
  const email = (m ? m[2] : raw).trim();
  const name = (m ? m[1] : "").trim().replace(/^"|"$/g, "") || "Anarchy";
  return EMAIL_RE.test(email) ? { name, email } : null;
}
async function brevoError(r: Response) {
  const j: any = await r.json().catch(() => ({}));
  return `o Brevo respondeu ${r.status}${j.message ? ": " + j.message : ""}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!(await authorized(req.headers.get("x-anarchy-token") || req.headers.get("x-discordia-token")))) return json({ error: "Token de servidor inválido." }, 401);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  const key = Deno.env.get("BREVO_API_KEY"), from = sender();
  try {
    if (b.op === "status") {
      // diz o que falta, e confere se a chave funciona
      if (!key) return json({ configured: false, falta: "BREVO_API_KEY" });
      if (!from) return json({ configured: false, falta: "EMAIL_FROM" });
      const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" } });
      if (!r.ok) return json({ configured: false, erro: await brevoError(r) });
      return json({ configured: true, from: from.email });
    }
    if (b.op === "send") {
      if (!key || !from) throw new Error("o envio de email não está configurado no Supabase (faltam os segredos BREVO_API_KEY e EMAIL_FROM)");
      const to = String(b.to || "").trim().toLowerCase();
      if (!EMAIL_RE.test(to)) throw new Error("email de destino inválido");
      const subject = String(b.subject || "").slice(0, 200), text = String(b.text || "").slice(0, 20000), html = String(b.html || "").slice(0, 100000);
      if (!subject || (!text && !html)) throw new Error("email vazio");
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: from, to: [{ email: to }], subject, ...(html ? { htmlContent: html } : {}), ...(text ? { textContent: text } : {}) }),
      });
      if (!r.ok) throw new Error(await brevoError(r));
      return json({ ok: true });
    }
    return json({ error: "Operação desconhecida." }, 400);
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error(`anarchy-mail ${b && b.op}: ${msg}`); // sem o endereço de destino: o registro não guarda emails de ninguém
    return json({ error: msg }, 400);
  }
});
