// ════════════════════════════════════════════════════════════════════
//  alertas-emo — Supabase Edge Function
//  Revisa EMOs de Comindustria y envía alerta por email (Resend)
//  si hay vencidos o por vencer en ≤30 días.
//  Se dispara diariamente vía pg_cron (ver sql/cron_alertas_emo.sql).
// ════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config de email ──────────────────────────────────────────────────
const TO = ["fsalaman@comindustria.pe", "marcoa800.mm@gmail.com"];

// FROM: team.salud@medicloud.pe (requiere verificar medicloud.pe en resend.com/domains)
const FROM      = "Medicloud Safety — Salud Ocupacional <team.salud@medicloud.pe>";
const REPLY_TO  = "medico.ocupacional@comindustria.pe";

// ── Env vars (secrets de Supabase, no hardcodeados) ──────────────────
const RESEND_KEY         = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Helpers ───────────────────────────────────────────────────────────
function calcVigencia(ultimaEmo: string | null, duracion: string | null): string | null {
  if (!ultimaEmo || !duracion) return null;
  const d = new Date(ultimaEmo + "T00:00:00");
  if (duracion === "Anual")   d.setFullYear(d.getFullYear() + 1);
  if (duracion === "Bianual") d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().split("T")[0];
}
function diasHasta(vence: string, hoy: Date): number {
  return Math.ceil((new Date(vence + "T00:00:00").getTime() - hoy.getTime()) / 86_400_000);
}

