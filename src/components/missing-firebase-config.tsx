'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export function MissingFirebaseConfig() {
  return (
    <>
      <Card className="w-full max-w-2xl shadow-2xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">¡Casi listo! Falta la configuración de Firebase</CardTitle>
          <CardDescription>
            Tu aplicación necesita saber a qué proyecto de Firebase conectarse para poder funcionar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Para solucionarlo, sigue estos pasos:</p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              En otra pestaña, abre la configuración de tu proyecto en la consola de Firebase haciendo clic en el{' '}
              <strong>ícono de engranaje (⚙️)</strong> junto a "Project Overview" y luego en{' '}
              <strong>"Project settings"</strong>.
            </li>
            <li>
              En la pestaña "General", baja hasta la sección <strong>"Your apps"</strong> (Tus apps) y busca tu aplicación web. Si no tienes una, créala primero.
            </li>
            <li>
              Selecciona <strong>"Config"</strong> como el tipo de "SDK setup". Verás un bloque de código que empieza con <code>const firebaseConfig = &#123; ... &#125;;</code>.
            </li>
            <li>
              Ahora, aquí en Firebase Studio, en el explorador de archivos de la izquierda, crea un nuevo archivo en la raíz de tu proyecto (al mismo nivel que `package.json`) y llámalo:
              <pre className="mt-2 rounded-md bg-muted p-2 font-code text-xs">.env.local</pre>
            </li>
            <li>
              Copia el siguiente contenido, pégalo en ese nuevo archivo `.env.local`, y reemplaza los valores de ejemplo con los de tu proyecto que encontraste en el paso 3:
              <pre className="mt-2 rounded-md bg-muted p-4 font-code text-xs overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY="TU_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="TU_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="TU_APP_ID"
`}
              </pre>
            </li>
          </ol>
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Después de guardar el archivo `.env.local`, <strong>recarga esta página</strong>. La aplicación detectará las claves y te mostrará el formulario de inicio de sesión.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </>
  );
}
