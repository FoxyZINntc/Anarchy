// Testa o envio de email do Anarchy com as variáveis SMTP_* do ambiente (usado pelo configurar-email.ps1).
// Uso: node servidor-windows/testar-email.js [email-para-receber-o-teste]
const { createMailer } = require('../server/mail');
(async () => {
  const m = createMailer();
  try { await m.check(); console.log('OK_LOGIN'); }
  catch (e) { console.log('ERRO_LOGIN ' + e.message); process.exit(1); }
  const to = process.argv[2];
  if (to) {
    try {
      await m.send(to, 'Anarchy: teste de email', 'Se você recebeu este email, o envio do Anarchy está funcionando. 🎉',
        m.html('Funcionou! 🎉', ['Se você está lendo isto, o servidor do Anarchy consegue mandar emails.', 'Agora a galera já pode confirmar o email da conta e usar o "Esqueci a senha".']));
      console.log('OK_ENVIO');
    } catch (e) { console.log('ERRO_ENVIO ' + e.message); process.exit(2); }
  }
})();
