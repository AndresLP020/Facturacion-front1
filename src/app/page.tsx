"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  CircleHelp,
  Dices,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { HttpError, request } from "@/lib/api";
import {
  ghlContextLabel,
  probeGhlContext,
  type GhlContextView,
} from "@/lib/ghl-context";
import { Button } from "@/components/ui/button";
import { calculateInvoiceAmounts, formatCents } from "@/lib/money";

type Customer = {
  id: string;
  legalName: string;
  rfc: string;
  personType: string;
  taxRegime: string;
  cfdiUse: string;
  postalCode: string;
  state: string;
  municipality: string;
};
type Invoice = {
  id: string;
  total: string | number;
  status: string;
  createdAt: string;
  customer?: { legalName: string };
  items?: unknown[];
  customerId?: string;
  issuedAt?: string;
  paymentForm?: string;
  paymentMethod?: string;
  placeOfIssue?: string;
  currency?: string;
  notes?: string | null;
  simulatedStampId?: string | null;
  simulatedStampedAt?: string | null;
};
type InvoiceForm = { series: string; folio: string; issuedAt: string; paymentForm: string; paymentMethod: string; documentType: string; placeOfIssue: string; currency: string; notes: string; sku: string; satKey: string; description: string; unit: string; quantity: string; unitPrice: string; discount: string; taxRate: string; withholdingRate: string };
const initialInvoice = (): InvoiceForm => ({ series: "", folio: "", issuedAt: new Date().toISOString().slice(0, 10), paymentForm: "03", paymentMethod: "PUE", documentType: "I", placeOfIssue: "", currency: "MXN", notes: "", sku: "DEMO-001", satKey: "01010101", description: "Servicio de prueba sin efectos fiscales", unit: "E48", quantity: "1", unitPrice: "1250", discount: "0", taxRate: "0.16", withholdingRate: "0" });
type UserInfo = {
  user: { id: string; email: string; displayName: string };
  company: { id: string; name: string };
};
const schema = z.object({ email: z.email(), password: z.string().min(8) });
const customerSchema = z.object({
  legalName: z.string().min(2),
  rfc: z.string().min(12).max(13),
  personType: z.enum(["MORAL", "PHYSICAL"]),
  taxRegime: z.string().min(1),
  cfdiUse: z.string().min(1),
  postalCode: z.string().regex(/^\d{5}$/),
  state: z.string().min(2),
  municipality: z.string().min(2),
});

