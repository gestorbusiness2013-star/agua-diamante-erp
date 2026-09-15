'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { type User, initialUsers, getDefaultPermissions } from '@/lib/users-data';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        console.log("[AuthContext] Subscribing to onAuthStateChanged...");
        
        // Timeout de seguridad: Si Firebase Auth tarda más de 2.5s en responder, mostramos el formulario de login.
        const safetyTimer = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn("[AuthContext] Auth check timeout reached. Unblocking loading screen.");
                    return false;
                }
                return prev;
            });
        }, 2500);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            clearTimeout(safetyTimer);
            console.log("[AuthContext] onAuthStateChanged fired. User:", firebaseUser ? `${firebaseUser.email} (${firebaseUser.uid})` : "null");
            setLoading(true);
            if (firebaseUser) {
                try {
                    console.log("[AuthContext] Fetching user profile from Firestore...");
                    const userDocRef = doc(db, "users", firebaseUser.uid); 
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        console.log("[AuthContext] User profile found in Firestore:", userDoc.data());
                        setCurrentUser(userDoc.data() as User);
                    } else {
                        console.log("[AuthContext] User profile not found in Firestore. Creating one...");
                        const usersRef = collection(db, "users");
                        const allUsersSnapshot = await getDocs(usersRef);
                        const isFirstUserInDb = allUsersSnapshot.empty;
                        
                        // Buscamos si el email está en la lista de usuarios predefinidos
                        const initialUser = initialUsers.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
                        
                        const role = initialUser?.role || (isFirstUserInDb ? "Admin" : "Operador");
                        const newUserProfile: User = {
                            id: firebaseUser.uid,
                            email: firebaseUser.email!,
                            name: initialUser?.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0] || "Nuevo Usuario",
                            role,
                            commissionRate: initialUser?.commissionRate || (initialUser?.role === 'Vendedor' ? 5 : undefined),
                            permissions: getDefaultPermissions(role),
                        };

                        await setDoc(userDocRef, newUserProfile);
                        console.log("[AuthContext] Created new user profile in Firestore:", newUserProfile);
                        setCurrentUser(newUserProfile);
                        toast({ title: "¡Bienvenido/a!", description: "Se ha configurado tu perfil de usuario automáticamente." });
                    }
                } catch (error: any) {
                    console.error("[AuthContext] Error loading user profile:", error);
                    toast({ variant: "destructive", title: "Error de Perfil", description: "No se pudo cargar el perfil de usuario." });
                    await signOut(auth);
                    setCurrentUser(null);
                }
            } else {
                console.log("[AuthContext] No authenticated user found.");
                setCurrentUser(null);
            }
            console.log("[AuthContext] Auth loading set to false.");
            setLoading(false);
        });
        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, [toast]);

    const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password).then(() => {});
    const logout = () => signOut(auth).then(() => router.push('/login'));

    return <AuthContext.Provider value={{ currentUser, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
