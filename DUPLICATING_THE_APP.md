# Guía para Duplicar la Aplicación "Agua Diamante ERP"

¡Felicidades por completar tu aplicación! Es muy común necesitar una copia de tu proyecto, ya sea para un nuevo cliente, para crear un entorno de pruebas, o como base para un nuevo desarrollo. Esta guía te explicará cómo hacerlo.

## Resumen del Proceso

Duplicar la aplicación implica dos componentes principales:

1.  **Duplicar el Código Fuente**: Crear una copia de todos los archivos y carpetas de tu aplicación Next.js.
2.  **Duplicar el Backend**: Crear un nuevo proyecto de Firebase completamente separado para que la nueva aplicación tenga su propia base de datos, sistema de usuarios y hosting.

---

### Paso 1: Crear un Nuevo Proyecto en Firebase

Cada copia de tu aplicación debe conectarse a su propio backend para ser verdaderamente independiente.

1.  **Ve a la Consola de Firebase**: Abre la [Consola de Firebase](https://console.firebase.google.com/).
2.  **Agrega un Nuevo Proyecto**: Haz clic en el botón **"Agregar proyecto"**.
3.  **Dale un Nombre Único**: Asígnale un nombre descriptivo. Por ejemplo:
    *   `Agua Diamante - Cliente B`
    *   `Agua Diamante - Pruebas`
    *   `Mi Nuevo ERP`
4.  **Completa el Asistente**: Sigue los pasos que Firebase te indica. No es necesario activar Google Analytics si no lo deseas.
5.  **Activa los Servicios Necesarios**: Una vez creado el proyecto, asegúrate de activar los mismos servicios que usaste en el proyecto original:
    *   **Authentication**: Ve a la sección y actívala. Habilita el proveedor de **"Correo electrónico/Contraseña"**.
    *   **Firestore Database**: Ve a la sección y crea la base de datos.
    *   **Hosting**: Ve a la sección y haz clic en "Comenzar".

---

### Paso 2: Duplicar el Código Fuente

Necesitas una copia de todos los archivos de tu proyecto actual.

*   **Si estás en Firebase Studio**: La forma más sencilla es usar la función de "Exportar Proyecto". Esto descargará un archivo ZIP con todo el código. Luego puedes importarlo en un nuevo proyecto de Studio o trabajarlo localmente.
*   **Si trabajas localmente con Git**: Es tan simple como clonar tu repositorio en una nueva carpeta.

---

### Paso 3: Conectar la Copia del Código al Nuevo Proyecto

Este es el paso más importante. Ahora debes decirle a tu copia del código que se comunique con el nuevo backend de Firebase que creaste en el Paso 1.

1.  **Encuentra las Claves del Nuevo Proyecto**:
    *   En la [Consola de Firebase](https://console.firebase.google.com/), asegúrate de haber seleccionado tu **nuevo proyecto** en el menú desplegable de la parte superior.
    *   Haz clic en el **ícono de engranaje (⚙️)** y selecciona **"Configuración del proyecto"**.
    *   En la pestaña "General", baja hasta "Tus apps". Si no hay una app web, créala.
    *   Selecciona la opción **"Config"** para ver el bloque `firebaseConfig`.
2.  **Actualiza el Archivo `.env.local`**:
    *   En tu **copia del código**, abre el archivo `.env.local`.
    *   Reemplaza los valores de todas las variables `NEXT_PUBLIC_FIREBASE_...` con los valores correspondientes del `firebaseConfig` de tu **nuevo proyecto**.

    ```
    # Estas claves deben ser del NUEVO proyecto de Firebase
    NEXT_PUBLIC_FIREBASE_API_KEY="NUEVA_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="NUEVO_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="NUEVO_PROJECT_ID"
    # ...y así con todas las demás claves.
    ```

---

### Paso 4: Desplegar la Aplicación Duplicada

Ahora que tu código duplicado apunta al nuevo backend, estás listo para ponerlo en línea.

1.  **Abre una terminal** en el directorio de tu código duplicado.
2.  **Selecciona el Proyecto Correcto**: Es crucial asegurarte de que Firebase CLI está apuntando al proyecto correcto. Ejecuta:
    ```bash
    firebase use [ID_DEL_NUEVO_PROYECTO]
    ```
    (Puedes encontrar el ID del proyecto en la configuración del mismo).
3.  **Despliega**: Ejecuta el comando de despliegue:
    ```bash
    firebase deploy --only hosting
    ```

¡Y listo! Al finalizar el despliegue, tu aplicación duplicada estará funcionando en su propio dominio de Firebase (`nuevo-proyecto-id.web.app`) y será completamente independiente de la original. Si deseas, ahora puedes conectar un nuevo dominio personalizado a este nuevo proyecto siguiendo la guía del archivo `DEPLOYMENT.md`.
