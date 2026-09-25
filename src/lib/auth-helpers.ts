import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, signInWithEmailAndPassword, signOut, inMemoryPersistence } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase';

/**
 * Verifica las credenciales de un administrador utilizando una instancia secundaria
 * aislada de Firebase Auth con persistencia en memoria, para no interferir ni cerrar la sesión actual.
 * También valida claves maestras administrativas de respaldo.
 */
export async function verifyAdminCredentials(adminEmail: string, adminKey: string): Promise<boolean> {
    const trimmedKey = adminKey.trim();
    if (!trimmedKey) return false;

    // 1. Claves maestras administrativas del sistema
    const masterKeys = ['ADMIN123', 'admin123', 'Diamante2024', 'DIAMANTE2024'];
    if (masterKeys.includes(trimmedKey)) {
        return true;
    }

    // 2. Si se proporciona email de administrador, validar directamente con Firebase Auth
    if (!adminEmail) return false;

    let tempApp: any = null;
    let tempAuth: any = null;
    try {
        const tempAppName = `verify-admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        tempApp = initializeApp(firebaseConfig, tempAppName);
        tempAuth = initializeAuth(tempApp, {
            persistence: inMemoryPersistence,
        });

        await signInWithEmailAndPassword(tempAuth, adminEmail, trimmedKey);
        try { await signOut(tempAuth); } catch (e) { /* ignore */ }
        try { await deleteApp(tempApp); } catch (e) { /* ignore */ }
        return true;
    } catch (err) {
        if (tempAuth) {
            try { await signOut(tempAuth); } catch (e) { /* ignore */ }
        }
        if (tempApp) {
            try { await deleteApp(tempApp); } catch (e) { /* ignore */ }
        }
        return false;
    }
}
