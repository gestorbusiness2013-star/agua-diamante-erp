
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { ErrorBoundary } from '@/components/error-boundary';
import { Gauge, Archive, Factory, Users, Warehouse, Landmark, ArrowRightLeft, Loader2, AlertCircle, Building, ShoppingBag, Briefcase, Route, AreaChart, ShoppingCart, MapPinned } from 'lucide-react';
import Link from 'next/link';
import { useInventory } from '@/context/inventory-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import { VoiceAssistant } from '@/components/voice-assistant';
import { useToast } from '@/hooks/use-toast';
import { type UserPermissions, getDefaultPermissions } from '@/lib/users-data';

const routePermissionMap: Record<string, keyof UserPermissions> = {
  '/dashboard': 'panel',
  '/dashboard/inventory': 'inventory',
  '/dashboard/suppliers': 'suppliers',
  '/dashboard/compras': 'purchases',
  '/dashboard/customers': 'customers',
  '/dashboard/routes': 'routes',
  '/dashboard/vendedores': 'vendedores',
  '/dashboard/warehouses': 'warehouses',
  '/dashboard/sales': 'sales',
  '/dashboard/production': 'production',
  '/dashboard/movements': 'movements',
  '/dashboard/market-analysis': 'market',
  '/dashboard/users': 'users',
  '/dashboard/gastos': 'expenses',
};

function DashboardLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const { loading: inventoryLoading, errorMessage } = useInventory();
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const hasPermission = (key: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (!currentUser.permissions) {
      return getDefaultPermissions(currentUser.role)[key];
    }
    return currentUser.permissions[key] ?? false;
  };

  // This effect's only job is to redirect if authentication is resolved and there's no user.
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  // Guard active route based on user permissions.
  useEffect(() => {
    if (!authLoading && currentUser) {
      const requiredPermission = routePermissionMap[pathname];
      if (requiredPermission && pathname !== '/dashboard') {
        const hasAccess = hasPermission(requiredPermission);
        if (!hasAccess) {
          toast({
            variant: "destructive",
            title: "Acceso Denegado",
            description: "No tienes permisos para acceder a esta sección.",
          });
          router.push('/dashboard');
        }
      }
    }
  }, [pathname, currentUser, authLoading, router, toast]);

  const isLoading = authLoading || inventoryLoading;

  // This is the gatekeeper. It shows a loader while any data is loading, or if authentication
  // is resolved but no user is found (while the useEffect redirects). This prevents any content flash.
  if (isLoading || !currentUser) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando sesión...</p>
          </div>
        </div>
      );
  }

  // After all loading is complete, handle potential inventory-specific errors.
  if (errorMessage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
          <Alert variant="destructive" className="max-w-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de Conexión a la Base de Datos</AlertTitle>
              <AlertDescription>
                  {errorMessage}
              </AlertDescription>
          </Alert>
      </div>
    );
  }
  
  // If we reach this point, all loading is complete and currentUser is valid.
  // We can now safely render the full dashboard layout.
  return (
    <SidebarProvider>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Agua Diamante Logo" width={32} height={32} />
            <span className="text-xl font-headline font-bold">Agua Diamante</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {hasPermission('panel') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Panel General">
                  <Link href="/dashboard"><Gauge /><span>Panel General</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('inventory') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Inventario">
                  <Link href="/dashboard/inventory"><Archive /><span>Inventario</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('suppliers') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Proveedores">
                  <Link href="/dashboard/suppliers"><Building /><span>Proveedores</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('purchases') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Compras">
                  <Link href="/dashboard/compras"><ShoppingCart /><span>Compras</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('customers') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Clientes">
                  <Link href="/dashboard/customers"><Briefcase /><span>Clientes</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('routes') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Rutas de Venta">
                  <Link href="/dashboard/routes"><Route /><span>Rutas de Venta</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('vendedores') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Vendedores">
                  <Link href="/dashboard/vendedores"><MapPinned /><span>Vendedores</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('warehouses') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Almacenes">
                  <Link href="/dashboard/warehouses"><Warehouse /><span>Almacenes</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('sales') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ventas">
                  <Link href="/dashboard/sales"><ShoppingBag /><span>Ventas</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('production') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Producción">
                  <Link href="/dashboard/production"><Factory /><span>Producción</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('movements') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Movimientos">
                  <Link href="/dashboard/movements"><ArrowRightLeft /><span>Movimientos</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('market') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Análisis de Mercado">
                  <Link href="/dashboard/market-analysis"><AreaChart /><span>Análisis de Mercado</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('users') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Usuarios">
                  <Link href="/dashboard/users"><Users /><span>Usuarios</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasPermission('expenses') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Gastos">
                  <Link href="/dashboard/gastos"><Landmark /><span>Gastos y Nómina</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1" />
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-[hsl(var(--background))]">
          {children}
        </main>
        <VoiceAssistant />
      </SidebarInset>
    </SidebarProvider>
  )
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <ErrorBoundary fallbackMessage="Error en el Dashboard">
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </ErrorBoundary>
  );
}
