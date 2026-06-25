import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from "react-native";

import { ticketLogin } from "./src/lib/ticket-client";
import { registerDevice, heartbeat } from "./src/lib/backend-api";
import {
  saveTicketSession,
  getTicketSession,
  saveTicketUser,
  getTicketUser,
  saveDeviceCreds,
  getDeviceCreds,
  clearAll,
} from "./src/lib/secure-store";
import { runManualSweep } from "./src/worker/cycle";
import { registerWorker, unregisterWorker, isWorkerRegistered } from "./src/worker/background";

const C = {
  bg: "#0b0f14",
  surface: "#141a22",
  surface2: "#1c242e",
  border: "#26303c",
  text: "#eef2f6",
  muted: "#8b97a5",
  brand: "#1fd6a6",
  brandDark: "#0f172a",
  danger: "#ef5a5a",
  accent: "#ffb020",
};

type Step = "loading" | "login" | "dashboard";

export default function App() {
  const [step, setStep] = useState<Step>("loading");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ticketUser, setTicketUser] = useState("");
  const [workerOn, setWorkerOn] = useState(false);
  const [lastNew, setLastNew] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = useCallback((m: string) => {
    setLog((p) => [`${new Date().toLocaleTimeString()}  ${m}`, ...p].slice(0, 60));
  }, []);

  useEffect(() => {
    (async () => {
      const device = await getDeviceCreds();
      const ticket = await getTicketSession();
      const savedUser = (await getTicketUser()) ?? "";
      setTicketUser(savedUser);
      setWorkerOn(await isWorkerRegistered());
      setStep(device && ticket && ticket.exp > Date.now() ? "dashboard" : "login");
    })().catch(() => setStep("login"));
  }, []);

  const onLogin = useCallback(async () => {
    setError(null);
    if (!user.trim() || !pass) {
      setError("Completá usuario y contraseña de ticket.");
      return;
    }
    setBusy(true);
    try {
      const bundle = await ticketLogin(user.trim(), pass);
      await saveTicketSession(bundle.accessToken, bundle.expiresAt);
      await saveTicketUser(user.trim());

      const device = await getDeviceCreds();
      const creds = await registerDevice(user.trim(), { deviceId: device?.deviceId });
      await saveDeviceCreds(creds);
      await heartbeat(creds.commandToken, { ticketLinked: true });

      setTicketUser(user.trim());
      setPass("");
      setStep("dashboard");
    } catch (e) {
      setError(`No se pudo entrar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [user, pass]);

  const onSweep = useCallback(async () => {
    setBusy(true);
    setLastNew(null);
    try {
      const r = await runManualSweep(pushLog);
      if (r.ran) setLastNew(r.newEvents);
    } finally {
      setBusy(false);
    }
  }, [pushLog]);

  const onToggleWorker = useCallback(async () => {
    try {
      if (workerOn) {
        await unregisterWorker();
        setWorkerOn(false);
        pushLog("Vigilancia en segundo plano: OFF");
      } else {
        await registerWorker();
        setWorkerOn(true);
        pushLog("Vigilancia en segundo plano: ON");
      }
    } catch (e) {
      pushLog(`Error: ${String(e)}`);
    }
  }, [workerOn, pushLog]);

  const onLogout = useCallback(async () => {
    await clearAll();
    setWorkerOn(false);
    setLastNew(null);
    setLog([]);
    setStep("login");
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {step === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.brand} size="large" />
        </View>
      ) : step === "login" ? (
        <LoginScreen
          user={user}
          pass={pass}
          setUser={setUser}
          setPass={setPass}
          onLogin={onLogin}
          busy={busy}
          error={error}
        />
      ) : (
        <DashboardScreen
          ticketUser={ticketUser}
          busy={busy}
          workerOn={workerOn}
          lastNew={lastNew}
          log={log}
          onSweep={onSweep}
          onToggleWorker={onToggleWorker}
          onLogout={onLogout}
        />
      )}
    </SafeAreaView>
  );
}

function LoginScreen(props: {
  user: string;
  pass: string;
  setUser: (v: string) => void;
  setPass: (v: string) => void;
  onLogin: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <ScrollView contentContainerStyle={styles.loginWrap} keyboardShouldPersistTaps="handled">
      <View style={styles.logoDot} />
      <Text style={styles.brandTitle}>Cupet Watcher</Text>
      <Text style={styles.brandSub}>Entrá con tu cuenta de ticket.xutil y ayudá a cazar cupets nuevos.</Text>

      <Card>
        <Field label="Usuario de ticket" value={props.user} onChange={props.setUser} autoCap="none" />
        <Field label="Contraseña" value={props.pass} onChange={props.setPass} secure />
        {props.error && <Text style={styles.error}>{props.error}</Text>}
        <Primary title="Entrar" onPress={props.onLogin} busy={props.busy} />
      </Card>

      <Text style={styles.fine}>
        Tu sesión de ticket queda guardada SOLO en este teléfono. Nunca se envía al servidor.
      </Text>
    </ScrollView>
  );
}

function DashboardScreen(props: {
  ticketUser: string;
  busy: boolean;
  workerOn: boolean;
  lastNew: number | null;
  log: string[];
  onSweep: () => void;
  onToggleWorker: () => void;
  onLogout: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.dashWrap}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.hello}>Hola</Text>
          <Text style={styles.user}>{props.ticketUser}</Text>
        </View>
        <Pressable onPress={props.onLogout} hitSlop={8}>
          <Text style={styles.logout}>Salir</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>
          {props.workerOn ? "Vigilando en segundo plano" : "Vigilancia manual"}
        </Text>
        <Text style={styles.heroNew}>
          {props.lastNew === null ? "—" : props.lastNew}
        </Text>
        <Text style={styles.heroSub}>
          {props.lastNew === null
            ? "Buscá para detectar cupets nuevos"
            : props.lastNew > 0
              ? "cupets nuevos detectados"
              : "sin cupets nuevos esta vez"}
        </Text>
      </View>

      <Primary
        title={props.busy ? "Buscando…" : "Buscar cupets ahora"}
        onPress={props.onSweep}
        busy={props.busy}
      />

      <Pressable onPress={props.onToggleWorker} style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleTitle}>Vigilancia automática</Text>
          <Text style={styles.toggleSub}>Busca solo cada cierto tiempo</Text>
        </View>
        <View style={[styles.switch, props.workerOn && styles.switchOn]}>
          <View style={[styles.knob, props.workerOn && styles.knobOn]} />
        </View>
      </Pressable>

      <Text style={styles.logTitle}>Actividad</Text>
      <View style={styles.logBox}>
        {props.log.length === 0 ? (
          <Text style={styles.logEmpty}>Sin actividad todavía.</Text>
        ) : (
          props.log.map((l, i) => (
            <Text key={i} style={styles.logLine}>
              {l}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  autoCap?: "none" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChange}
        secureTextEntry={props.secure}
        autoCapitalize={props.autoCap ?? "sentences"}
        autoCorrect={false}
        placeholderTextColor={C.muted}
      />
    </View>
  );
}

function Primary({ title, onPress, busy }: { title: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.7 }]}
    >
      {busy ? <ActivityIndicator color={C.brandDark} /> : <Text style={styles.primaryText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  loginWrap: { padding: 24, paddingTop: 64, alignItems: "center" },
  logoDot: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.brand, marginBottom: 18 },
  brandTitle: { color: C.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  brandSub: { color: C.muted, fontSize: 14, textAlign: "center", marginTop: 8, marginBottom: 28, lineHeight: 20 },
  fine: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 18, lineHeight: 18 },

  card: { width: "100%", backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  field: { marginBottom: 14 },
  label: { color: C.muted, fontSize: 12, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: C.surface2,
    color: C.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  error: { color: C.danger, fontSize: 13, marginBottom: 12 },

  primary: {
    backgroundColor: C.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: { color: C.brandDark, fontWeight: "800", fontSize: 16 },

  dashWrap: { padding: 20, paddingTop: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  hello: { color: C.muted, fontSize: 14 },
  user: { color: C.text, fontSize: 22, fontWeight: "800" },
  logout: { color: C.muted, fontSize: 14, fontWeight: "600" },

  hero: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },
  heroLabel: { color: C.accent, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  heroNew: { color: C.text, fontSize: 64, fontWeight: "900", marginVertical: 4 },
  heroSub: { color: C.muted, fontSize: 14 },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  toggleSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  switch: { width: 52, height: 30, borderRadius: 15, backgroundColor: C.surface2, padding: 3, justifyContent: "center" },
  switchOn: { backgroundColor: C.brand },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.muted },
  knobOn: { backgroundColor: C.brandDark, alignSelf: "flex-end" },

  logTitle: { color: C.text, fontSize: 15, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  logBox: { backgroundColor: "#080b0f", borderRadius: 14, padding: 14, minHeight: 120, borderWidth: 1, borderColor: C.border },
  logEmpty: { color: C.muted, fontSize: 13 },
  logLine: { color: "#7fe3c4", fontSize: 11, fontFamily: "monospace", marginBottom: 3 },
});
