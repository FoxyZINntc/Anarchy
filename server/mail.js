// Envio de emails do Anarchy (confirmar email da conta e recuperar senha).
// Configuração no .env do servidor (qualquer serviço com SMTP: Gmail, Outlook, Brevo, Resend...):
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_USER=seuemail@gmail.com
//   SMTP_PASS=senha de app (no Gmail: myaccount.google.com/apppasswords, precisa da verificação em 2 etapas)
//   EMAIL_FROM=Anarchy <seuemail@gmail.com>      (opcional; padrão: o SMTP_USER)
// Para testar sem enviar de verdade: EMAIL_TESTE_PASTA=pasta (cada email vira um arquivo .txt nessa pasta).
const fs = require('fs');
const path = require('path');

function createMailer({ log = () => {} } = {}) {
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  const testDir = process.env.EMAIL_TESTE_PASTA;
  const from = process.env.EMAIL_FROM || (user ? `Anarchy <${user}>` : 'Anarchy <anarchy@localhost>');
  let transport = null;
  if (host && user && pass) {
    try {
      const nodemailer = require('nodemailer');
      const port = +process.env.SMTP_PORT || 465;
      transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 });
      transport.verify().then(() => log('   Email: pronto para enviar (' + host + ').')).catch(e => log('   Email: o servidor de email recusou o login (' + e.message + '). Confira SMTP_USER/SMTP_PASS no .env.'));
    } catch (e) { log('   Email: pacote "nodemailer" não instalado; rode npm install. Sem envio de email.'); }
  }
  const ready = !!(transport || testDir);
  if (!ready) log('   Email: não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS no .env). Recuperar senha por email fica desligado.');

  // layout simples, que funciona em qualquer leitor de email
  function html(title, paragraphs, button) {
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `<!doctype html><html><body style="margin:0;background:#f2f3f5;font-family:Arial,Helvetica,sans-serif;color:#1f2329">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#d7141f;padding:18px 24px;color:#fff;font-size:22px;font-weight:bold;letter-spacing:.5px">Ⓐ Anarchy</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 14px;font-size:20px">${esc(title)}</h1>
${paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5">${p}</p>`).join('')}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#d7141f;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:bold;font-size:15px">${esc(button.label)}</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#6b7280;word-break:break-all">Se o botão não funcionar, copie este endereço no navegador:<br>${esc(button.url)}</p>` : ''}
<p style="margin:18px 0 0;font-size:12px;color:#6b7280">Se não foi você que pediu, pode ignorar este email. Ninguém entra na sua conta sem ele.</p>
</td></tr></table></td></tr></table></body></html>`;
  }

  async function send(to, subject, text, htmlBody) {
    if (testDir) {
      fs.mkdirSync(testDir, { recursive: true });
      const f = path.join(testDir, `${Date.now()}-${to.replace(/[^a-z0-9@._-]/gi, '_')}.txt`);
      fs.writeFileSync(f, `Para: ${to}\nAssunto: ${subject}\n\n${text}\n`);
      return true;
    }
    if (!transport) throw new Error('o envio de email não está configurado neste servidor');
    await transport.sendMail({ from, to, subject, text, html: htmlBody });
    return true;
  }
  // confere se o servidor de email aceita o login (usado pelo configurar-email do servidor)
  async function check() { if (!transport) throw new Error('faltam SMTP_HOST, SMTP_USER ou SMTP_PASS'); await transport.verify(); return true; }
  return { ready, send, html, check };
}
module.exports = { createMailer };
