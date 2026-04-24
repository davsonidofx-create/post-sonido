const RESEND_API_KEY = 're_SGkokp3H_59Da3b3xsBd5Ue2DWHigPjwh'
const FROM = 'Post Producción de Sonido <onboarding@resend.dev>'

const send = async (to, subject, html) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html })
  })
  if (!res.ok) throw new Error(`Resend error: ${res.status}`)
  return res.json()
}

const emailHtml = (title, color, rows, body, footer = '') => `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#222;">
  <div style="background:${color};padding:18px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">${title}</h2>
    <p style="color:rgba(255,255,255,0.75);margin:5px 0 0;font-size:13px;">Post Producción de Sonido</p>
  </div>
  <div style="background:#f9f9f9;padding:20px 24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
    ${rows ? `<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">${rows}</table>` : ''}
    ${body}
    ${footer ? `<p style="font-size:11px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:12px;">${footer}</p>` : ''}
  </div>
</div>`

const row = (label, value) => `<tr><td style="color:#666;padding:5px 0;width:140px;">${label}</td><td style="font-weight:500;">${value}</td></tr>`

// Coordinadora notifica capítulo → todo el equipo
export const notifyCapituloSubido = (capNum, serieName, teamEmails, coordName, notas) => {
  const html = emailHtml(
    `Capítulo ${capNum} disponible`, '#854F0B',
    row('Serie', serieName) + row('Capítulo', capNum) + row('Notificado por', coordName),
    `<div style="background:#FFF8F0;border-left:3px solid #854F0B;padding:12px;border-radius:0 6px 6px 0;margin-bottom:14px;">
      <p style="margin:0;font-size:14px;line-height:1.6;">El capítulo <strong>${capNum}</strong> ya está disponible en la plataforma. Pueden comenzar a trabajar.</p>
      ${notas ? `<p style="margin:8px 0 0;font-size:12px;color:#633806;"><strong>Notas:</strong> ${notas}</p>` : ''}
    </div>
    <p style="font-size:13px;color:#444;">El jefe asignará las fechas de entrega a cada departamento en breve.</p>`,
    'Sistema Post Producción de Sonido'
  )
  return Promise.all(teamEmails.filter(Boolean).map(e => send(e, `[${serieName}] Cap. ${capNum} disponible — pueden comenzar`, html)))
}

// Bloqueo → SOLO al jefe (inmediato)
export const notifyBloqueo = (userName, dept, capNum, serieName, obs, jefeEmail) => {
  const html = emailHtml(
    `🚨 Bloqueo — ${dept} Cap. ${capNum}`, '#A32D2D',
    row('Serie', serieName) + row('Capítulo', capNum) + row('Departamento', dept) + row('Reportado por', userName),
    `<div style="background:#FCEBEB;border-left:3px solid #A32D2D;padding:12px;border-radius:0 6px 6px 0;margin-bottom:14px;">
      <p style="margin:0;font-size:14px;font-weight:500;color:#791F1F;">Bloqueo activo — requiere atención urgente</p>
      ${obs ? `<p style="margin:8px 0 0;font-size:13px;color:#5C1A1A;">${obs}</p>` : '<p style="margin:8px 0 0;font-size:12px;color:#888;">Sin descripción del bloqueo.</p>'}
    </div>`,
    'Sistema Post Producción de Sonido'
  )
  return send(jefeEmail, `🚨 [${serieName}] BLOQUEO — ${dept} Cap. ${capNum}`, html)
}

// Completo → solo al jefe
export const notifyCompleto = (userName, dept, capNum, serieName, obs, jefeEmail) => {
  const html = emailHtml(
    `✅ Completado — ${dept} Cap. ${capNum}`, '#1D9E75',
    row('Serie', serieName) + row('Capítulo', capNum) + row('Departamento', dept) + row('Completado por', userName),
    `<div style="background:#EAF3DE;border-left:3px solid #1D9E75;padding:12px;border-radius:0 6px 6px 0;margin-bottom:14px;">
      <p style="margin:0;font-size:14px;font-weight:500;color:#27500A;">Tarea completada exitosamente</p>
      ${obs ? `<p style="margin:8px 0 0;font-size:13px;color:#3B6D11;">${obs}</p>` : ''}
    </div>`,
    'Sistema Post Producción de Sonido'
  )
  return send(jefeEmail, `✅ [${serieName}] Completado — ${dept} Cap. ${capNum}`, html)
}

// Jefe asigna fecha → solo el departamento
export const notifyFechaAsignada = (dept, capNum, serieName, fecha, userEmail, jefeName) => {
  const html = emailHtml(
    `Fecha de entrega asignada`, '#185FA5',
    row('Serie', serieName) + row('Capítulo', capNum) + row('Departamento', dept) + row('Fecha de entrega', `<strong style="color:#185FA5;">${fecha}</strong>`) + row('Asignado por', jefeName),
    `<div style="background:#FAEEDA;border:1px solid #EF9F27;border-radius:6px;padding:12px;margin-bottom:14px;">
      <p style="margin:0;font-size:13px;color:#633806;">Por favor confirma el recibo y reporta cualquier bloqueo a tiempo.</p>
    </div>`,
    'Sistema Post Producción de Sonido'
  )
  return send(userEmail, `[${serieName}] Fecha asignada — ${dept} Cap. ${capNum}`, html)
}

// Invitación al proyecto
export const notifyInvitacion = (personName, personEmail, role, serieName, appUrl, jefeName) => {
  const html = emailHtml(
    `Invitación al proyecto`, '#533AB7',
    row('Proyecto', serieName) + row('Tu rol', role) + row('Invitado por', jefeName),
    `<div style="background:#EEEDFE;border-left:3px solid #533AB7;padding:12px;border-radius:0 6px 6px 0;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;font-weight:500;color:#3C3489;">Hola ${personName},</p>
      <p style="margin:8px 0 0;font-size:13px;color:#534AB7;">${jefeName} te invitó a unirte al proyecto <strong>"${serieName}"</strong> como <strong>${role}</strong>.</p>
    </div>
    <p style="font-size:13px;margin-bottom:8px;"><strong>Para entrar a la app:</strong></p>
    <ol style="font-size:13px;color:#444;padding-left:20px;line-height:1.8;">
      <li>Abre este link: <a href="${appUrl}" style="color:#533AB7;">${appUrl}</a></li>
      <li>Ingresa con tu correo: <strong>${personEmail}</strong></li>
      <li>Contraseña temporal: <strong style="color:#533AB7;">Sonido2026</strong></li>
      <li>Cambia tu contraseña desde "¿Olvidaste tu contraseña?"</li>
    </ol>`,
    `Sistema Post Producción de Sonido · ${jefeName}`
  )
  return send(personEmail, `Invitación al proyecto "${serieName}" — Post Producción de Sonido`, html)
}

// Resumen diario → jefe + supervisores
export const notifyResumenDiario = (resumen, serieName, jefeEmail, supervisorEmails = []) => {
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  const completadosHtml = resumen.completados?.length > 0
    ? `<div style="margin-bottom:14px;"><p style="font-size:13px;font-weight:600;color:#27500A;margin:0 0 6px;">✅ Completados</p>${resumen.completados.map(r => `<div style="padding:4px 0;font-size:12px;color:#444;">• Cap. ${r.cap} — ${r.dept} (${r.nombre})</div>`).join('')}</div>` : ''
  const bloqueadosHtml = resumen.bloqueados?.length > 0
    ? `<div style="margin-bottom:14px;"><p style="font-size:13px;font-weight:600;color:#A32D2D;margin:0 0 6px;">🚨 Bloqueados</p>${resumen.bloqueados.map(r => `<div style="padding:4px 0;font-size:12px;color:#444;">• Cap. ${r.cap} — ${r.dept} (${r.nombre})${r.obs ? ': ' + r.obs : ''}</div>`).join('')}</div>` : ''
  const enProcesoHtml = resumen.enProceso?.length > 0
    ? `<div style="margin-bottom:14px;"><p style="font-size:13px;font-weight:600;color:#633806;margin:0 0 6px;">🔄 En proceso</p>${resumen.enProceso.map(r => `<div style="padding:4px 0;font-size:12px;color:#444;">• Cap. ${r.cap} — ${r.dept} (${r.nombre})</div>`).join('')}</div>` : ''
  const sinActividad = !completadosHtml && !bloqueadosHtml && !enProcesoHtml
    ? '<p style="font-size:13px;color:#888;">Sin actividad registrada hoy.</p>' : ''

  const html = emailHtml(
    `Resumen diario — ${hoy}`, '#26215C',
    row('Serie', serieName) + row('Fecha', hoy),
    completadosHtml + bloqueadosHtml + enProcesoHtml + sinActividad,
    'Sistema Post Producción de Sonido'
  )
  const recipients = [jefeEmail, ...supervisorEmails].filter(Boolean)
  return Promise.all(recipients.map(e => send(e, `[${serieName}] Resumen diario — ${hoy}`, html)))
}