export default function Home() {
  const [me, setMe] = useState<UserInfo | null>(null),
    [tab, setTab] = useState("Dashboard"),
    [customers, setCustomers] = useState<Customer[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [health, setHealth] = useState("checking"),
    [draftId, setDraftId] = useState(""),
    [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(initialInvoice),
    [loadedDraft, setLoadedDraft] = useState<Invoice | null>(null),
    [invoiceCustomerId, setInvoiceCustomerId] = useState(""),
    [ghlProbe, setGhlProbe] = useState<{ result: string; correlationId: string; message: string } | null>(null),
    [ghlContext, setGhlContext] = useState<GhlContextView>({ status: "idle" });
  const invoiceTotals = calculateInvoiceAmounts(invoiceForm);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  const cf = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
  });
  const load = async () => {
    try {
      const who = await request<UserInfo>("auth/me");
      setMe(who);
      const [cs, ins] = await Promise.all([
        request<Customer[]>("customers"),
        request<Invoice[]>("invoices"),
      ]);
      setCustomers(cs);
      setInvoices(ins);
      setHealth("ok");
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) setMe(null);
      else setHealth("error");
    }
  };
  useEffect(() => {
    request("health")
      .then(() => setHealth("ok"))
      .catch(() => setHealth("error"));
    void load();
    setGhlContext({ status: "waiting" });
    void probeGhlContext().then(setGhlContext);
  }, []);
  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  };
  function fillRandomInvoice() {
    if (!customers.length) {
      setError("Crea primero un cliente de prueba para generar la factura.");
      return;
    }
    const integer = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = <T,>(values: T[]) => values[integer(0, values.length - 1)];
    const customer = pick(customers);
    const quantity = String(integer(1, 5));
    const unitPrice = (integer(25000, 250000) / 100).toFixed(2);
    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() - integer(0, 30));
    const issuedAt = [
      issueDate.getFullYear(),
      String(issueDate.getMonth() + 1).padStart(2, "0"),
      String(issueDate.getDate()).padStart(2, "0"),
    ].join("-");
    const sampleNumber = integer(10000, 99999);
    setInvoiceCustomerId(customer.id);
    setInvoiceForm({
      series: pick(["A", "B", "DEMO"]),
      folio: `DEMO-${sampleNumber}`,
      issuedAt,
      paymentForm: pick(["01", "03", "99"]),
      paymentMethod: pick(["PUE", "PPD"]),
      documentType: pick(["I", "E"]),
      placeOfIssue: customer.postalCode,
      currency: pick(["MXN", "MXN", "USD"]),
      notes: `Datos aleatorios de prueba ${sampleNumber}; sin validez fiscal.`,
      sku: `DEMO-${integer(100, 999)}`,
      satKey: pick(["01010101", "81112100", "43231500"]),
      description: `Servicio de prueba sandbox ${sampleNumber}`,
      unit: pick(["E48", "H87", "ACT"]),
      quantity,
      unitPrice,
      discount: pick(["0", "10", "25"]),
      taxRate: pick(["0", "0.08", "0.16"]),
      withholdingRate: pick(["0", "0.0125"]),
    });
    if (loadedDraft?.status === "STAMPED_SIMULATED") {
      setDraftId("");
      setLoadedDraft(null);
    }
    setError("");
    flash("Datos ficticios generados. Revísalos y guarda el borrador.");
  }
  async function login(values: z.infer<typeof schema>) {
    try {
      await request("auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setError("");
      await load();
      flash("Sesión iniciada correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    }
  }
  async function logout() {
    try {
      await request("auth/logout", { method: "POST" });
      setMe(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cerrar sesión.");
    }
  }
  async function addCustomer(values: z.infer<typeof customerSchema>) {
    try {
      await request("customers", {
        method: "POST",
        body: JSON.stringify({ ...values, country: "México" }),
      });
      cf.reset();
      await load();
      flash("Cliente de prueba guardado.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el cliente.",
      );
    }
  }
  async function saveDraft() {
    const selected = customers.find(
      (c) => c.id === (invoiceCustomerId || customers[0]?.id),
    );
    if (!selected) {
      setError("Crea primero un cliente de prueba.");
      return;
    }
    try {
      const updating = Boolean(draftId);
      const result = await request<Invoice>(updating ? `invoices/drafts/${draftId}` : "invoices/drafts", {
        method: updating ? "PATCH" : "POST",
        headers: updating ? {} : { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          customerId: selected.id,
          series: invoiceForm.series || undefined,
          folio: invoiceForm.folio || undefined,
          issuedAt: invoiceForm.issuedAt ? new Date(`${invoiceForm.issuedAt}T12:00:00.000Z`).toISOString() : undefined,
          paymentForm: invoiceForm.paymentForm,
          paymentMethod: invoiceForm.paymentMethod,
          documentType: invoiceForm.documentType,
          placeOfIssue: invoiceForm.placeOfIssue || selected.postalCode,
          currency: invoiceForm.currency,
          notes: invoiceForm.notes,
          items: [{ sku: invoiceForm.sku, satKey: invoiceForm.satKey, description: invoiceForm.description, unit: invoiceForm.unit, quantity: invoiceForm.quantity, unitPrice: invoiceForm.unitPrice, discount: invoiceForm.discount, taxRate: invoiceForm.taxRate, withholdingRate: invoiceForm.withholdingRate }],
        }),
      });
      setDraftId(result.id);
      setLoadedDraft(result);
      await load();
      flash(
        `Borrador ${result.id.slice(0, 8)} guardado. Total simulado: $${result.total}`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el borrador.",
      );
    }
  }
  async function retrieveDraft() {
    if (!draftId) {
      setError("Guarda un borrador en esta sesión o pega su UUID.");
      return;
    }
    try {
      const d = await request<Invoice>(`invoices/drafts/${draftId}`);
      const customer = d.customerId;
      if (customer) setInvoiceCustomerId(customer);
      const item = (d.items?.[0] || {}) as Record<string, string>;
      setInvoiceForm((current) => ({ ...current, series: String((d as any).series || ""), folio: String((d as any).folio || ""), issuedAt: d.issuedAt?.slice(0, 10) || current.issuedAt, paymentForm: d.paymentForm || current.paymentForm, paymentMethod: d.paymentMethod || current.paymentMethod, placeOfIssue: d.placeOfIssue || "", currency: d.currency || current.currency, notes: d.notes || "", sku: item.sku || "", satKey: item.satKey || current.satKey, description: item.description || current.description, unit: item.unit || current.unit, quantity: item.quantity || "1", unitPrice: item.unitPrice || "0", discount: item.discount || "0", taxRate: item.taxRate || "0", withholdingRate: item.withholdingRate || "0" }));
      setLoadedDraft(d);
      flash(`Borrador recuperado. Total simulado: $${d.total}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo consultar el borrador.",
      );
    }
  }
  async function simulateStamp() {
    if (!draftId) {
      setError("Guarda o recupera un borrador antes de simular el timbrado.");
      return;
    }
    if (!window.confirm("Esto solo guardará un timbrado ficticio sin validez fiscal. ¿Continuar?")) return;
    try {
      const result = await request<Invoice & { stampSimulation: { message: string } }>(
        `invoices/drafts/${draftId}/simulate-stamp`,
        { method: "POST" },
      );
      setLoadedDraft(result);
      await load();
      flash(result.stampSimulation.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo simular el timbrado.");
    }
  }
  async function simulateGhlConnectivity() {
    try {
      const result = await request<{ result: string; correlationId: string; message: string }>(
        "integrations/ghl/simulate-connectivity",
        { method: "POST" },
      );
      setGhlProbe(result);
      flash("Prueba local registrada. No se contactó GHL.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo ejecutar la prueba local.",
      );
    }
  }
  if (!me)
    return (
      <main className="login-wrap">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="login-card"
        >
          <div className="brand">
            <div className="brand-mark">A</div>
            <span>Beta AIDA × INVOGO</span>
          </div>
          <div style={{ marginTop: 30 }}>
            <div className="eyebrow">Entorno privado de pruebas</div>
            <h1 className="title">Bienvenido</h1>
            <p className="subtle">Accede al simulador seguro de facturación.</p>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <form
            onSubmit={form.handleSubmit(login)}
            style={{ display: "grid", gap: 15, marginTop: 24 }}
          >
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                autoComplete="username"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <small>{form.formState.errors.email.message}</small>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
            </div>
            <Button variant="primary" type="submit">
              Entrar <ArrowUpRight size={16} />
            </Button>
          </form>
          <div className="login-footer">
            Demo local: <code>demo@aida.test</code> /{" "}
            <code>Demo-AIDA-2026!</code>
            <br />
            La cuenta alternativa de aislamiento está documentada en README.
            <br />
            Contexto GHL: {ghlContextLabel(ghlContext.status)}
            {ghlContext.message ? ` · ${ghlContext.message}` : ""}
          </div>
          <p className="pill" style={{ marginTop: 14 }}>
            SANDBOX · timbrado ficticio, sin validez fiscal
          </p>
        </motion.section>
      </main>
    );
  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Clientes", Users],
    ["Nueva factura", FilePlus2],
    ["Diagnóstico", Activity],
  ] as const;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <span>AIDA × INVOGO</span>
        </div>
        <div className="pill" style={{ width: "fit-content" }}>
          ● SANDBOX
        </div>
        <nav className="nav" aria-label="Navegación principal">
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => {
                setTab(label);
                setError("");
              }}
              className={tab === label ? "active" : ""}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <ShieldCheck size={15} /> Sesión protegida
          <br />
          <br />
          Beta privada · build 0.1
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="subtle">Workspace / {tab}</div>
          <div className="toolbar">
            <span className="subtle">{me.company.name}</span>
            <button
              className="btn ghost"
              aria-label="Cerrar sesión"
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              {notice}
            </div>
          )}
          {tab === "Dashboard" && (
            <>
              <div className="eyebrow">Panel de control</div>
              <h1 className="title">
                Hola, {me.user.displayName.split(" ")[0]}
              </h1>
              <p className="subtle">
                Resumen de la actividad de prueba de {me.company.name}.
              </p>
              <div className="grid stats">
                {[
                  [
                    Users,
                    "Clientes ficticios",
                    customers.length,
                    "Datos persistidos",
                  ],
                  [FileText, "Comprobantes de prueba", invoices.length, "Borrador o timbrado ficticio"],
                  [
                    Wifi,
                    "Backend",
                    health === "ok" ? "Conectado" : "Revisar",
                    "API propia",
                  ],
                  [
                    ShieldCheck,
                    "Empresa activa",
                    "Verificada",
                    "Tenant de sesión",
                  ],
                ].map(([Icon, label, value, note]: any) => (
                  <div className="card" key={label}>
                    <div className="stat-label">
                      <Icon
                        size={15}
                        style={{ verticalAlign: "middle", marginRight: 7 }}
                      />
                      {label}
                    </div>
                    <div className="stat-value">{value}</div>
                    <div className="stat-note">{note}</div>
                  </div>
                ))}
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "minmax(0,1.5fr) minmax(250px,1fr)",
                }}
              >
                <section className="card">
                  <div className="section-head">
                    <div className="section-title">Facturas recientes</div>
                    <button
                      className="btn"
                      onClick={() => setTab("Nueva factura")}
                    >
                      Crear borrador <Plus size={15} />
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Creado</th>
                          <th>Estado</th>
                          <th>Total simulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.slice(0, 5).map((i) => (
                          <tr key={i.id}>
                            <td>{i.customer?.legalName}</td>
                            <td>
                              {new Date(i.createdAt).toLocaleDateString(
                                "es-MX",
                              )}
                            </td>
                            <td>
                              <span className={i.status === "STAMPED_SIMULATED" ? "pill" : "status"}>{i.status === "STAMPED_SIMULATED" ? "Timbrado simulado" : "Borrador"}</span>
                            </td>
                            <td>${Number(i.total).toFixed(2)} MXN</td>
                          </tr>
                        ))}
                        {!invoices.length && (
                          <tr>
                            <td colSpan={4} className="subtle">
                              Aún no hay borradores. Crea uno de prueba.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="card">
                  <div className="section-head">
                    <div className="section-title">Actividad y seguridad</div>
                    <Zap size={17} color="#a998ff" />
                  </div>
                  <div className="activity">
                    <div className="activity-row">
                      <span>Empresa asociada desde sesión</span>
                      <span className="status">Verificada</span>
                    </div>
                    <div className="activity-row">
                      <span>Persistencia PostgreSQL</span>
                      <span className={health === "ok" ? "status" : "pill"}>
                        {health === "ok" ? "Activa" : "Sin conexión"}
                      </span>
                    </div>
                    <div className="activity-row">
                      <span>Integración GHL real</span>
                      <span className="subtle">Desactivada</span>
                    </div>
                    <div className="activity-row">
                      <span>Timbrado fiscal</span>
                      <span className="subtle">No disponible</span>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "Clientes" && (
            <>
              <div className="eyebrow">Directorio</div>
              <div className="section-head">
                <div>
                  <h1 className="title">Clientes de prueba</h1>
                  <p className="subtle">
                    Registros ficticios aislados por empresa.
                  </p>
                </div>
                <div className="toolbar">
                  <input
                    aria-label="Buscar cliente"
                    placeholder="Buscar nombre o RFC"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Search size={17} />
                </div>
              </div>
              <div className="card table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Razón social</th>
                      <th>RFC ficticio</th>
                      <th>Persona</th>
                      <th>Régimen</th>
                      <th>CP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter((c) =>
                        (c.legalName + c.rfc)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <tr key={c.id}>
                          <td>{c.legalName}</td>
                          <td>{c.rfc}</td>
                          <td>
                            {c.personType === "MORAL" ? "Moral" : "Física"}
                          </td>
                          <td>{c.taxRegime}</td>
                          <td>{c.postalCode}</td>
                        </tr>
                      ))}
                    {!customers.length && (
                      <tr>
                        <td colSpan={5} className="subtle">
                          Sin clientes. Añade un registro ficticio abajo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <section className="card" style={{ marginTop: 18 }}>
                <h2 className="section-title">Agregar cliente ficticio</h2>
                <form
                  onSubmit={cf.handleSubmit(addCustomer)}
                  className="form-grid"
                  style={{ marginTop: 16 }}
                >
                  {[
                    ["legalName", "Razón social", "Comercial Demo S.A."],
                    ["rfc", "RFC ficticio", "XAXX010101000"],
                    ["taxRegime", "Régimen fiscal", "601"],
                    ["cfdiUse", "Uso CFDI", "G03"],
                    ["postalCode", "Código postal", "01000"],
                    ["state", "Estado", "Ciudad de México"],
                    ["municipality", "Municipio", "Benito Juárez"],
                  ].map(([name, label, placeholder]) => (
                    <div className="field" key={name}>
                      <label htmlFor={name}>{label}</label>
                      <input
                        id={name}
                        placeholder={placeholder}
                        {...cf.register(
                          name as keyof z.infer<typeof customerSchema>,
                        )}
                      />
                    </div>
                  ))}
                  <div className="field">
                    <label htmlFor="personType">Tipo de persona</label>
                    <select id="personType" {...cf.register("personType")}>
                      <option value="MORAL">Moral</option>
                      <option value="PHYSICAL">Física</option>
                    </select>
                  </div>
                  <div className="wide">
                    <Button variant="primary" type="submit">
                      <Plus size={16} /> Guardar cliente
                    </Button>
                  </div>
                </form>
              </section>
            </>
          )}
          {tab === "Nueva factura" && (
            <>
              <div className="eyebrow">Comprobantes</div>
              <h1 className="title">Nuevo borrador</h1>
              <p className="subtle">
                Captura representativa. Los importes son cálculos ilustrativos,
                no validación fiscal.
              </p>
              <section className="card" style={{ marginTop: 22 }}>
                <div className="section-head">
                  <h2 className="section-title">Datos generales</h2>
                  <button className="btn" type="button" onClick={fillRandomInvoice}>
                    <Dices size={15} /> Llenar datos aleatorios
                  </button>
                </div>
                <div className="form-grid">
                  <div className="field"><label htmlFor="issuedAt">Fecha de emisión</label><input id="issuedAt" type="date" value={invoiceForm.issuedAt} onChange={(e) => setInvoiceForm({ ...invoiceForm, issuedAt: e.target.value })} /></div>
                  <div className="field"><label htmlFor="invoice-series">Serie</label><input id="invoice-series" maxLength={20} value={invoiceForm.series} onChange={(e) => setInvoiceForm({ ...invoiceForm, series: e.target.value })} placeholder="A" /></div>
                  <div className="field"><label htmlFor="invoice-folio">Folio</label><input id="invoice-folio" maxLength={40} value={invoiceForm.folio} onChange={(e) => setInvoiceForm({ ...invoiceForm, folio: e.target.value })} placeholder="1001" /></div>
                  <div className="field"><label htmlFor="paymentForm">Forma de pago</label><select id="paymentForm" value={invoiceForm.paymentForm} onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentForm: e.target.value })}>
                      <option value="03">03 · Transferencia</option>
                      <option value="01">01 · Efectivo</option>
                      <option value="99">99 · Por definir</option>
                    </select></div>
                  <div className="field"><label htmlFor="paymentMethod">Método de pago</label><select id="paymentMethod" value={invoiceForm.paymentMethod} onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}><option value="PUE">PUE · Una exhibición</option><option value="PPD">PPD · Parcialidades</option></select></div>
                  <div className="field"><label htmlFor="documentType">Tipo de comprobante</label><select id="documentType" value={invoiceForm.documentType} onChange={(e) => setInvoiceForm({ ...invoiceForm, documentType: e.target.value })}><option value="I">I · Ingreso (simulado)</option><option value="E">E · Egreso (simulado)</option><option value="P">P · Pago (simulado)</option></select></div>
                  <div className="field"><label htmlFor="currency">Moneda</label><select id="currency" value={invoiceForm.currency} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}><option value="MXN">MXN · Peso mexicano</option><option value="USD">USD · Dólar</option></select></div>
                  <div className="field"><label htmlFor="placeOfIssue">Lugar de expedición</label><input id="placeOfIssue" inputMode="numeric" maxLength={5} value={invoiceForm.placeOfIssue} onChange={(e) => setInvoiceForm({ ...invoiceForm, placeOfIssue: e.target.value })} placeholder="Código postal" /></div>
                  <div className="field wide"><label htmlFor="invoice-notes">Observaciones</label><textarea id="invoice-notes" maxLength={2000} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
                </div>
                <div className="divider" />
                <h2 className="section-title">Datos del cliente</h2>
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor="invoice-customer">Cliente</label>
                  <select
                    id="invoice-customer"
                    value={invoiceCustomerId || customers[0]?.id || ""}
                    onChange={(event) => setInvoiceCustomerId(event.target.value)}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} · {c.rfc}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="divider" />
                <h2 className="section-title">Partidas</h2>
                <div className="form-grid" style={{ marginTop: 14 }}>
                  {([['sku','SKU'],['satKey','Clave SAT de ejemplo'],['description','Descripción'],['unit','Unidad'],['quantity','Cantidad'],['unitPrice','Precio unitario'],['discount','Descuento'],['taxRate','IVA simulado (0 a 1)'],['withholdingRate','Retención simulada (0 a 1)']] as const).map(([key,label]) => <div className="field" key={key}><label htmlFor={`item-${key}`}>{label}</label><input id={`item-${key}`} maxLength={key === 'description' ? 500 : 100} type={['quantity','unitPrice','discount','taxRate','withholdingRate'].includes(key) ? 'number' : 'text'} min={key === 'quantity' ? '0.0001' : '0'} step={['quantity','unitPrice'].includes(key) ? '0.0001' : '0.01'} value={invoiceForm[key]} onChange={(e) => setInvoiceForm({ ...invoiceForm, [key]: e.target.value })} /></div>)}
                </div>
                <div className="divider" />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 15,
                  }}
                >
                  <div>
                    <div className="subtle">Total estimado</div>
                    <div className="stat-value">${formatCents(invoiceTotals.total)} {invoiceForm.currency}</div>
                    <div className="subtle">Subtotal ${formatCents(invoiceTotals.amount)} · Descuento ${formatCents(invoiceTotals.discount)} · IVA simulado ${formatCents(invoiceTotals.tax)}</div>
                  </div>
                  <div className="toolbar">
                    <button className="btn" onClick={retrieveDraft}>
                      <ArrowDownToLine size={15} /> Recuperar borrador
                    </button>
                    <button className="btn primary" onClick={saveDraft} disabled={loadedDraft?.status === "STAMPED_SIMULATED"}>
                      <FileText size={15} /> Guardar borrador
                    </button>
                    <button className="btn" onClick={simulateStamp} disabled={!draftId || loadedDraft?.status === "STAMPED_SIMULATED"} title="Genera solo un registro ficticio, sin CFDI ni efectos fiscales">
                      <Zap size={15} /> Simular timbrado
                    </button>
                  </div>
                </div>
                {loadedDraft && <div className="toast" role="status">Borrador cargado: {loadedDraft.id}. Puedes editarlo y volver a guardarlo; importes ilustrativos, sin validez fiscal.</div>}
                {loadedDraft?.status === "STAMPED_SIMULATED" && <div className="toast" role="status">TIMBRADO SIMULADO · Identificador ficticio: {loadedDraft.simulatedStampId}. No es UUID fiscal y no se generó XML/PDF.</div>}
                <div className="divider" />
                <div className="field">
                  <label htmlFor="draftId">
                    UUID del borrador guardado (para recuperar tras recargar)
                  </label>
                  <input
                    id="draftId"
                    value={draftId}
                    onChange={(e) => setDraftId(e.target.value)}
                    placeholder="Se llena al guardar; conserva el UUID para futuras sesiones"
                  />
                </div>
              </section>
            </>
          )}
          {tab === "Diagnóstico" && (
            <>
              <div className="eyebrow">AIDA · diagnóstico</div>
              <h1 className="title">Estado de integración</h1>
              <p className="subtle">
                Información operativa sanitizada para el entorno de pruebas.
              </p>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                  marginTop: 22,
                }}
              >
                {[
                  ["Frontend", "Operativo"],
                  [
                    "Backend API",
                    health === "ok" ? "Conectado" : "No disponible",
                  ],
                  [
                    "PostgreSQL",
                    health === "ok" ? "Conectado" : "No disponible",
                  ],
                  ["Empresa de prueba", me.company.name],
                  ["Identificador de empresa", me.company.id],
                  [
                    "Contexto GHL",
                    ghlContext.context?.activeLocation
                      ? `${ghlContextLabel(ghlContext.status)} · ${ghlContext.context.activeLocation}`
                      : ghlContextLabel(ghlContext.status),
                  ],
                  [
                    "Usuario GHL",
                    ghlContext.context
                      ? `${ghlContext.context.userName || "—"} (${ghlContext.context.userId})`
                      : "—",
                  ],
                  [
                    "Última operación",
                    invoices[0]
                      ? new Date(invoices[0].createdAt).toLocaleString("es-MX")
                      : "Sin operaciones",
                  ],
                  ["Integración oficial", "Desactivada · faltan credenciales"],
                ].map(([l, v]) => (
                  <div className="card" key={l}>
                    <div className="stat-label">{l}</div>
                    <div
                      style={{
                        marginTop: 10,
                        fontWeight: 600,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ marginTop: 17 }}>
                <div className="section-title">Controles activos</div>
                <div className="activity" style={{ marginTop: 14 }}>
                  <div className="activity-row">
                    <span>Identidad validada por sesión del backend</span>
                    <ShieldCheck size={16} color="#8c77f0" />
                  </div>
                  <div className="activity-row">
                    <span>
                      Tenant asignado desde membresía, nunca desde formulario
                    </span>
                    <ShieldCheck size={16} color="#8c77f0" />
                  </div>
                  <div className="activity-row">
                    <span>Auditoría parcial / correlation ID</span>
                    <span className="subtle">
                      Login, logout y escrituras registradas
                    </span>
                  </div>
                </div>
              </div>
              <div className="card" style={{ marginTop: 17 }}>
                <div className="section-title">Comunicación Custom Page ↔ API</div>
                <p className="subtle" style={{ marginTop: 10 }}>
                  Pide el contexto cifrado al parent de HighLevel y lo descifra el backend con el Shared Secret. No inicia sesión ni llama APIs de GHL.
                </p>
                <p className="subtle" style={{ marginTop: 8 }}>
                  {ghlContext.message || ghlContextLabel(ghlContext.status)}
                </p>
                {ghlContext.context && (
                  <p className="subtle" style={{ marginTop: 8 }}>
                    Location: {ghlContext.context.activeLocation || "agencia (sin activeLocation)"}
                    <br />
                    Email: {ghlContext.context.email || "—"}
                  </p>
                )}
                <button
                  className="btn primary"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    setGhlContext({ status: "waiting" });
                    void probeGhlContext().then(setGhlContext);
                  }}
                >
                  Comprobar contexto GHL
                </button>
              </div>
              <div className="card" style={{ marginTop: 17 }}>
                <div className="section-title">Prueba local del flujo GHL</div>
                <p className="subtle" style={{ marginTop: 10 }}>Verifica navegador → API autenticada → PostgreSQL y guarda un evento de diagnóstico. Es un mock: no abre un iframe real, no valida contexto firmado y no envía solicitudes a GoHighLevel.</p>
                <button className="btn primary" style={{ marginTop: 14 }} onClick={simulateGhlConnectivity}><Wifi size={15} /> Ejecutar prueba local</button>
                {ghlProbe && <div className="toast" role="status" style={{ marginTop: 14 }}>{ghlProbe.message}<br />Correlation ID: {ghlProbe.correlationId}</div>}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
