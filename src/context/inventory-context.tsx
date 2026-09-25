
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { InventoryItem, FinishedProduct, Recipe, Recipes, Warehouse, StockRequest } from '@/lib/inventory-data';
import type { FabricationFormValues } from '@/components/fabrication-form';
import type { TransferFormValues } from '@/components/transfer-form';
import type { RecipeFormValues } from '@/components/recipe-form';
import type { WarehouseFormValues } from '@/components/warehouse-form';
import type { SaleFormValues } from '@/components/sale-form';
import type { StockRequestFormValues } from '@/components/stock-request-form';
import type { PurchaseOrderFormValues } from '@/components/purchase-order-form';
import type { RouteFormValues } from '@/components/route-form';
import type { Expense } from '@/lib/expenses-data';
import type { Employee } from '@/lib/payroll-data';
import type { Movement } from '@/lib/movements-data';
import type { Sale } from '@/lib/sales-data';
import { getSaleItems } from '@/lib/sales-data';
import { type User, type UserFormValues, getDefaultPermissions } from '@/lib/users-data';
import type { ProductionLine } from '@/lib/data';
import type { Supplier } from '@/lib/suppliers-data';
import type { Route } from '@/lib/routes-data';
import type { PurchaseOrder } from '@/lib/purchases-data';
import { db, firebaseConfig } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch, Timestamp, runTransaction, query, getDoc, onSnapshot, addDoc, where, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, createUserWithEmailAndPassword, signOut, inMemoryPersistence } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { ExpenseFormValues } from '@/components/expense-form';
import type { EmployeeFormValues } from '@/components/employee-form';
import type { SupplierFormValues } from '@/components/supplier-form';
import { type Customer, type MarketProduct } from '@/lib/customers-data';
import { type CustomerFormValues } from '@/components/customer-form';
import { initialProductionLines } from '@/lib/data';

interface InventoryContextType {
    loading: boolean;
    errorMessage: string | null;
    inventoryItems: InventoryItem[];
    addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
    updateInventoryItem: (item: InventoryItem) => Promise<void>;
    deleteInventoryItem: (itemId: string) => Promise<void>;
    updateMultipleInventoryItems: (itemsToUpdate: InventoryItem[]) => Promise<void>;
    
    finishedProducts: FinishedProduct[];
    fabricateProduct: (values: FabricationFormValues, currentUser: { name: string }) => Promise<void>;
    
    recipes: Recipes;
    saveRecipeAndProduct: (values: RecipeFormValues, isEditMode: boolean, existingProduct: FinishedProduct | null) => Promise<void>;
    deleteRecipeAndProduct: (product: FinishedProduct) => Promise<void>;

    warehouses: Warehouse[];
    transferProduct: (values: TransferFormValues, currentUser: { name: string }) => Promise<string | false>;
    receiveTransfer: (transferId: string, currentUser: { name: string }) => Promise<boolean>;
    cancelTransfer: (transferId: string, currentUser: { name: string }) => Promise<boolean>;
    saveWarehouse: (values: WarehouseFormValues, isEditMode: boolean, existingWarehouse: Warehouse | null) => Promise<void>;
    deleteWarehouse: (warehouse: Warehouse) => Promise<void>;

    movements: Movement[];
    
    sales: Sale[];
    createSaleOrder: (values: SaleFormValues, currentUser: User) => Promise<void>;
    dispatchSaleOrder: (sale: Sale, currentUser: { name: string }) => Promise<Sale | null>;
    cancelSaleOrder: (sale: Sale, currentUser: { name: string }) => Promise<void>;
    collectConsignmentPayment: (sale: Sale, currentUser: { name: string }) => Promise<void>;
    updateSale: (sale: Sale) => Promise<void>;
    
    customers: Customer[];
    addCustomer: (customerData: Partial<Customer>) => Promise<void>;
    updateCustomer: (customer: Customer) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;

    routes: Route[];
    saveRoute: (values: RouteFormValues, isEditMode: boolean, existingRoute: Route | null) => Promise<void>;
    deleteRoute: (routeId: string) => Promise<void>;
    
    marketProducts: MarketProduct[];
    saveMarketProduct: (productData: Omit<MarketProduct, 'id'>, productId?: string) => Promise<void>;
    deleteMarketProduct: (productId: string) => Promise<void>;

    expenses: Expense[];
    addExpense: (expenseData: ExpenseFormValues) => Promise<void>;
    updateExpense: (expense: Expense) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;

    employees: Employee[];
    addEmployee: (employeeData: EmployeeFormValues) => Promise<void>;
    updateEmployee: (employee: Employee) => Promise<void>;
    deleteEmployee: (employeeId: string) => Promise<void>;

    users: User[];
    createUser: (userData: UserFormValues) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    updateUserLocation: (userId: string, location: { lat: number, lng: number }) => Promise<void>;
    
    suppliers: Supplier[];
    addSupplier: (supplierData: SupplierFormValues) => Promise<void>;
    updateSupplier: (supplier: Supplier) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;

    purchaseOrders: PurchaseOrder[];
    savePurchaseOrder: (values: PurchaseOrderFormValues, isEditMode: boolean, existingOrder: PurchaseOrder | null) => Promise<void>;
    receivePurchaseOrder: (order: PurchaseOrder) => Promise<void>;
    cancelPurchaseOrder: (order: PurchaseOrder) => Promise<void>;

