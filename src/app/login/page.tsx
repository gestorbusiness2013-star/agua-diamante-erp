'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2, Fingerprint, ScanFace } from "lucide-react";
import Image from "next/image";
import { MissingFirebaseConfig } from "@/components/missing-firebase-config";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  const [email, setEmail] = useState("robertdavi@hotmail.com");
  const [password, setPassword] = useState("ADMIN123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    // Si la autenticación no está cargando y ya hay un usuario, redirige al dashboard.
    if (!authLoading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authLoading || currentUser) {
      timer = setTimeout(() => {
        setShowTroubleshoot(true);
      }, 4000);
    } else {
      setShowTroubleshoot(false);
    }
    return () => clearTimeout(timer);
  }, [authLoading, currentUser]);

  const handleForceLogout = async () => {
    try {
      setLoading(true);
      const { auth } = await import('@/lib/firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (err) {
      console.error("Error resetting auth:", err);
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <MissingFirebaseConfig />
      </div>
    );
  }
  
  // Mientras se verifica el estado de autenticación o si ya hay un usuario (y se está redirigiendo), muestra el loader.
  if (authLoading || (!authLoading && currentUser)) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">Verificando sesión...</p>
              <p className="text-sm text-muted-foreground">Conectando a Firebase ({process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID})</p>
            </div>
            
            {showTroubleshoot && (
              <div className="mt-4 p-5 bg-card border border-border rounded-xl shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <p className="text-sm font-bold text-amber-500 flex items-center justify-center gap-1">
                  ⚠️ ¿Se ha quedado pensando?
                </p>
                <div className="text-xs text-muted-foreground text-left space-y-2">
                  <p>Si la pantalla de carga no avanza, puede deberse a:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Un <strong>bloqueador de anuncios (AdBlocker)</strong> o <strong>Brave Shield</strong> que esté bloqueando la conexión a Firebase. Intenta desactivarlo temporalmente.</li>
                    <li>Un error de permisos o sesión expirada. Abre la consola del navegador presionando <strong>F12</strong> para ver los detalles.</li>
                  </ul>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleForceLogout} 
                  className="w-full text-xs font-semibold border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  Forzar reinicio y limpiar sesión
                </Button>
              </div>
            )}
          </div>
        </div>
      );
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "Inicio de sesión exitoso" });
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Firebase Auth Error:", err); // Log the full error
      
      let friendlyMessage = "Ocurrió un error inesperado. Inténtelo de nuevo.";

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        friendlyMessage = `El inicio de sesión falló. Por favor, verifica lo siguiente:
- Que el **correo electrónico y la contraseña** estén escritos correctamente.
- Que las claves en tu archivo **.env.local** sean las correctas para este proyecto de Firebase.
- En la Consola de Firebase, ve a **Authentication > Sign-in method** y asegúrate que el proveedor "Correo electrónico/Contraseña" esté **habilitado**.`;
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/operation-not-allowed') {
         friendlyMessage = 'El inicio de sesión por correo y contraseña no está habilitado. Por favor, actívelo en la consola de Firebase.';
      } else {
        friendlyMessage = `Error: ${err.message}`;
      }
      
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl">
        <CardHeader className="text-center p-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Agua Diamante Logo" width={64} height={64} />
          </div>
          <CardTitle className="text-3xl font-headline">
            Agua Diamante ERP
          </CardTitle>
          <CardDescription>Inicia sesión para acceder al panel</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 px-8">
          {error && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error de Inicio de Sesión</AlertTitle>
              <AlertDescription>
                <div className="whitespace-pre-line">
                  {error.split('\n').map((line, index) => {
                    if (line.startsWith('- ')) {
                      return (
                        <div key={index} className="flex">
                          <span className="mr-2 text-sm">&#8226;</span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                            }}
                          />
                        </div>
                      );
                    }
                    return <p key={index}>{line}</p>;
                  })}
                </div>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

           <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                  O inicia sesión con
                  </span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" disabled>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Huella
              </Button>
              <Button variant="outline" disabled>
                  <ScanFace className="mr-2 h-4 w-4" />
                  Rostro
              </Button>
          </div>
        </CardContent>

        <CardFooter className="p-8 pt-4 flex-col items-stretch gap-4">
          {isFirebaseConfigured && (
            <div className="text-center text-xs text-muted-foreground p-2 border border-dashed rounded-md">
              <p>Conectando al proyecto de Firebase:</p>
              <p className="font-mono font-bold text-foreground">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
