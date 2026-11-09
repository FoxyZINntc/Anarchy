package com.anarchy.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * Enquanto você está numa call, este serviço deixa uma notificação fixa ("Na call")
 * para o Android não fechar o app quando a tela apaga ou você troca de app.
 */
public class CallService extends Service {
    static final String CANAL = "call";
    static final int ID = 1;
    static volatile boolean ativo = false;
    PowerManager.WakeLock trava;

    static void criarCanal(Context c) {
        NotificationChannel ch = new NotificationChannel(CANAL, "Call em andamento", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Mantém a call ligada com o app em segundo plano");
        ch.setShowBadge(false);
        ((NotificationManager) c.getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String sala = intent != null ? intent.getStringExtra("sala") : null;
        Intent abrir = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 1, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("Na call")
            .setContentText(sala != null && !sala.isEmpty() ? sala : "Anarchy")
            .setColor(0xFFD7141F)
            .setOngoing(true)
            .setContentIntent(pi)
            .build();
        boolean mic = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                int tipo = mic ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE | ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                               : ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
                startForeground(ID, n, tipo);
            } else if (Build.VERSION.SDK_INT >= 29) {
                startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(ID, n);
            }
        } catch (Exception e) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (trava == null) {
            trava = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "anarchy:call");
            trava.acquire(6 * 60 * 60 * 1000L); // no máximo 6 horas
        }
        ativo = true;
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        ativo = false;
        if (trava != null && trava.isHeld()) trava.release();
        trava = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) { return null; }
}