    paidPayrolls: string[];
    processPayroll: (payrollId: string, newExpenseData: Omit<Expense, 'id'>) => Promise<void>;
    
    productionLines: ProductionLine[];
    updateProductionLines: (lines: ProductionLine[]) => Promise<void>;
    
    stockRequests: StockRequest[];
    createStockRequest: (values: StockRequestFormValues, currentUser: User) => Promise<void>;
    updateStockRequestStatus: (requestId: string, status: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Completado') => Promise<void>;
    deleteStockRequest: (requestId: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const convertTimestampsToDates = (data: any) => {
    if (!data) return data;
    const newData = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate();
        } else if (typeof newData[key] === 'object' && newData[key] !== null && !Array.isArray(newData[key])) {
            newData[key] = convertTimestampsToDates(newData[key]);
        } else if (Array.isArray(newData[key])) {
            newData[key] = newData[key].map(item => convertTimestampsToDates(item));
        }
    }
    return newData;
};

export function InventoryProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
    const [recipes, setRecipes] = useState<Recipes>({});
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [paidPayrolls, setPaidPayrolls] = useState<string[]>([]);
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    
    useEffect(() => {
        if (!currentUser) return;
        const seedInitialData = async () => {
            try {
                const productionLinesRef = collection(db, 'productionLines');
                const snapshot = await getDocs(productionLinesRef);
                if (snapshot.empty) {
                    const batch = writeBatch(db);
                    initialProductionLines.forEach(line => {
                        const docRef = doc(productionLinesRef, String(line.id));
                        batch.set(docRef, line);
                    });
                    await batch.commit();
                }
            } catch (error) {
                console.error("Error seeding initial production lines:", error);
            }
        };
        seedInitialData();
    }, [currentUser]);

