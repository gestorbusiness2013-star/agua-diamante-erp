# Guía de Despliegue a Producción

¡Felicidades! Tu aplicación "Agua Diamante ERP" está casi lista para ser publicada. Para que funcione perfectamente en un entorno de producción, es necesario realizar algunas configuraciones clave. Esta guía te orientará en los pasos necesarios.

## Resumen de Tareas

Actualmente, la aplicación utiliza datos de demostración y un inicio de sesión simulado. Para producción, necesitamos:

1.  **Configurar variables de entorno**: Para conectar la aplicación a Firebase.
2.  **Configurar Reglas de Seguridad**: Para permitir que la app acceda a la base de datos.
3.  **Implementar una base de datos persistente**: Reemplazando los datos de demo.
4.  **Implementar un sistema de autenticación seguro**: Para gestionar usuarios y proteger el acceso.
5.  **Desplegar la aplicación**: Usando Firebase App Hosting.
6.  **Conectar un dominio personalizado**: Para usar tu propio dominio (ej. `www.tuempresa.com`).

---

### Paso 1: Configurar Variables de Entorno de Firebase

Este es el paso más importante para que tu aplicación se pueda comunicar con tu proyecto de Firebase.

**Tareas:**

1.  **Encuentra tus claves de Firebase**:
    *   Ve a la [Consola de Firebase](https://console.firebase.google.com/).
    *   Haz clic en el **ícono de engranaje (⚙️)** y selecciona **"Project settings"** (Configuración del proyecto).
    *   En la pestaña "General", baja hasta **"Your apps"** (Tus apps).
    *   Selecciona tu aplicación web y luego la opción **"Config"**.
    *   Verás un bloque de código `firebaseConfig`.
2.  **Crea el archivo de configuración local**:
    *   En el explorador de archivos, crea un nuevo archivo en el directorio raíz y llámalo: `.env.local`
3.  **Añade las claves al archivo**:
    *   Copia y pega el siguiente contenido en `.env.local` y reemplaza los valores con los de tu `firebaseConfig`.

        ```
        NEXT_PUBLIC_FIREBASE_API_KEY="TU_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="TU_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="TU_APP_ID"
        ```
4.  **Añade la clave de API de Genkit (opcional, para IA)**:
    *   Obtén tu clave desde [Google AI Studio](https://aistudio.google.com/).
    *   Añade la siguiente línea a tu archivo `.env.local`:
        ```
        GOOGLE_API_KEY=TU_CLAVE_DE_API_DE_GENKIT_AQUÍ
        ```

Después de guardar el archivo `.env.local`, **recarga la página de la aplicación**.

---

### Paso 2: Configurar Reglas de Seguridad de Firestore

Por defecto, tu base de datos está protegida y no permite que la aplicación lea o escriba datos, incluso si el usuario ha iniciado sesión. Debemos configurar las reglas para permitir el acceso.

**Tareas:**

1.  **Ve a la sección de Reglas**:
    *   En la [Consola de Firebase](https://console.firebase.google.com/), ve a la sección **Build > Firestore Database**.
    *   Haz clic en la pestaña **"Rules"** (Reglas) en la parte superior.
2.  **Actualiza las reglas para desarrollo**:
    *   Borra todo el contenido del editor y reemplázalo con lo siguiente:
        ```javascript
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if request.auth != null;
            }
          }
        }
        ```
    *   Esta regla permite que cualquier usuario autenticado pueda leer y escribir datos. Es segura para empezar, pero para producción querrás reglas más específicas.
3.  **Publica los cambios**:
    *   Haz clic en el botón **"Publish"**. Los cambios pueden tardar unos minutos en aplicarse.

---

### Paso 3: Implementar una Base de Datos Persistente

Ahora que la conexión y los permisos funcionan, el siguiente paso es reemplazar los datos de demostración en memoria por una base de datos real.

**Tarea:**
Modificar `src/context/inventory-context.tsx`. En este archivo, todos los `useState` (como `useState<InventoryItem[]>(initialInventoryItems)`) deben ser reemplazados.

*   **Lectura**: En lugar de usar `initial...` data, debes hacer una llamada a Firestore para obtener los datos cuando el componente se carga.
*   **Escritura**: Las funciones `set...` (como `setInventoryItems`, `setExpenses`, etc.) deben modificarse para que, en lugar de actualizar el estado local, escriban los cambios directamente en tu base de datos de Firestore.

---

### Paso 4: Implementar Autenticación con Firebase Authentication

El inicio de sesión actual es una simulación. Para un sistema seguro, necesitas **Firebase Authentication**.

**Tareas:**
1.  **Habilitar Autenticación**: En tu Consola de Firebase, ve a la sección de "Authentication" y habilita el proveedor de "Correo electrónico y contraseña".
2.  **Actualizar la Página de Inicio de Sesión**: Modifica `src/app/page.tsx` para que el formulario llame a las funciones de Firebase Authentication (ej. `signInWithEmailAndPassword`) en lugar de simplemente navegar al dashboard.
3.  **Proteger Rutas**: Implementa lógica para que solo los usuarios autenticados puedan acceder a las rutas del `/dashboard`.

---

### Paso 5: Desplegar con Firebase App Hosting

Una vez completados los pasos anteriores, ¡estás listo para desplegar!

El archivo `apphosting.yaml` ya está configurado para ti. Simplemente ejecuta el siguiente comando en tu terminal:

```bash
firebase deploy --only hosting
```

Firebase se encargará de construir y desplegar tu aplicación. ¡Y listo! Tu ERP estará funcionando perfectamente en línea.

---

### Paso 6: Conectar un Dominio Personalizado (Opcional)

Una vez que tu aplicación está desplegada, querrás que los usuarios la accedan desde tu propio dominio (ej. `www.tuempresa.com`) en lugar de la URL de Firebase. ¡Conectar un dominio que compraste en un proveedor como Hostinger es muy sencillo!

**Resumen del Proceso:**

1.  **En Firebase**: Le dices a Firebase cuál es tu dominio.
2.  **En Hostinger**: Firebase te dará unos registros (TXT y A) que debes configurar en Hostinger para demostrar que eres el dueño del dominio y para apuntarlo a los servidores de Firebase.
3.  **¡Listo!**: Esperas un poco y Firebase se encarga del resto, incluyendo el certificado de seguridad SSL.

**Pasos Detallados:**

1.  **Inicia el Proceso en Firebase**:
    *   Ve a la [Consola de Firebase](https://console.firebase.google.com/).
    *   En el menú de la izquierda, ve a **Build > Hosting**.
    *   Haz clic en el botón **"Add custom domain"** (Añadir dominio personalizado).

2.  **Añade tu Dominio y Verifícalo**:
    *   Escribe el dominio que compraste en Hostinger (ej. `www.aguadiamante.com`) y haz clic en "Continuar".
    *   Firebase te dará un **registro TXT**. Este es un código que sirve para verificar que el dominio es tuyo. **Copia este valor.**

3.  **Configura el Registro TXT en Hostinger**:
    *   Ve a tu panel de control de **Hostinger**.
    *   Busca la sección de **"Editor de Zona DNS"** o "DNS / Nameservers" de tu dominio.
    *   Crea un **nuevo registro** con la siguiente información:
        *   **Tipo**: `TXT`
        *   **Nombre/Host**: `@` (o el nombre de tu dominio, dependiendo de la interfaz de Hostinger)
        *   **Valor/Contenido**: Pega el valor TXT que te dio Firebase.
    *   Guarda los cambios.

4.  **Verifica en Firebase y Obtén las IPs**:
    *   Vuelve a la consola de Firebase y haz clic en **"Verify"**. *Nota: Los cambios de DNS pueden tardar unos minutos en propagarse, así que si no funciona al instante, espera un poco y vuelve a intentarlo.*
    *   Una vez verificado, Firebase te mostrará los **registros A**. Estos son las direcciones IP de los servidores de Firebase donde vive tu aplicación. Verás una o dos direcciones IP.

5.  **Configura los Registros A en Hostinger**:
    *   Vuelve al **Editor de Zona DNS** en Hostinger.
    *   Busca los registros de tipo **`A`** que apunten a tu dominio raíz (`@` o `www`). Puede que necesites eliminar los que ya existen para evitar conflictos.
    *   Crea un nuevo **registro A** para cada IP que te dio Firebase:
        *   **Tipo**: `A`
        *   **Nombre/Host**: `@` (para el dominio raíz, ej. `aguadiamante.com`)
        *   **Valor/Apunta a**: La primera dirección IP que te dio Firebase.
    *   Si Firebase te dio una segunda IP, repite el paso anterior para crear un segundo registro `A`.

6.  **Finalizar y Esperar**:
    *   Una vez añadidos los registros `A`, vuelve a Firebase y haz clic en **"Finish"**.
    *   El estado aparecerá como "Needs setup" y luego "Pending". Esto es normal. Firebase está trabajando para apuntar tu dominio y generar un **certificado SSL gratuito** para ti.
    *   Este proceso puede tardar desde unos minutos hasta un par de horas. Cuando esté listo, el estado cambiará a **"Connected"**.

¡Y eso es todo! Tu aplicación estará funcionando de forma segura en tu propio dominio personalizado.