// ── HTML del email ────────────────────────────────────────────────────
function buildHTML(porVencer: any[], vencidos: any[], fecha: string): string {
  const thStyle = `padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;
                   text-transform:uppercase;letter-spacing:.05em;background:#f9fafb`;
  const encabezado = `<tr>
    <th style="${thStyle}">Trabajador</th>
    <th style="${thStyle}">DNI</th>
    <th style="${thStyle}">Cargo</th>
    <th style="${thStyle}">Vence el</th>
    <th style="${thStyle};text-align:center">Días</th>
  </tr>`;

  const filaVencido = (w: any) => `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;font-weight:600;color:#dc2626">${w.nombre}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;color:#6b7280;font-size:12px">${w.dni}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;color:#6b7280">${w.cargo || "—"}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;color:#dc2626">${w.vence}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;text-align:center">
      <span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700">
        VENCIDO hace ${Math.abs(w.dias)}d
      </span>
    </td>
  </tr>`;

  const filaPorVencer = (w: any) => {
    const urgente = w.dias <= 7;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #fef3c7;font-weight:600;color:#1f2937">${w.nombre}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fef3c7;color:#6b7280;font-size:12px">${w.dni}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fef3c7;color:#6b7280">${w.cargo || "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fef3c7;color:#1f2937">${w.vence}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fef3c7;text-align:center">
        <span style="background:${urgente ? "#fee2e2" : "#fef3c7"};color:${urgente ? "#dc2626" : "#d97706"};
                     padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700">
          ${w.dias} día${w.dias === 1 ? "" : "s"}
        </span>
      </td>
    </tr>`;
  };

  const secVencidos = vencidos.length ? `
    <div style="margin-bottom:24px">
      <h3 style="margin:0 0 10px;color:#dc2626;font-size:15px">
        🔴 EMO Vencidos — ${vencidos.length} trabajador(es)
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;border:1px solid #fecaca;border-radius:8px;overflow:hidden">
        ${encabezado}${vencidos.map(filaVencido).join("")}
      </table>
    </div>` : "";

  const secPorVencer = porVencer.length ? `
    <div style="margin-bottom:24px">
      <h3 style="margin:0 0 10px;color:#d97706;font-size:15px">
        🟡 Por vencer en ≤30 días — ${porVencer.length} trabajador(es)
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;border:1px solid #fde68a;border-radius:8px;overflow:hidden">
        ${encabezado}${porVencer.map(filaPorVencer).join("")}
      </table>
    </div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
    <div style="max-width:680px;margin:0 auto;padding:24px 16px">

      <div style="background:#111827;border-radius:12px 12px 0 0;padding:24px 24px 20px;text-align:center">
        <div style="color:#10b981;font-size:20px;font-weight:700;letter-spacing:-.3px">Medicloud Safety</div>
        <div style="color:#6b7280;font-size:12px;margin-top:4px">Sistema de Gestión de Salud Ocupacional</div>
      </div>

      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 4px;color:#111827;font-size:19px">⚠️ Alerta de Vencimiento de EMO</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px">
          Empresa: <strong style="color:#1f2937">Comindustria</strong> &nbsp;·&nbsp;
          Fecha: <strong style="color:#1f2937">${fecha}</strong> &nbsp;·&nbsp;
          <strong style="color:#dc2626">${vencidos.length + porVencer.length} caso(s)</strong> requieren atención
        </p>

        ${secVencidos}
        ${secPorVencer}

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                    padding:14px 16px;font-size:13px;color:#166534;margin-top:8px">
          <strong>Acción requerida:</strong> Programar los exámenes médicos ocupacionales
          de los trabajadores listados a la brevedad posible. Los EMO vencidos deben
          regularizarse de inmediato para el levantamiento de la No Conformidad de auditoría.
        </div>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;
                  border-radius:0 0 12px 12px;padding:16px;text-align:center">
        <p style="margin:0;color:#9ca3af;font-size:11px">
          Correo automático enviado por <strong>Medicloud Safety</strong> ·
          <a href="https://ssoma-hse.vercel.app" style="color:#6b7280">ssoma-hse.vercel.app</a>
        </p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:11px">
          Dr. Marco Melgarejo · Médico Ocupacional · team.salud@medicloud.pe
        </p>
      </div>

    </div>
  </body></html>`;
}

// ── Handler principal ─────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);

    // 1. Buscar empresa Comindustria
    const { data: empresas, error: empErr } = await supabase
      .from("empresas")
      .select("id, nombre")
      .ilike("nombre", "%comindustria%");

    if (empErr) throw new Error("Error buscando empresa: " + empErr.message);
    if (!empresas?.length) {
      return new Response(JSON.stringify({ sent: false, reason: "No se encontró empresa Comindustria" }), { status: 200 });
    }

    const empresaIds = empresas.map((e: any) => e.id);

    // 2. Obtener trabajadores activos con datos de EMO
    const { data: workers, error: wErr } = await supabase
      .from("trabajadores")
      .select("id, nombre, dni, cargo, ultima_emo, duracion_emo")
      .in("empresa_id", empresaIds)
      .eq("estado", "Activo");

    if (wErr) throw new Error("Error buscando trabajadores: " + wErr.message);
    if (!workers?.length) {
      return new Response(JSON.stringify({ sent: false, reason: "Sin trabajadores activos" }), { status: 200 });
    }

    // 3. Calcular alertas (solo ≤30 días)
    const hoy = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
    const alertas = workers
      .map((w: any) => {
        const v = calcVigencia(w.ultima_emo, w.duracion_emo);
        if (!v) return null;
        const dias = diasHasta(v, hoy);
        return dias <= 30 ? { ...w, vence: v, dias } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.dias - b.dias);

    // 4. Si no hay alertas, no enviar nada
    if (!alertas.length) {
      return new Response(JSON.stringify({ sent: false, reason: "Sin alertas hoy — no se envió correo" }), { status: 200 });
    }

    const porVencer = alertas.filter((a: any) => a.dias >= 0);
    const vencidos  = alertas.filter((a: any) => a.dias < 0);
    const fechaHoy  = hoy.toISOString().split("T")[0];

    // 5. Enviar email por Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        reply_to: REPLY_TO,
        subject: `⚠ Alerta EMO Comindustria — ${alertas.length} caso(s) · ${fechaHoy}`,
        html: buildHTML(porVencer, vencidos, fechaHoy),
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) throw new Error("Resend error: " + JSON.stringify(emailData));

    console.log(`Alerta enviada: ${vencidos.length} vencidos, ${porVencer.length} por vencer`);
    return new Response(
      JSON.stringify({ sent: true, vencidos: vencidos.length, porVencer: porVencer.length, resend: emailData }),
      { status: 200 }
    );

  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
