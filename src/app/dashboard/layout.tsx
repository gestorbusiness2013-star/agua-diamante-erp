
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
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Panel General', icon: Gauge, permission: 'panel' as const },
  { href: '/dashboard/inventory', label: 'Inventario', icon: Archive, permission: 'inventory' as const },
  { href: '/dashboard/suppliers', label: 'Proveedores', icon: Building, permission: 'suppliers' as const },
  { href: '/dashboard/compras', label: 'Compras', icon: ShoppingCart, permission: 'purchases' as const },
  { href: '/dashboard/customers', label: 'Clientes', icon: Briefcase, permission: 'customers' as const },
  { href: '/dashboard/routes', label: 'Rutas de Venta', icon: Route, permission: 'routes' as const },
  { href: '/dashboard/vendedores', label: 'Vendedores', icon: MapPinned, permission: 'vendedores' as const },
  { href: '/dashboard/warehouses', label: 'Almacenes', icon: Warehouse, permission: 'warehouses' as const },
  { href: '/dashboard/sales', label: 'Ventas', icon: ShoppingBag, permission: 'sales' as const },
  { href: '/dashboard/production', label: 'Producción', icon: Factory, permission: 'production' as const },
  { href: '/dashboard/movements', label: 'Movimientos', icon: ArrowRightLeft, permission: 'movements' as const },
  { href: '/dashboard/market-analysis', label: 'Análisis de Mercado', icon: AreaChart, permission: 'market' as const },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users, permission: 'users' as const },
  { href: '/dashboard/gastos', label: 'Gastos y Nómina', icon: Landmark, permission: 'expenses' as const },
];

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

  const isRouteActive = (route: string) => {
    if (route === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(route);
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
          <SidebarMenu className="gap-1.5 px-1">
            {navItems.map((item) => {
              if (!hasPermission(item.permission)) return null;
              const active = isRouteActive(item.href);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.label}
                    isActive={active}
                    className={cn(
                      "transition-all duration-200 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active 
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-950/40 hover:bg-blue-500 hover:text-white ring-1 ring-white/20" 
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <Icon className={cn("h-4 w-4 shrink-0 transition-all", active ? "text-white scale-110" : "text-white/75")} />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <span className="ml-auto flex h-2 w-2 relative shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
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
