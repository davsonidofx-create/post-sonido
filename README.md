# Post Producción de Sonido — App

Aplicación web completa para gestión de post producción de sonido con autenticación real, base de datos en tiempo real y notificaciones por correo.

## Stack
- **React + Vite** — Frontend
- **Firebase Auth** — Login con correo y contraseña
- **Firestore** — Base de datos en tiempo real
- **Vercel** — Hosting gratuito

---

## PASO 1 — Crear proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Clic en **"Agregar proyecto"**
3. Ponle un nombre (ej: `post-sonido`)
4. Desactiva Google Analytics (no es necesario) → **Crear proyecto**

### Activar Authentication
1. En el menú lateral → **Authentication** → **Comenzar**
2. Tab **"Sign-in method"** → Habilitar **Correo electrónico/Contraseña**
3. Guardar

### Crear base de datos Firestore
1. Menú lateral → **Firestore Database** → **Crear base de datos**
2. Elegir **"Comenzar en modo de producción"**
3. Seleccionar región (ej: `us-central1`) → Listo

### Obtener configuración
1. Configuración del proyecto (ícono ⚙️) → **Configuración general**
2. Bajar a **"Tus apps"** → Clic en **"</>"** (Web)
3. Registrar app con cualquier nombre
4. Copiar el objeto `firebaseConfig`

---

## PASO 2 — Configurar el proyecto

Abre el archivo `src/lib/firebase.js` y reemplaza los valores:

```js
const firebaseConfig = {
  apiKey: "TU_API_KEY",           // ← reemplaza
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
}
```

---

## PASO 3 — Subir reglas de Firestore

1. En Firebase Console → **Firestore** → Tab **"Reglas"**
2. Copiar el contenido de `firestore.rules` y pegarlo
3. **Publicar**

---

## PASO 4 — Publicar en Vercel

1. Sube el proyecto a GitHub (nuevo repositorio)
2. Ve a https://vercel.com → **"New Project"**
3. Importa el repositorio de GitHub
4. Vercel detecta Vite automáticamente → clic en **Deploy**
5. En ~2 minutos tendrás una URL tipo `post-sonido.vercel.app`

---

## PASO 5 — Crear el primer usuario (Jefe)

Desde la consola de Firebase, crea el primer usuario manualmente:

1. **Authentication** → **Usuarios** → **Agregar usuario**
2. Correo: `jefe@tuempresa.com`, contraseña temporal
3. Copia el **UID** que aparece
4. Ve a **Firestore** → **users** → **Agregar documento**
5. ID del documento = el UID copiado
6. Campos:
   - `name`: "Roberto Jefe"
   - `email`: "jefe@tuempresa.com"
   - `role`: "jefe"
   - `series`: [] (array vacío, agregar series después)

Desde ahí el jefe puede entrar a la app y:
- Crear series
- Invitar al resto del equipo (les llega correo con link para crear su cuenta)

---

## Roles disponibles
| Rol | Acceso |
|-----|--------|
| `jefe` | Todo — cronograma, fechas, QC, equipo |
| `coordinadora` | Notificar capítulos |
| `dx` | DX + ADR |
| `fx` | FX |
| `foley` | Foley |
| `musica` | Musicalización |
| `vfx` | VFX |
| `mezcla` | Mezcla |

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

