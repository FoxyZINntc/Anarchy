// Discordia — porta de acesso do servidor ao banco.
// Usa a chave interna do Supabase (que nunca sai daqui) e só aceita pedidos
// com um token de servidor cujo hash está na tabela servidor_tokens.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES: Record<string, string[]> = {
  usuarios: ["id"], sessoes: ["token"], grupos: ["id"], canais: ["id"], grupo_membros: ["group_id", "user_id"],
  amizades: ["user_id", "friend_id"], pedidos_amizade: ["from_id", "to_id"], conversas: ["id"], mensagens: ["id"],
};
const BUCKET = "uploads";
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
const table = (t: unknown) => {
  if (typeof t !== "string" || !(t in TABLES)) throw new Error("tabela inválida");
  return t;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!(await authorized(req.headers.get("x-discordia-token")))) return json({ error: "Token de servidor inválido." }, 401);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  try {
    switch (b.op) {
      case "ping":
        return json({ ok: true, bucket: BUCKET, publicPrefix: `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${BUCKET}/` });
      case "select": {
        const from = Math.max(0, b.from | 0), to = Math.min(from + 999, b.to | 0);
        const { data, error } = await sb.from(table(b.table)).select("*").range(from, to);
        if (error) throw error;
        return json({ data });
      }
      case "upsert": {
        const t = table(b.table);
        if (!Array.isArray(b.rows) || b.rows.length > 1000) throw new Error("linhas inválidas");
        const { error } = await sb.from(t).upsert(b.rows, { onConflict: TABLES[t].join(",") });
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteIn": {
        const t = table(b.table);
        if (TABLES[t].length !== 1 || !Array.isArray(b.values) || b.values.length > 1000) throw new Error("pedido inválido");
        const { error } = await sb.from(t).delete().in(TABLES[t][0], b.values);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteMatch": {
        const t = table(b.table);
        const m = b.match || {};
        if (!TABLES[t].every((k) => typeof m[k] === "string") || Object.keys(m).length !== TABLES[t].length) throw new Error("pedido inválido");
        const { error } = await sb.from(t).delete().match(m);
        if (error) throw error;
        return json({ ok: true });
      }
      case "upload": {
        if (!/^[\w-]+\.(png|jpg|gif|webp)$/.test(b.name || "")) throw new Error("nome de arquivo inválido");
        if (!/^image\/(png|jpeg|gif|webp)$/.test(b.type || "")) throw new Error("tipo inválido");
        const bytes = Uint8Array.from(atob(b.data || ""), (c) => c.charCodeAt(0));
        if (bytes.length > 8 * 1024 * 1024) throw new Error("imagem maior que 8 MB");
        const { error } = await sb.storage.from(BUCKET).upload(b.name, bytes, { contentType: b.type, upsert: false, cacheControl: "2592000" });
        if (error) throw error;
        return json({ url: sb.storage.from(BUCKET).getPublicUrl(b.name).data.publicUrl });
      }
      default:
        return json({ error: "Operação desconhecida." }, 400);
    }
  } catch (e) {
    const msg = (e as Error).message || String(e);
    // fica no registro da função (Supabase > Edge Functions > Logs) para descobrir o motivo de cada erro
    console.error(`discordia-db ${b && b.op} ${b && (b.table || b.name || "")}: ${msg}`);
    return json({ error: msg }, 400);
  }
});
