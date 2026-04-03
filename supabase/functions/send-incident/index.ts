import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const from = Deno.env.get("EMAIL_FROM") || "Acme <onboarding@resend.dev>";
const contactEmail = Deno.env.get("CONTACT_EMAIL") || "delivered@resend.dev";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { title, description, severity, reportedBy, notifyEmails } = body;

    if (!title || !description || !severity) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: title, description, severity" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const severityColor: Record<string, string> = {
      low: "#2563eb",
      medium: "#d97706",
      high: "#dc2626",
    };

    const severityLabel: Record<string, string> = {
      low: "🟢 Bajo",
      medium: "🟡 Medio",
      high: "🔴 Alto",
    };

    const color = severityColor[severity] ?? "#6b7280";
    const label = severityLabel[severity] ?? severity;
    const date = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

    const incidentHtml = `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: ${color}; padding: 20px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🚨 Nuevo Incidente</h1>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 8px;"><strong>Título:</strong> ${title}</p>
          <p style="margin: 0 0 8px;"><strong>Severidad:</strong> ${label}</p>
          <p style="margin: 0 0 8px;"><strong>Descripción:</strong> ${description}</p>
          <p style="margin: 0 0 8px;"><strong>Reportado por:</strong> ${reportedBy ?? "Sistema"}</p>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">📅 ${date}</p>
        </div>
      </div>
    `;

    const emails: { from: string; to: string[]; subject: string; html: string }[] = [
      {
        // Notificación al equipo
        from,
        to: [contactEmail],
        subject: `🚨 Incidente reportado: ${title}`,
        html: incidentHtml,
      },
      {
        // Confirmación al que reportó
        from,
        to: [reportedBy ?? contactEmail],
        subject: `✅ Incidente recibido: ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: #111827; padding: 20px;">
              <h1 style="color: white; margin: 0; font-size: 20px;">✅ Incidente registrado</h1>
            </div>
            <div style="padding: 24px;">
              <p>Tu reporte fue recibido y el equipo fue notificado.</p>
              <p style="margin: 0 0 8px;"><strong>Título:</strong> ${title}</p>
              <p style="margin: 0 0 8px;"><strong>Severidad:</strong> ${label}</p>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">📅 ${date}</p>
            </div>
          </div>
        `,
      },
    ];

    // Notificaciones individuales a técnicos seleccionados
    const extraRecipients: string[] = Array.isArray(notifyEmails)
      ? notifyEmails.filter((e: unknown) => typeof e === "string" && e !== reportedBy).slice(0, 2)
      : [];

    for (const techEmail of extraRecipients) {
      emails.push({
        from,
        to: [techEmail],
        subject: `🚨 Incidente asignado: ${title}`,
        html: incidentHtml,
      });
    }

    const { data, error } = await resend.batch.send(emails);

    if (error) {
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, ids: data?.data.map((e) => e.id) }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("Error inesperado:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
