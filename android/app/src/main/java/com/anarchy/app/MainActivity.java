package com.anarchy.app;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.util.ArrayList;
import java.util.List;

/**
 * O app Android é uma janela para o Anarchy do servidor (o mesmo site do navegador).
 * Ele cuida do que o site sozinho não consegue no celular: microfone e câmera,
 * escolher arquivos, notificações, manter a call viva com a tela apagada e o botão voltar.
 */
public class MainActivity extends Activity {
    static final int REQ_MIDIA = 1, REQ_ARQUIVO = 2, REQ_NOTIF = 3;
    static final String CANAL_MSG = "mensagens";
    static volatile boolean naTela = false;

    FrameLayout raiz;
    WebView web;
    PermissionRequest pedidoPendente;
    ValueCallback<Uri[]> arquivoCb;
    View telaCheia;
    WebChromeClient.CustomViewCallback telaCheiaCb;
    Uri servidor;
    int notifId = 100;

    @Override
    protected void onCreate(Bundle salvo) {
        super.onCreate(salvo);
        servidor = Uri.parse(BuildConfig.SERVER_URL);
        criarCanais();

        raiz = new FrameLayout(this);
        web = new WebView(this);
        raiz.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(raiz);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setTextZoom(100); // a fonte grande do sistema quebrava o layout; o app tem o próprio ajuste de fonte
        s.setUserAgentString(s.getUserAgentString() + " AnarchyAndroid/" + BuildConfig.VERSION_NAME);

        web.addJavascriptInterface(new Ponte(), "AnarchyAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (mesmoServidor(u)) return false;
                abrirFora(u);
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) mostrarSemConexao(String.valueOf(err.getDescription()));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest r) {
                runOnUiThread(() -> pedirMidia(r));
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (arquivoCb != null) arquivoCb.onReceiveValue(null);
                arquivoCb = cb;
                Intent i = p.createIntent();
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolher arquivo"), REQ_ARQUIVO);
                } catch (Exception e) {
                    arquivoCb = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onShowCustomView(View v, CustomViewCallback cb) {
                if (telaCheia != null) { cb.onCustomViewHidden(); return; }
                telaCheia = v; telaCheiaCb = cb;
                raiz.addView(v, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }

            @Override
            public void onHideCustomView() {
                sairTelaCheia();
            }
        });
        web.setDownloadListener((url, ua, cd, mime, tam) -> abrirFora(Uri.parse(url)));

