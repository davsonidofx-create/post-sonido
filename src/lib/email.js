import emailjs from '@emailjs/browser'

const SERVICE_ID = 'service_zv08bej'
const TEMPLATE_ID = 'template_oj6j9or'
const PUBLIC_KEY = 'FLxVdbMjYLzsHZtHB'

emailjs.init(PUBLIC_KEY)

const send = (to_email, subject, message, name = 'Post Sonido') => {
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, { to_email, subject, message, name })
}

const sendToMultiple = (emails, subject, message, name = 'Post Sonido') => {
  return Promise.all(emails.filter(Boolean).map(e => send(e, subject, message, name)))
}

// Coordinadora notifica capítulo → todo el equipo
export const notifyCapituloSubido = (capNum, serieName, teamEmails, coordName, notas) => {
  const subject = `[${serieName}] Cap. ${capNum} disponible — pueden comenzar`
  const message = `Hola equipo,

${coordName} informa que el Capítulo ${capNum} de "${serieName}" ya está disponible en la plataforma y pueden comenzar a trabajar.
${notas ? `\nNotas: ${notas}` : ''}

El jefe asignará las fechas de entrega a cada departamento en breve.

— Sistema Post Producción de Sonido`
  return sendToMultiple(teamEmails, subject, message, coordName)
}

// Bloqueo → SOLO al jefe (inmediato)
export const notifyBloqueo = (userName, dept, capNum, serieName, obs, jefeEmail) => {
  const subject = `[${serieName}] BLOQUEO — ${dept} Cap. ${capNum}`
  const message = `ALERTA DE BLOQUEO

${userName} (${dept}) reportó un bloqueo en el Capítulo ${capNum} de "${serieName}".
${obs ? `\nMotivo: ${obs}` : '\nSin descripción del bloqueo.'}

Por favor gestionar con urgencia.

— Sistema Post Producción de Sonido`
  return send(jefeEmail, subject, message, userName)
}

// Completo → solo al jefe
export const notifyCompleto = (userName, dept, capNum, serieName, obs, jefeEmail) => {
  const subject = `[${serieName}] Completado — ${dept} Cap. ${capNum}`
  const message = `TAREA COMPLETADA

${userName} (${dept}) completó el Capítulo ${capNum} de "${serieName}".
${obs ? `\nObservación: ${obs}` : ''}

— Sistema Post Producción de Sonido`
  return send(jefeEmail, subject, message, userName)
}

// Jefe asigna fecha → solo el departamento
export const notifyFechaAsignada = (dept, capNum, serieName, fecha, userEmail, jefeName) => {
  const subject = `[${serieName}] Fecha asignada — ${dept} Cap. ${capNum}`
  const message = `Hola,

${jefeName} te asignó la fecha de entrega para el Capítulo ${capNum} de "${serieName}".

Departamento: ${dept}
Fecha de entrega: ${fecha}

Por favor confirma el recibo y reporta cualquier bloqueo a tiempo.

— Sistema Post Producción de Sonido`
  return send(userEmail, subject, message, jefeName)
}

// Invitación al proyecto
export const notifyInvitacion = (personName, personEmail, role, serieName, appUrl, jefeName) => {
  const subject = `Invitación al proyecto "${serieName}" — Post Producción de Sonido`
  const message = `Hola ${personName},

${jefeName} te invitó a unirte al proyecto "${serieName}" como ${role}.

Para entrar a la app sigue estos pasos:

1. Abre este link: ${appUrl}
2. Selecciona tu rol: ${role}
3. Ingresa con tu correo: ${personEmail}
4. Contraseña temporal: Sonido2026
5. Cambia tu contraseña desde "¿Olvidaste tu contraseña?"

— ${jefeName}
Sistema Post Producción de Sonido`
  return send(personEmail, subject, message, jefeName)
}

// Resumen diario → jefe + supervisores
export const notifyResumenDiario = (resumen, serieName, jefeEmail, supervisorEmails = []) => {
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  const subject = `[${serieName}] Resumen diario — ${hoy}`
  const completados = resumen.completados?.length > 0
    ? `COMPLETADOS:\n${resumen.completados.map(r => `  • Cap. ${r.cap} — ${r.dept} (${r.nombre})`).join('\n')}` : ''
  const bloqueados = resumen.bloqueados?.length > 0
    ? `BLOQUEADOS:\n${resumen.bloqueados.map(r => `  • Cap. ${r.cap} — ${r.dept} (${r.nombre})${r.obs ? ': ' + r.obs : ''}`).join('\n')}` : ''
  const enProceso = resumen.enProceso?.length > 0
    ? `EN PROCESO:\n${resumen.enProceso.map(r => `  • Cap. ${r.cap} — ${r.dept} (${r.nombre})`).join('\n')}` : ''
  const message = `RESUMEN DEL DÍA — ${hoy}
Serie: ${serieName}

${completados}
${bloqueados}
${enProceso}
${!completados && !bloqueados && !enProceso ? 'Sin actividad registrada hoy.' : ''}

— Sistema Post Producción de Sonido`
  const recipients = [jefeEmail, ...supervisorEmails].filter(Boolean)
  return sendToMultiple(recipients, subject, message, 'Post Sonido')
}
