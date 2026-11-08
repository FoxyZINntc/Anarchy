// somtela.exe: captura o som do Windows para o compartilhamento de tela, do jeito do Discord.
//   somtela.exe excluir <pid>   -> som de tudo, MENOS o processo <pid> e os filhos dele (o proprio Discordia: sem eco das vozes da call)
//   somtela.exe janela <hwnd>   -> so o som do programa dono da janela <hwnd> (e dos filhos dele)
// Usa a "process loopback" do Windows 10 2004+ / Windows 11. Escreve PCM 16 bits, 48 kHz, estereo no stdout.
// No stderr escreve "ok" quando comecou ou "erro ..." e sai com codigo 1. Para quando o stdin fecha (o app fechou).
// Compilado com o csc do .NET Framework que ja vem no Windows (veja desktop/native/compilar.cmd).
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

static class SomTela {
  const int RATE = 48000, CH = 2, BITS = 16;

  [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioClient {
    [PreserveSig] int Initialize(int shareMode, uint flags, long bufferDuration, long periodicity, IntPtr format, IntPtr sessionGuid);
    [PreserveSig] int GetBufferSize(out uint frames);
    [PreserveSig] int GetStreamLatency(out long latency);
    [PreserveSig] int GetCurrentPadding(out uint padding);
    [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
    [PreserveSig] int GetMixFormat(out IntPtr format);
    [PreserveSig] int GetDevicePeriod(out long def, out long min);
    [PreserveSig] int Start();
    [PreserveSig] int Stop();
    [PreserveSig] int Reset();
    [PreserveSig] int SetEventHandle(IntPtr handle);
    [PreserveSig] int GetService([MarshalAs(UnmanagedType.LPStruct)] Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
  }

  [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioCaptureClient {
    [PreserveSig] int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devPos, out ulong qpcPos);
    [PreserveSig] int ReleaseBuffer(uint frames);
    [PreserveSig] int GetNextPacketSize(out uint frames);
  }

  [ComImport, Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IActivateAudioInterfaceAsyncOperation {
    [PreserveSig] int GetActivateResult(out int hr, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
  }

  [ComImport, Guid("41D949AB-9862-444A-80F6-C261334DA5EB"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IActivateAudioInterfaceCompletionHandler {
    [PreserveSig] int ActivateCompleted(IActivateAudioInterfaceAsyncOperation op);
  }

  // marca que o objeto pode ser chamado de qualquer thread (o Windows exige para este callback)
  [ComImport, Guid("94ea2b94-e9cc-49e0-c0ff-ee64ca8f5b90"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAgileObject { }

  [ClassInterface(ClassInterfaceType.None)]
  class Done : IActivateAudioInterfaceCompletionHandler, IAgileObject {
    public readonly ManualResetEvent Ev = new ManualResetEvent(false);
    public int Hr = -1; public object Client;
    public int ActivateCompleted(IActivateAudioInterfaceAsyncOperation op) {
      int hr; object o;
      int r = op.GetActivateResult(out hr, out o);
      Hr = r < 0 ? r : hr; Client = o; Ev.Set(); return 0;
    }
  }

  [DllImport("Mmdevapi.dll", ExactSpelling = true)]
  static extern int ActivateAudioInterfaceAsync([MarshalAs(UnmanagedType.LPWStr)] string path, [MarshalAs(UnmanagedType.LPStruct)] Guid iid,
    IntPtr activationParams, IActivateAudioInterfaceCompletionHandler handler, out IActivateAudioInterfaceAsyncOperation op);

  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);

  static int Fail(string t) { Console.Error.WriteLine("erro " + t); Console.Error.Flush(); return 1; }

  [MTAThread]
  static int Main(string[] args) {
    if (args.Length < 2) return Fail("uso: somtela excluir <pid> | janela <hwnd>");
    uint pid; int mode; // 0 = so este processo, 1 = tudo menos este processo
    if (args[0] == "janela") {
      long h; if (!long.TryParse(args[1], out h)) return Fail("janela invalida");
      GetWindowThreadProcessId(new IntPtr(h), out pid); mode = 0;
      if (pid == 0) return Fail("janela nao encontrada");
    } else if (args[0] == "incluir") {
      if (!uint.TryParse(args[1], out pid)) return Fail("pid invalido");
      mode = 0;
    } else {
      if (!uint.TryParse(args[1], out pid)) return Fail("pid invalido");
      mode = 1;
    }

    // AUDIOCLIENT_ACTIVATION_PARAMS { tipo = PROCESS_LOOPBACK, pid, modo }
    IntPtr ap = Marshal.AllocHGlobal(12);
    Marshal.WriteInt32(ap, 0, 1); Marshal.WriteInt32(ap, 4, (int)pid); Marshal.WriteInt32(ap, 8, mode);
    // PROPVARIANT do tipo VT_BLOB apontando para os parametros
    IntPtr pv = Marshal.AllocHGlobal(24);
    for (int i = 0; i < 24; i++) Marshal.WriteByte(pv, i, 0);
    Marshal.WriteInt16(pv, 0, 65); Marshal.WriteInt32(pv, 8, 12); Marshal.WriteIntPtr(pv, 16, ap);

    var done = new Done(); IActivateAudioInterfaceAsyncOperation op;
    int hr = ActivateAudioInterfaceAsync("VAD\\Process_Loopback", typeof(IAudioClient).GUID, pv, done, out op);
    if (hr < 0) return Fail("ativar " + hr.ToString("X8"));
    if (!done.Ev.WaitOne(5000)) return Fail("ativar demorou");
    if (done.Hr < 0 || done.Client == null) return Fail("ativar " + done.Hr.ToString("X8"));
    var client = (IAudioClient)done.Client;

    // WAVEFORMATEX: PCM 16 bits 48 kHz estereo
    IntPtr wf = Marshal.AllocHGlobal(18);
    Marshal.WriteInt16(wf, 0, 1); Marshal.WriteInt16(wf, 2, CH); Marshal.WriteInt32(wf, 4, RATE);
    Marshal.WriteInt32(wf, 8, RATE * CH * BITS / 8); Marshal.WriteInt16(wf, 12, (short)(CH * BITS / 8));
    Marshal.WriteInt16(wf, 14, BITS); Marshal.WriteInt16(wf, 16, 0);
    const uint LOOPBACK = 0x00020000, EVENTCALLBACK = 0x00040000, AUTOCONVERT = 0x80000000, SRCQUALITY = 0x08000000;
    hr = client.Initialize(0, LOOPBACK | EVENTCALLBACK | AUTOCONVERT | SRCQUALITY, 1000000, 0, wf, IntPtr.Zero);
    if (hr < 0) return Fail("iniciar " + hr.ToString("X8"));
    var ev = new AutoResetEvent(false);
    hr = client.SetEventHandle(ev.SafeWaitHandle.DangerousGetHandle());
    if (hr < 0) return Fail("evento " + hr.ToString("X8"));
    object svc; hr = client.GetService(typeof(IAudioCaptureClient).GUID, out svc);
    if (hr < 0) return Fail("servico " + hr.ToString("X8"));
    var cap = (IAudioCaptureClient)svc;
    hr = client.Start();
    if (hr < 0) return Fail("comecar " + hr.ToString("X8"));
    Console.Error.WriteLine("ok"); Console.Error.Flush();

    // o app fechou o stdin (ou morreu): para
    var parada = new Thread(() => { try { var i = Console.OpenStandardInput(); var b = new byte[64]; while (i.Read(b, 0, b.Length) > 0) { } } catch { } Environment.Exit(0); });
    parada.IsBackground = true; parada.Start();

    var outp = Console.OpenStandardOutput();
    var buf = new byte[RATE * CH * 2]; // 1 s
    try {
      while (true) {
        ev.WaitOne(200);
        uint n;
        while (cap.GetNextPacketSize(out n) >= 0 && n > 0) {
          IntPtr data; uint frames, flags; ulong a, b;
          if (cap.GetBuffer(out data, out frames, out flags, out a, out b) < 0) break;
          int bytes = (int)frames * CH * 2;
          if (bytes > buf.Length) buf = new byte[bytes];
          if ((flags & 2) != 0) Array.Clear(buf, 0, bytes); // silencio
          else Marshal.Copy(data, buf, 0, bytes);
          cap.ReleaseBuffer(frames);
          outp.Write(buf, 0, bytes);
        }
        outp.Flush();
      }
    } catch (IOException) { return 0; } // o app parou de ler
  }
}