        if (salvo != null) web.restoreState(salvo);
        else web.loadUrl(BuildConfig.SERVER_URL);

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !getPreferences(MODE_PRIVATE).getBoolean("pediuNotif", false)) {
            getPreferences(MODE_PRIVATE).edit().putBoolean("pediuNotif", true).apply();
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        }
    }

    boolean mesmoServidor(Uri u) {
        return u != null && u.getHost() != null && u.getHost().equalsIgnoreCase(servidor.getHost());
    }

    void abrirFora(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
    }

    void mostrarSemConexao(String motivo) {
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d10;color:#e8eaf0;font-family:sans-serif;text-align:center}"
            + "div{padding:24px;max-width:340px}h1{font-size:22px;margin:16px 0 8px}p{color:#8b93a3;line-height:1.5;font-size:15px}"
            + "a{display:inline-block;margin-top:16px;background:#d7141f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700}"
            + "svg{width:84px;height:84px}</style></head><body><div>"
            + "<svg viewBox='0 0 512 512'><rect width='512' height='512' rx='112' fill='#fff'/><g transform='translate(256 262) scale(0.8) translate(-256 -262)' fill='none' stroke='#d7141f'><circle cx='256' cy='276' r='164' stroke-width='38'/><path d='M104 470 L256 74 L408 470' stroke-width='48'/><path d='M58 340 L454 340' stroke-width='46'/></g></svg>"
            + "<h1>Sem conexão com o servidor</h1>"
            + "<p>Confira sua internet. Se o servidor usa Tailscale, deixe o app do Tailscale ligado no celular.</p>"
            + "<a href='" + BuildConfig.SERVER_URL + "'>Tentar de novo</a></div></body></html>";
        web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
    }

    /* ---------- microfone e câmera ---------- */
    void pedirMidia(PermissionRequest r) {
        if (!mesmoServidor(r.getOrigin())) { r.deny(); return; }
        List<String> faltam = new ArrayList<>();
        for (String rec : r.getResources()) {
            String p = permDe(rec);
            if (p != null && checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED && !faltam.contains(p)) faltam.add(p);
        }
        if (faltam.isEmpty()) { r.grant(r.getResources()); return; }
        if (pedidoPendente != null) pedidoPendente.deny();
        pedidoPendente = r;
        requestPermissions(faltam.toArray(new String[0]), REQ_MIDIA);
    }

    static String permDe(String recurso) {
        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(recurso)) return Manifest.permission.RECORD_AUDIO;
        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(recurso)) return Manifest.permission.CAMERA;
        return null;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req != REQ_MIDIA || pedidoPendente == null) return;
        List<String> ok = new ArrayList<>();
        for (String rec : pedidoPendente.getResources()) {
            String p = permDe(rec);
            if (p == null || checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED) ok.add(rec);
        }
        if (ok.isEmpty()) pedidoPendente.deny();
        else pedidoPendente.grant(ok.toArray(new String[0]));
        pedidoPendente = null;
    }

    @Override
    protected void onActivityResult(int req, int res, Intent dados) {
        if (req != REQ_ARQUIVO || arquivoCb == null) { super.onActivityResult(req, res, dados); return; }
        Uri[] r = null;
        if (res == RESULT_OK && dados != null) {
            if (dados.getClipData() != null) {
                r = new Uri[dados.getClipData().getItemCount()];
                for (int i = 0; i < r.length; i++) r[i] = dados.getClipData().getItemAt(i).getUri();
            } else if (dados.getData() != null) r = new Uri[]{dados.getData()};
        }
        arquivoCb.onReceiveValue(r);
        arquivoCb = null;
    }

    /* ---------- ciclo de vida ---------- */
    // de propósito NÃO pausamos o WebView: a call e as mensagens continuam com o app em segundo plano
    @Override
    protected void onResume() {
        super.onResume();
        naTela = true;
        // limpa os avisos de mensagem (a notificação fixa da call, id 1, fica)
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        for (int i = 100; i < notifId; i++) nm.cancel(i);
    }

    @Override
    protected void onPause() {
        super.onPause();
        naTela = false;
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        stopService(new Intent(this, CallService.class));
        web.destroy();
        super.onDestroy();
    }

    void sairTelaCheia() {
        if (telaCheia == null) return;
        raiz.removeView(telaCheia);
        telaCheia = null;
        if (telaCheiaCb != null) telaCheiaCb.onCustomViewHidden();
        telaCheiaCb = null;
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (telaCheia != null) { sairTelaCheia(); return; }
        String url = web.getUrl();
        if (url == null || !mesmoServidor(Uri.parse(url))) { moveTaskToBack(true); return; }
        web.evaluateJavascript("(window.anarchyBack && window.anarchyBack()) ? 1 : 0", v -> {
            if (!"1".equals(v)) moveTaskToBack(true);
        });
    }

    /* ---------- notificações ---------- */
    void criarCanais() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        NotificationChannel c = new NotificationChannel(CANAL_MSG, "Mensagens e chamadas", NotificationManager.IMPORTANCE_HIGH);
        c.setDescription("Mensagens, menções, pedidos de amizade e chamadas");
        nm.createNotificationChannel(c);
        CallService.criarCanal(this);
    }

    PendingIntent abrirApp() {
        Intent i = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** O que o site pode chamar: window.AnarchyAndroid.xxx() */
    class Ponte {
        @JavascriptInterface
        public void notify(String titulo, String texto) {
            if (naTela) return;
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
            Notification n = new Notification.Builder(MainActivity.this, CANAL_MSG)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setStyle(new Notification.BigTextStyle().bigText(texto))
                .setColor(0xFFD7141F)
                .setAutoCancel(true)
                .setContentIntent(abrirApp())
                .build();
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(notifId++, n);
        }

        @JavascriptInterface
        public void askNotify() {
            if (Build.VERSION.SDK_INT >= 33) runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF));
        }

        @JavascriptInterface
        public void call(boolean ligada, String sala) {
            runOnUiThread(() -> {
                Intent i = new Intent(MainActivity.this, CallService.class).putExtra("sala", sala);
                if (ligada) {
                    try { startForegroundService(i); } catch (Exception ignored) { }
                } else stopService(i);
            });
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION_NAME;
        }
    }
}