    useEffect(() => {
        // Reset error message on auth change
        setErrorMessage(null);

        // Only listen to data if a user is logged in
        if (!currentUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const collectionsToListen: Record<string, any> = {
            inventoryItems: { setter: setInventoryItems, process: (doc: any) => ({ ...doc.data(), id: doc.id } as InventoryItem), sort: (a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name) },
            finishedProducts: { setter: setFinishedProducts, process: (doc: any) => ({...doc.data(), id: doc.id} as FinishedProduct) },
            warehouses: { setter: setWarehouses, process: (doc: any) => ({...doc.data(), id: doc.id} as Warehouse) },
            movements: { setter: setMovements, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as Movement },
            sales: { setter: setSales, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as Sale },
            expenses: { setter: setExpenses, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as Expense, sort: (a: Expense, b: Expense) => b.date.getTime() - a.date.getTime() },
            employees: { setter: setEmployees, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as Employee },
            paidPayrolls: { setter: setPaidPayrolls, process: (doc: any) => doc.id, sort: (a: string, b: string) => b.localeCompare(a) },
            users: { setter: setUsers, process: (doc: any) => {
                const data = doc.data();
                if (!data) return null;
                const processed = convertTimestampsToDates({...data, id: doc.id});
                // Ensure required fields have safe defaults to prevent render crashes
                return {
                    ...processed,
                    id: processed.id || doc.id,
                    name: processed.name || 'Usuario',
                    email: processed.email || '',
                    role: processed.role || 'Operador',
                } as User;
            }, sort: undefined, filter: (item: any) => item !== null },
            productionLines: { setter: setProductionLines, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as ProductionLine },
            suppliers: { setter: setSuppliers, process: (doc: any) => ({...doc.data(), id: doc.id} as Supplier) },
            customers: { setter: setCustomers, process: (doc: any) => ({ ...doc.data(), id: doc.id } as Customer) },
            routes: { setter: setRoutes, process: (doc: any) => ({...doc.data(), id: doc.id} as Route) },
            marketProducts: { setter: setMarketProducts, process: (doc: any) => ({...doc.data(), id: doc.id} as MarketProduct), sort: (a: MarketProduct, b: MarketProduct) => a.name.localeCompare(b.name) },
            stockRequests: { setter: setStockRequests, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as StockRequest, sort: (a: StockRequest, b: StockRequest) => b.date.getTime() - a.date.getTime() },
            purchaseOrders: { setter: setPurchaseOrders, process: (doc: any) => convertTimestampsToDates({...doc.data(), id: doc.id}) as PurchaseOrder, sort: (a: PurchaseOrder, b: PurchaseOrder) => b.date.getTime() - a.date.getTime() },
            recipes: { 
                setter: (data: any) => setRecipes(data), 
                process: (snapshot: any) => snapshot.docs.reduce((acc: any, doc: any) => {
                    acc[doc.id] = (doc.data() as { ingredients: Recipe }).ingredients;
                    return acc;
                }, {} as Recipes)
            },
        };

        const unsubscribes = Object.entries(collectionsToListen).map(([name, config]) => {
            const collectionRef = collection(db, name);
            return onSnapshot(collectionRef, 
                (snapshot) => {
                    try {
                        if (name === 'recipes') {
                             config.setter(config.process(snapshot));
                        } else {
                            let data = snapshot.docs.map(config.process);
                            if (config.filter) data = data.filter(config.filter);
                            if (config.sort) data = data.sort(config.sort as any);
                            config.setter(data as any);
                        }
                    } catch (processingError) {
                        console.error(`Error processing ${name} data:`, processingError);
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error(`Error listening to ${name}:`, error);
                    // Only show critical error if it's not a temporary permissions glitch during user creation
                    if (error.code !== 'permission-denied') {
                        setErrorMessage(`Fallo al conectar con la base de datos para ${name}.`);
                    }
                    setLoading(false);
                }
            );
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [currentUser]);

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        try {
            await addDoc(collection(db, 'inventoryItems'), itemData);
            toast({ title: "Material Añadido" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al añadir material' });
        }
    };

    const updateInventoryItem = async (itemToUpdate: InventoryItem) => {
        try {
            const { id, ...dataToUpdate } = itemToUpdate;
            await updateDoc(doc(db, 'inventoryItems', String(id)), dataToUpdate);
            toast({ title: "Material Actualizado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al actualizar' });
        }
    };
    
    const updateMultipleInventoryItems = async (itemsToUpdate: InventoryItem[]) => {
         try {
            const batch = writeBatch(db);
            itemsToUpdate.forEach(item => {
                const { id, ...dataToUpdate } = item;
                batch.update(doc(db, 'inventoryItems', String(id)), dataToUpdate);
            });
            await batch.commit();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al actualizar materiales' });
        }
    };

    const deleteInventoryItem = async (itemId: string) => {
        try {
            await deleteDoc(doc(db, 'inventoryItems', itemId));
            toast({ title: "Material Eliminado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al eliminar' });
        }
    };

    const fabricateProduct = async (values: FabricationFormValues, currentUser: { name: string }) => {
        const recipe = recipes[values.productName];
        if (!recipe) {
            toast({ variant: "destructive", title: "Error de Receta", description: `No se encontró una receta para ${values.productName}.` });
            return;
        }
    
        try {
            const materialNamesInRecipe = Object.keys(recipe);
            const materialsQuery = query(collection(db, 'inventoryItems'), where('name', 'in', materialNamesInRecipe));
            const querySnapshot = await getDocs(materialsQuery);
    
            const foundMaterials = new Map<string, { doc: InventoryItem, ref: any }>();
            querySnapshot.forEach(doc => {
                const data = doc.data() as InventoryItem;
                foundMaterials.set(data.name, { doc: { ...data, id: doc.id }, ref: doc.ref });
            });
    
            for (const materialName of materialNamesInRecipe) {
                if (!foundMaterials.has(materialName)) throw new Error(`Material '${materialName}' no encontrado.`);
            }
    
            await runTransaction(db, async (transaction) => {
                const materialsToUpdate: { ref: any, data: Partial<InventoryItem> }[] = [];
    
                for (const materialName of materialNamesInRecipe) {
                    const materialInfo = foundMaterials.get(materialName)!;
                    const materialDoc = await transaction.get(materialInfo.ref);
                    if (!materialDoc.exists()) throw new Error(`Material '${materialName}' no encontrado.`);
    
                    const currentItemData = materialDoc.data() as InventoryItem;
                    const requiredTotal = recipe[materialName] * values.quantity;
    
                    if (currentItemData.quantity < requiredTotal) throw new Error(`Insuficiente ${materialName}.`);
    
                    const newQty = currentItemData.quantity - requiredTotal;
                    materialsToUpdate.push({
                        ref: materialDoc.ref,
                        data: { quantity: newQty, status: newQty <= currentItemData.lowStockThreshold ? 'Stock Bajo' : 'En Stock' }
                    });
                }
    
                const finishedProductsQuery = query(collection(db, 'finishedProducts'), where("name", "==", values.productName), where("zone", "==", values.zone));
                const finishedProductSnapshot = await getDocs(finishedProductsQuery);
    
                const newMovementData = {
                    date: new Date(),
                    productName: values.productName,
                    quantity: values.quantity,
                    type: 'Fabricación',
                    user: currentUser.name,
                    details: `Fabricado en ${values.zone}`,
                    status: 'Completado'
                };
    
                materialsToUpdate.forEach(mat => transaction.update(mat.ref, mat.data));
    
                if (!finishedProductSnapshot.empty) {
                    const productDocRef = finishedProductSnapshot.docs[0].ref;
                    transaction.update(productDocRef, { quantity: finishedProductSnapshot.docs[0].data().quantity + values.quantity });
                } else {
                    transaction.set(doc(collection(db, 'finishedProducts')), { name: values.productName, quantity: values.quantity, zone: values.zone });
                }
    
                transaction.set(doc(collection(db, 'movements')), newMovementData);
            });
    
            toast({ title: "Fabricación Exitosa" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error de Fabricación', description: error.message });
        }
    };
    
    const saveRecipeAndProduct = async (values: RecipeFormValues, isEditMode: boolean, existingProduct: FinishedProduct | null) => {
        const newRecipe: Recipe = values.ingredients.reduce((acc, ing) => {
            acc[ing.materialName] = ing.quantity;
            return acc;
        }, {} as Recipe);

        try {
            const batch = writeBatch(db);
            if (isEditMode && existingProduct) {
                if (existingProduct.name !== values.productName) batch.delete(doc(db, 'recipes', existingProduct.name));
                batch.set(doc(db, 'recipes', values.productName), { ingredients: newRecipe });
                const { id, ...rest } = { ...existingProduct, name: values.productName, zone: values.zone, quantity: values.quantity };
                batch.update(doc(db, 'finishedProducts', id), rest);
            } else {
                batch.set(doc(db, 'recipes', values.productName), { ingredients: newRecipe });
                batch.set(doc(collection(db, 'finishedProducts')), { name: values.productName, quantity: values.quantity, zone: values.zone });
            }
            await batch.commit();
            toast({ title: "Producto Guardado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al guardar producto' });
        }
    };
    
    const deleteRecipeAndProduct = async (productToDelete: FinishedProduct) => {
        try {
            await runTransaction(db, async (transaction) => {
                transaction.delete(doc(db, 'recipes', productToDelete.name));
                transaction.delete(doc(db, 'finishedProducts', productToDelete.id));
            });
            toast({ title: "Producto Eliminado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al eliminar producto' });
        }
    };

    const transferProduct = async (values: TransferFormValues, currentUser: { name: string }) => {
        try {
            const transferId = await runTransaction(db, async (transaction) => {
                const destWarehouseRef = doc(db, 'warehouses', String(values.warehouseId));
                const destWarehouseDoc = await transaction.get(destWarehouseRef);
                if (!destWarehouseDoc.exists()) throw new Error("Almacén de destino no encontrado.");
                const destWarehouseData = destWarehouseDoc.data() as Warehouse;
                let detailsText = '';

                if (values.sourceId === 'factory') {
                    const productInFactory = finishedProducts.find(p => p.name === values.productName);
                    if (!productInFactory) throw new Error(`Producto ${values.productName} no encontrado en fábrica.`);
                    const factoryProductRef = doc(db, 'finishedProducts', productInFactory.id);
                    const factoryProductDoc = await transaction.get(factoryProductRef);
                    if (!factoryProductDoc.exists()) throw new Error("Producto no encontrado en fábrica.");
                    const factoryProductData = factoryProductDoc.data() as FinishedProduct;

                    if (factoryProductData.quantity < values.quantity) throw new Error("Stock insuficiente en fábrica.");
                    transaction.update(factoryProductRef, { quantity: factoryProductData.quantity - values.quantity });
                    detailsText = `De Fábrica a ${destWarehouseData.name}`;
                } else {
                    const sourceWarehouseRef = doc(db, 'warehouses', values.sourceId);
                    const sourceWarehouseDoc = await transaction.get(sourceWarehouseRef);
                    if (!sourceWarehouseDoc.exists()) throw new Error("Almacén de origen no encontrado.");
                    const sourceWarehouseData = sourceWarehouseDoc.data() as Warehouse;
                    
                    const sourceStock = [...sourceWarehouseData.stock];
                    const sourceIndex = sourceStock.findIndex(s => s.productName === values.productName);
                    if (sourceIndex === -1 || sourceStock[sourceIndex].quantity < values.quantity) {
                        throw new Error("Stock insuficiente en almacén de origen.");
                    }
                    sourceStock[sourceIndex].quantity -= values.quantity;
                    const cleanStock = sourceStock.filter(s => s.quantity > 0);
                    transaction.update(sourceWarehouseRef, { stock: cleanStock });
                    detailsText = `De ${sourceWarehouseData.name} a ${destWarehouseData.name}`;
                }

                const movementRef = doc(collection(db, 'movements'));
                transaction.set(movementRef, {
                    date: new Date(),
                    productName: values.productName,
                    quantity: values.quantity,
                    type: 'Transferencia',
                    user: currentUser.name,
                    details: detailsText,
                    status: 'Pendiente',
                    sourceId: values.sourceId,
                    destWarehouseId: values.warehouseId,
                    driverName: values.driverName || '',
                    vehiclePlate: values.vehiclePlate || ''
                });

                return movementRef.id;
            });
            toast({ title: "Transferencia En Tránsito", description: "Se ha generado la nota con QR para la recepción." });
            return transferId;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            return false;
        }
    };
    
    const receiveTransfer = async (transferId: string, currentUser: { name: string }) => {
        try {
            await runTransaction(db, async (transaction) => {
                const movementRef = doc(db, 'movements', transferId);
                const movementDoc = await transaction.get(movementRef);
                if (!movementDoc.exists()) throw new Error("Transferencia no encontrada.");
                
                const movementData = movementDoc.data();
                if (movementData.status !== 'Pendiente') throw new Error("Esta transferencia ya fue procesada.");

                const destWarehouseRef = doc(db, 'warehouses', movementData.destWarehouseId);
                const destWarehouseDoc = await transaction.get(destWarehouseRef);
                if (!destWarehouseDoc.exists()) throw new Error("Almacén de destino no encontrado.");
                
                const destWarehouseData = destWarehouseDoc.data() as Warehouse;
                const newDestStock = [...destWarehouseData.stock];
                const destStockIndex = newDestStock.findIndex(s => s.productName === movementData.productName);
                
                if (destStockIndex > -1) newDestStock[destStockIndex].quantity += movementData.quantity;
                else newDestStock.push({ productName: movementData.productName, quantity: movementData.quantity });

                transaction.update(destWarehouseRef, { stock: newDestStock });
                transaction.update(movementRef, { status: 'Completado', receivedBy: currentUser.name, receivedAt: new Date() });
            });
            toast({ title: "Recepción Exitosa", description: "El stock ha sido sumado al almacén." });
            return true;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al recibir', description: error.message });
            return false;
        }
    };

    const cancelTransfer = async (transferId: string, currentUser: { name: string }) => {
        try {
            await runTransaction(db, async (transaction) => {
                const movementRef = doc(db, 'movements', transferId);
                const movementDoc = await transaction.get(movementRef);
                if (!movementDoc.exists()) throw new Error("Transferencia no encontrada.");
                
                const movementData = movementDoc.data();
                if (movementData.status !== 'Pendiente') throw new Error("Esta transferencia ya fue procesada.");

                // Revert stock to source
                if (movementData.sourceId === 'factory') {
                    const productInFactory = finishedProducts.find(p => p.name === movementData.productName);
                    if (!productInFactory) throw new Error("Producto no encontrado en fábrica.");
                    const factoryProductRef = doc(db, 'finishedProducts', productInFactory.id);
                    transaction.update(factoryProductRef, { quantity: productInFactory.quantity + movementData.quantity });
                } else {
                    const sourceWarehouseRef = doc(db, 'warehouses', movementData.sourceId);
                    const sourceWarehouseDoc = await transaction.get(sourceWarehouseRef);
                    if (sourceWarehouseDoc.exists()) {
                        const sourceWarehouseData = sourceWarehouseDoc.data() as Warehouse;
                        const sourceStock = [...sourceWarehouseData.stock];
                        const sourceIndex = sourceStock.findIndex(s => s.productName === movementData.productName);
                        if (sourceIndex > -1) {
                            sourceStock[sourceIndex].quantity += movementData.quantity;
                        } else {
                            sourceStock.push({ productName: movementData.productName, quantity: movementData.quantity });
                        }
                        transaction.update(sourceWarehouseRef, { stock: sourceStock });
                    }
                }
                
                transaction.update(movementRef, { status: 'Cancelado', cancelledBy: currentUser.name, cancelledAt: new Date() });
            });
            toast({ title: "Transferencia Cancelada", description: "El stock ha regresado al origen." });
            return true;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al cancelar', description: error.message });
            return false;
        }
    };
    
    const createSaleOrder = async (values: SaleFormValues, currentUser: User) => {
        try {
            const warehouse = warehouses.find(w => String(w.id) === String(values.warehouseId));
            if (!warehouse) throw new Error("Almacén no encontrado.");
    
            const now = new Date();
            const saleItems = values.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice,
            }));
            const totalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
            let commissionAmount: number | null = null;
            if (currentUser.role === 'Vendedor' && currentUser.commissionRate) {
                commissionAmount = totalAmount * (currentUser.commissionRate / 100);
            }

            const newSaleRef = doc(collection(db, 'sales'));
            const invoiceNumber = `ORD-${newSaleRef.id.substring(0, 5).toUpperCase()}`;
    
            await setDoc(newSaleRef, {
                warehouseId: values.warehouseId,
                customerId: values.customerId,
                customerName: values.customerName,
                description: values.description || '',
                saleType: values.saleType,
                paymentMethod: values.paymentMethod,
                documentType: values.documentType,
                items: saleItems,
                date: now,
                warehouseName: warehouse.name,
                totalAmount,
                user: currentUser.name,
                status: 'Pendiente',
                invoiceNumber,
                commissionRate: currentUser.commissionRate || null,
                commissionAmount: commissionAmount,
            });
            toast({ title: "Orden de Venta Creada" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al crear orden', description: error.message });
        }
    };
    
    const dispatchSaleOrder = async (saleToDispatch: Sale, currentUser: { name: string }) => {
         try {
            const saleItems = getSaleItems(saleToDispatch);
            let dispatchedSaleData: Sale | null = null;
            await runTransaction(db, async (transaction) => {
                const warehouseRef = doc(db, 'warehouses', String(saleToDispatch.warehouseId));
                const saleRef = doc(db, 'sales', saleToDispatch.id);
                const [warehouseDoc, saleDoc] = await Promise.all([transaction.get(warehouseRef), transaction.get(saleRef)]);

                if (!warehouseDoc.exists()) throw new Error("Almacén no encontrado.");
                if (!saleDoc.exists() || saleDoc.data().status !== 'Pendiente') throw new Error("Orden no pendiente.");
                
                const warehouseData = warehouseDoc.data() as Warehouse;
                let newStock = [...warehouseData.stock];

                // Validate and deduct stock for each item
                for (const item of saleItems) {
                    const productStock = newStock.find(s => s.productName === item.productName);
                    if (!productStock || productStock.quantity < item.quantity) {
                        throw new Error(`Stock insuficiente de ${item.productName}.`);
                    }
                }
                for (const item of saleItems) {
                    newStock = newStock.map(s => 
                        s.productName === item.productName ? { ...s, quantity: s.quantity - item.quantity } : s
                    );
                }
                newStock = newStock.filter(s => s.quantity > 0);
                
                const newInvoiceNumber = saleToDispatch.invoiceNumber.replace('ORD-', 'INV-');
                const newStatus = saleToDispatch.saleType === 'Consignación' ? 'Por Cobrar' : 'Despachado';

                dispatchedSaleData = { ...saleToDispatch, status: newStatus, invoiceNumber: newInvoiceNumber };

                transaction.update(warehouseRef, { stock: newStock });
                transaction.update(saleRef, { status: newStatus, invoiceNumber: newInvoiceNumber });

                const productSummary = saleItems.map(i => `${i.productName} x${i.quantity}`).join(', ');
                transaction.set(doc(collection(db, 'movements')), {
                    date: new Date(),
                    productName: productSummary,
                    quantity: saleItems.reduce((sum: number, i) => sum + i.quantity, 0),
                    type: 'Venta',
                    user: currentUser.name,
                    details: `Vendido a ${saleToDispatch.customerName} desde ${warehouseData.name}`,
                    reference: newInvoiceNumber,
                    status: 'Completado'
                });
            });
            toast({ title: "Orden Despachada" });
            return dispatchedSaleData;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al despachar', description: error.message });
            return null;
        }
    };

    const collectConsignmentPayment = async (saleToCollect: Sale, currentUser: { name: string }) => {
        try {
            await updateDoc(doc(db, 'sales', saleToCollect.id), { status: 'Pagado' });
            toast({ title: "Pago Registrado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al registrar pago' });
        }
    };

    const cancelSaleOrder = async (sale: Sale, currentUser: { name: string }) => {
        try {
            const saleItems = getSaleItems(sale);
            await runTransaction(db, async (transaction) => {
                const saleRef = doc(db, 'sales', sale.id);
                const wasDispatched = ['Despachado', 'Por Cobrar', 'Pagado'].includes(sale.status);

                transaction.update(saleRef, { status: 'Cancelado' });

                const productSummary = saleItems.map(i => `${i.productName} x${i.quantity}`).join(', ');
                transaction.set(doc(collection(db, 'movements')), {
                    date: new Date(),
                    productName: productSummary,
                    quantity: saleItems.reduce((sum: number, i) => sum + i.quantity, 0),
                    type: 'Anulación de Venta',
                    user: currentUser.name,
                    details: `Anulación de orden ${sale.invoiceNumber}`,
                    reference: sale.invoiceNumber,
                    status: 'Completado'
                });

                if (wasDispatched) {
                     const warehouseRef = doc(db, 'warehouses', String(sale.warehouseId));
                     const warehouseDoc = await transaction.get(warehouseRef);
                     if (!warehouseDoc.exists()) throw new Error("Almacén no encontrado.");
                     const newStock = [...warehouseDoc.data().stock];
                     for (const item of saleItems) {
                         const idx = newStock.findIndex(s => s.productName === item.productName);
                         if (idx > -1) newStock[idx].quantity += item.quantity;
                         else newStock.push({ productName: item.productName, quantity: item.quantity });
                     }
                     transaction.update(warehouseRef, { stock: newStock });
                }
            });
            toast({ title: "Orden Anulada Correctamente" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al anular", description: error.message });
        }
    };
    
    const updateSale = async (saleToUpdate: Sale) => {
        try {
            const { id, ...dataToUpdate } = saleToUpdate;
            await updateDoc(doc(db, 'sales', id), dataToUpdate as any);
            toast({ title: "Venta Actualizada" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        }
    };

    const saveWarehouse = async (values: WarehouseFormValues, isEditMode: boolean, existingWarehouse: Warehouse | null) => {
        try {
            if (isEditMode && existingWarehouse) await updateDoc(doc(db, 'warehouses', String(existingWarehouse.id)), { name: values.name });
            else await addDoc(collection(db, 'warehouses'), { name: values.name, stock: [] });
            toast({ title: "Almacén Guardado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        }
    };
    
    const deleteWarehouse = async (warehouseToDelete: Warehouse) => {
        try {
            await deleteDoc(doc(db, 'warehouses', String(warehouseToDelete.id)));
            toast({ title: "Almacén Eliminado" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        }
    };

    const addCustomer = async (customerData: Partial<Customer>) => {
        try {
            await addDoc(collection(db, 'customers'), { ...customerData, marketSurvey: customerData.marketSurvey || [] });
            toast({ title: "Cliente Creado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const updateCustomer = async (customerToUpdate: Customer) => {
        try {
            const { id, ...dataToUpdate } = customerToUpdate;
            await updateDoc(doc(db, 'customers', id), dataToUpdate as any);
            toast({ title: "Cliente Actualizado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const deleteCustomer = async (customerId: string) => {
        try {
            await deleteDoc(doc(db, 'customers', customerId));
            toast({ title: "Cliente Eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const saveRoute = async (values: RouteFormValues, isEditMode: boolean, existingRoute: Route | null) => {
        try {
            if (isEditMode && existingRoute) await updateDoc(doc(db, 'routes', existingRoute.id), { ...values });
            else await addDoc(collection(db, 'routes'), values);
            toast({ title: "Ruta Guardada" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const deleteRoute = async (routeId: string) => {
        try {
            await deleteDoc(doc(db, 'routes', routeId));
            toast({ title: "Ruta Eliminada" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };
    
    const saveMarketProduct = async (productData: Omit<MarketProduct, 'id'>, productId?: string) => {
        try {
            if (productId) await updateDoc(doc(db, 'marketProducts', productId), productData);
            else await addDoc(collection(db, 'marketProducts'), productData);
            toast({ title: "Producto de Mercado Guardado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const deleteMarketProduct = async (productId: string) => {
        try {
            await deleteDoc(doc(db, 'marketProducts', productId));
            toast({ title: "Producto de Mercado Eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const addExpense = async (expenseData: ExpenseFormValues) => {
        try {
            const dataToSave: any = { ...expenseData };
            if (!expenseData.amountBolivares) delete dataToSave.amountBolivares;
            await addDoc(collection(db, 'expenses'), dataToSave);
            toast({ title: "Gasto Creado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const updateExpense = async (expenseToUpdate: Expense) => {
        try {
            const { id, ...dataToUpdate } = expenseToUpdate;
            await updateDoc(doc(db, 'expenses', id), dataToUpdate as any);
            toast({ title: "Gasto Actualizado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const deleteExpense = async (expenseId: string) => {
        try {
            await deleteDoc(doc(db, 'expenses', expenseId));
            toast({ title: "Gasto Eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const addEmployee = async (employeeData: EmployeeFormValues) => {
         try {
            await addDoc(collection(db, 'employees'), employeeData);
            toast({ title: "Empleado Creado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const updateEmployee = async (employeeToUpdate: Employee) => {
        try {
            const { id, ...dataToUpdate } = employeeToUpdate;
            await updateDoc(doc(db, 'employees', id), dataToUpdate as any);
            toast({ title: "Empleado Actualizado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const deleteEmployee = async (employeeId: string) => {
        try {
            await deleteDoc(doc(db, 'employees', String(employeeId)));
            toast({ title: "Empleado Eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const createUser = async (userData: UserFormValues) => {
        let tempApp: any = null;
        try {
            // Validate password before proceeding
            if (!userData.password || userData.password.length < 6) {
                toast({ variant: "destructive", title: "Error", description: "La contraseña debe tener al menos 6 caracteres." });
                return;
            }

            const tempAppName = `temp-app-${Date.now()}`;
            tempApp = initializeApp(firebaseConfig, tempAppName);
            // Critical: Initialize secondary Auth with in-memory persistence directly to avoid polluting browser session storage
            const tempAuth = initializeAuth(tempApp, {
                persistence: inMemoryPersistence,
            });

            // 1. Create user in Auth using secondary app
            const userCredential = await createUserWithEmailAndPassword(tempAuth, userData.email, userData.password);
            const uid = userCredential.user.uid;

            // 2. Sign out immediately from temp auth BEFORE writing to Firestore
            // This prevents any race condition with the primary auth listener
            try { await signOut(tempAuth); } catch(e) { /* ignore signout errors */ }

            // 3. Build cleaned user profile without undefined properties
            const { password, confirmPassword, isEditMode, ...profileData } = userData;
            
            const cleanedProfile: Record<string, any> = {
                id: uid,
                name: profileData.name || 'Nuevo Usuario',
                email: profileData.email,
                role: profileData.role || 'Operador',
                permissions: profileData.permissions || getDefaultPermissions(profileData.role || 'Operador'),
            };

            if (profileData.role === 'Vendedor' && profileData.commissionRate !== undefined && profileData.commissionRate !== null && !isNaN(profileData.commissionRate)) {
                cleanedProfile.commissionRate = Number(profileData.commissionRate);
            }

            // 4. Save profile in Firestore (using primary db instance)
            await setDoc(doc(db, 'users', uid), cleanedProfile);

            // 5. Cleanup secondary app instance
            try { await deleteApp(tempApp); tempApp = null; } catch(e) { /* ignore cleanup errors */ }

            toast({ title: "Usuario Creado", description: "El acceso y el perfil han sido configurados correctamente." });
        } catch (error: any) {
            console.error("Error creating user:", error);
            let msg = "No se pudo crear el usuario.";
            if (error?.code === 'auth/email-already-in-use') msg = "El correo ya está registrado.";
            else if (error?.code === 'auth/weak-password') msg = "La contraseña es muy débil (mínimo 6 caracteres).";
            else if (error?.code === 'auth/invalid-email') msg = "El correo electrónico no es válido.";
            else if (error?.code === 'auth/operation-not-allowed') msg = "La creación de cuentas no está habilitada en Firebase.";
            else if (error?.code === 'auth/network-request-failed') msg = "Error de red. Verifica tu conexión a internet.";
            else if (error?.message) msg += ` (${error.message})`;
            toast({ variant: "destructive", title: "Error al crear usuario", description: msg });
        } finally {
            // Guarantee cleanup of temporary Firebase app
            if (tempApp) {
                try { await deleteApp(tempApp); } catch(e) { /* ignore */ }
            }
        }
    };

    const updateUser = async (userToUpdate: User) => {
        try {
            const { id, ...dataToUpdate } = userToUpdate;
            const cleanedData: Record<string, any> = {};
            Object.entries(dataToUpdate).forEach(([k, v]) => {
                if (v !== undefined) {
                    cleanedData[k] = v;
                }
            });
            await updateDoc(doc(db, 'users', id), cleanedData);
            toast({ title: "Usuario Actualizado" });
        } catch (error: any) {
            console.error("Error updating user:", error);
            toast({ variant: "destructive", title: "Error", description: error?.message || "No se pudo actualizar el usuario." });
        }
    };
    
    const updateUserLocation = async (userId: string, location: { lat: number, lng: number }) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) throw new Error("User document not found.");
            
            const userData = userSnap.data();
            const newPoint = { ...location, timestamp: new Date() };
            let history = userData.locationHistory || [];
            history.push(newPoint);
            if (history.length > 50) history = history.slice(-50);

            await updateDoc(userRef, {
                lastLocation: location,
                lastLocationTimestamp: serverTimestamp(),
                locationHistory: history
            });
        } catch (error) {
            console.error("Error updating location:", error);
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            await deleteDoc(doc(db, 'users', userId));
            toast({ title: "Perfil de Usuario Eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };
    
    const addSupplier = async (supplierData: SupplierFormValues) => {
         try {
            await addDoc(collection(db, 'suppliers'), supplierData);
            toast({ title: "Proveedor Creado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const updateSupplier = async (supplierToUpdate: Supplier) => {
        try {
            const { id, ...dataToUpdate } = supplierToUpdate;
            await updateDoc(doc(db, 'suppliers', String(id)), dataToUpdate);
            toast({ title: "Proveedor Actualizado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const deleteSupplier = async (supplierId: string) => {
        try {
            await deleteDoc(doc(db, 'suppliers', String(supplierId)));
            toast({ title: "Proveedor Eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const savePurchaseOrder = async (values: PurchaseOrderFormValues, isEditMode: boolean, existingOrder: PurchaseOrder | null) => {
        const supplier = suppliers.find(s => s.id === values.supplierId);
        if (!supplier) return;

        const itemsWithNames = values.items.map(item => {
            const material = inventoryItems.find(m => m.id === item.materialId);
            return { ...item, materialName: material?.name || 'Desconocido' };
        });

        const totalAmount = itemsWithNames.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

        try {
            if (isEditMode && existingOrder) {
                await updateDoc(doc(db, 'purchaseOrders', existingOrder.id), { ...values, supplierName: supplier.name, items: itemsWithNames, totalAmount });
            } else {
                const poRef = doc(collection(db, 'purchaseOrders'));
                await setDoc(poRef, {
                    ...values,
                    orderNumber: `OC-${poRef.id.substring(0, 6).toUpperCase()}`,
                    supplierName: supplier.name,
                    items: itemsWithNames,
                    totalAmount,
                    status: 'Pendiente',
                    date: new Date(),
                });
            }
            toast({ title: "Orden de Compra Guardada" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const receivePurchaseOrder = async (order: PurchaseOrder) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, 'purchaseOrders', order.id);
                for (const item of order.items) {
                    const matRef = doc(db, 'inventoryItems', item.materialId);
                    const matSnap = await transaction.get(matRef);
                    if (matSnap.exists()) {
                        const current = matSnap.data() as InventoryItem;
                        const newQty = current.quantity + item.quantity;
                        transaction.update(matRef, { quantity: newQty, status: newQty > current.lowStockThreshold ? 'En Stock' : current.status });
                    }
                }
                transaction.update(orderRef, { status: 'Recibido' });
            });
            toast({ title: "Orden Recibida e Inventario Actualizado" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const cancelPurchaseOrder = async (order: PurchaseOrder) => {
        try {
            await updateDoc(doc(db, 'purchaseOrders', order.id), { status: 'Cancelado' });
            toast({ title: "Orden de Compra Cancelada" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };

    const processPayroll = async (payrollId: string, newExpenseData: Omit<Expense, 'id'>) => {
        try {
            const batch = writeBatch(db);
            batch.set(doc(collection(db, 'expenses')), newExpenseData);
            batch.set(doc(db, 'paidPayrolls', payrollId), { paid: true });
            await batch.commit();
            toast({ title: "Nómina Procesada" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };
    
    const updateProductionLines = async (lines: ProductionLine[]) => {
        try {
            const batch = writeBatch(db);
            lines.forEach(line => {
                const { id, ...rest } = line;
                const docRef = doc(db, 'productionLines', String(id));
                const firestoreData = JSON.parse(JSON.stringify(rest), (k, v) => {
                    if (k.endsWith('Date') && v) return Timestamp.fromDate(new Date(v));
                    return v === undefined ? null : v;
                });
                batch.set(docRef, firestoreData, { merge: true });
            });
            await batch.commit();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al actualizar líneas' });
        }
    };
    
    const createStockRequest = async (values: StockRequestFormValues, currentUser: User) => {
        try {
            const warehouse = warehouses.find(w => w.id === values.warehouseId);
            if (!warehouse) throw new Error("Almacén no encontrado.");
            await addDoc(collection(db, 'stockRequests'), {
                ...values,
                warehouseName: warehouse.name,
                date: new Date(),
                status: 'Pendiente',
                requestedBy: currentUser.name,
            });
            toast({ title: "Solicitud de Stock Enviada" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const updateStockRequestStatus = async (requestId: string, status: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Completado') => {
        try {
            await updateDoc(doc(db, 'stockRequests', requestId), { status });
            toast({ title: `Solicitud ${status}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al actualizar solicitud', description: error.message });
        }
    };

    const deleteStockRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'stockRequests', requestId));
            toast({ title: "Solicitud Eliminada" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al eliminar solicitud', description: error.message });
        }
    };

    const value: InventoryContextType = {
        loading, errorMessage, inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, updateMultipleInventoryItems,
        finishedProducts, fabricateProduct, recipes, saveRecipeAndProduct, deleteRecipeAndProduct, warehouses, transferProduct, receiveTransfer, cancelTransfer, saveWarehouse, deleteWarehouse,
        movements, sales, createSaleOrder, dispatchSaleOrder, cancelSaleOrder, collectConsignmentPayment, updateSale, customers, addCustomer, updateCustomer, deleteCustomer,
        routes, saveRoute, deleteRoute, marketProducts, saveMarketProduct, deleteMarketProduct, expenses, addExpense, updateExpense, deleteExpense, employees, addEmployee, updateEmployee, deleteEmployee,
        users, createUser, updateUser, deleteUser, updateUserLocation, suppliers, addSupplier, updateSupplier, deleteSupplier, purchaseOrders, savePurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder,
        paidPayrolls, processPayroll, productionLines, updateProductionLines, stockRequests, createStockRequest, updateStockRequestStatus, deleteStockRequest,
    };

    return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
    const context = useContext(InventoryContext);
    if (context === undefined) throw new Error('useInventory must be used within an InventoryProvider');
    return context;
}
