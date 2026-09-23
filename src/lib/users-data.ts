import { z } from 'zod';
import type { Timestamp } from 'firebase/firestore';

type LocationPoint = {
    lat: number;
    lng: number;
    timestamp: Timestamp;
};

export type UserPermissions = {
    panel: boolean;
    inventory: boolean;
    suppliers: boolean;
    purchases: boolean;
    customers: boolean;
    routes: boolean;
    vendedores: boolean;
    warehouses: boolean;
    sales: boolean;
    production: boolean;
    movements: boolean;
    market: boolean;
    users: boolean;
    expenses: boolean;
};

export const permissionLabels: Record<keyof UserPermissions, string> = {
    panel: "Panel General (Métricas)",
    inventory: "Inventario de Materias Primas",
    suppliers: "Gestión de Proveedores",
    purchases: "Módulo de Compras",
    customers: "Gestión de Clientes",
    routes: "Rutas de Venta",
    vendedores: "Monitoreo de Vendedores",
    warehouses: "Gestión de Almacenes",
    sales: "Gestión de Ventas",
    production: "Seguimiento de Producción",
    movements: "Movimientos de Inventario",
    market: "Análisis de Mercado",
    users: "Gestión de Usuarios y Roles (Acceso)",
    expenses: "Gastos y Nómina",
};

export const getDefaultPermissions = (role: "Admin" | "Administración" | "Operador" | "Supervisor" | "Gerente de Planta" | "Vendedor" | string): UserPermissions => {
    const isAdmin = role === 'Admin' || role === 'Administración';
    return {
        panel: true,
        inventory: true,
        suppliers: true,
        purchases: true,
        customers: isAdmin || role === 'Vendedor',
        routes: isAdmin || role === 'Vendedor',
        vendedores: isAdmin || role === 'Vendedor',
        warehouses: true,
        sales: true,
        production: true,
        movements: role !== 'Gerente de Planta' && role !== 'Vendedor',
        market: isAdmin,
        users: isAdmin,
        expenses: true,
    };
};

export type User = {
    id: string; // Coincide con el UID de Firebase Auth
    name: string;
    email: string;
    role: "Admin" | "Administración" | "Operador" | "Supervisor" | "Gerente de Planta" | "Vendedor";
    commissionRate?: number; // Porcentaje de comisión, ej: 5 para 5%
    lastLocation?: { lat: number, lng: number };
    lastLocationTimestamp?: Timestamp;
    locationHistory?: LocationPoint[];
    permissions?: UserPermissions;
};

export const userFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  role: z.enum(['Admin', 'Administración', 'Operador', 'Supervisor', 'Gerente de Planta', 'Vendedor']),
  commissionRate: z.coerce.number().min(0, 'La comisión no puede ser negativa.').optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  isEditMode: z.boolean(),
  permissions: z.object({
    panel: z.boolean(),
    inventory: z.boolean(),
    suppliers: z.boolean(),
    purchases: z.boolean(),
    customers: z.boolean(),
    routes: z.boolean(),
    vendedores: z.boolean(),
    warehouses: z.boolean(),
    sales: z.boolean(),
    production: z.boolean(),
    movements: z.boolean(),
    market: z.boolean(),
    users: z.boolean(),
    expenses: z.boolean(),
  }).optional(),
}).superRefine((data, ctx) => {
    if (!data.isEditMode) {
        if (!data.password || data.password.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La contraseña es requerida y debe tener al menos 6 caracteres.",
                path: ['password']
            });
        }
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Las contraseñas no coinciden.",
                path: ['confirmPassword']
            });
        }
    }
    if (data.role === 'Vendedor' && (data.commissionRate === undefined || data.commissionRate === null)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La tasa de comisión es requerida para vendedores.",
            path: ['commissionRate']
        });
    }
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const initialUsers: Omit<User, 'id'>[] = [
    { name: "Ana García", email: "ana.garcia@example.com", role: "Admin" },
    { name: "Carlos Perez", email: "carlos.perez@example.com", role: "Operador" },
    { name: "Luisa Fernandez", email: "luisa.fernandez@example.com", role: "Operador" },
    { name: "Jorge Martinez", email: "jorge.martinez@example.com", role: "Supervisor" },
    { name: "Usuario Principal", email: "GESTORBUSINESS2013@gmail.com", role: "Admin" },
    { name: "Robert Davi", email: "robertdavi@hotmail.com", role: "Admin" },
    { name: "Sofia Vivas", email: "vendedor@example.com", role: "Vendedor", commissionRate: 5 },
];
