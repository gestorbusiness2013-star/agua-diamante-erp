'use client';

import { useState, useMemo, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Download, Calendar as CalendarIcon, Landmark, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ExpenseForm, type ExpenseFormValues } from "@/components/expense-form";
import { EmployeeForm, type EmployeeFormValues } from "@/components/employee-form";
import type { Expense } from "@/lib/expenses-data";
import type { Employee } from "@/lib/payroll-data";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, getYear, getMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useInventory } from "@/context/inventory-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), "MMMM", { locale: es }),
}));

const YEARS = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);

export default function ExpensesAndPayrollPage() {
    const { toast } = useToast();
    const { 
        expenses, addExpense, updateExpense, deleteExpense,
        employees, addEmployee, updateEmployee, deleteEmployee,
        paidPayrolls, processPayroll,
    } = useInventory();

    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const [deleteExpenseAlertOpen, setDeleteExpenseAlertOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>();

    const [periodType, setPeriodType] = useState<'mensual' | 'quincenal' | 'semanal'>('mensual');
    const [selectedQuincena, setSelectedQuincena] = useState<'primera' | 'segunda'>('primera');
    const [payrollPeriodDate, setPayrollPeriodDate] = useState<DateRange | undefined>();
    const [selectedMonth, setSelectedMonth] = useState<number>();
    const [selectedYear, setSelectedYear] = useState<number>();
    const [payrollAmounts, setPayrollAmounts] = useState<Record<number, number>>({});
    const [selectedEmployeesForPdf, setSelectedEmployeesForPdf] = useState<Set<number>>(new Set());

    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [deleteEmployeeAlertOpen, setDeleteEmployeeAlertOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [isEmployeeEditMode, setIsEmployeeEditMode] = useState(false);

    useEffect(() => {
        const today = new Date();
        setDate({
            from: new Date(today.getFullYear(), today.getMonth(), 1),
            to: addDays(new Date(today.getFullYear(), today.getMonth() + 1, 0), 0),
        });
        setPayrollPeriodDate({ from: startOfWeek(today, { locale: es }), to: endOfWeek(today, { locale: es }) });
        setSelectedMonth(getMonth(today));
        setSelectedYear(getYear(today));
    }, []);

    useEffect(() => {
        const initialAmounts = employees.reduce((acc, emp) => {
            let salary = emp.monthlySalary;
            if (periodType === 'quincenal') salary = emp.monthlySalary / 2;
            else if (periodType === 'semanal') salary = emp.monthlySalary / 4;
            acc[parseInt(emp.id)] = Math.round(salary * 100) / 100;
            return acc;
        }, {} as Record<number, number>);
        setPayrollAmounts(initialAmounts);
        setSelectedEmployeesForPdf(new Set(employees.map(emp => parseInt(emp.id))));
    }, [employees, periodType]);

    const filteredExpenses = useMemo(() => {
        if (date?.from && date?.to) {
            const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
            const toDate = new Date(date.to.setHours(23, 59, 59, 999));
            return expenses.filter(e => e.date >= fromDate && e.date <= toDate);
        }
        return expenses;
    }, [expenses, date]);

    const expenseTotals = useMemo(() => ({
        usd: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
        bs: filteredExpenses.reduce((sum, e) => sum + (e.amountBolivares || 0), 0),
    }), [filteredExpenses]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    const formatCurrencyBs = (amount: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
    
    const handleOpenExpenseDialog = (expense?: Expense) => {
        setSelectedExpense(expense || null);
        setIsEditMode(!!expense);
        setExpenseDialogOpen(true);
    };
    
    const handleExpenseSubmit = async (values: ExpenseFormValues) => {
        if (isEditMode && selectedExpense) await updateExpense({ ...selectedExpense, ...values });
        else await addExpense(values);
        setExpenseDialogOpen(false);
    };
    
    const handleDownloadExpensesPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Reporte de Gastos", 14, 22);
        const range = (date?.from && date?.to) ? `Período: ${format(date.from, 'dd/MM/yyyy')} - ${format(date.to, 'dd/MM/yyyy')}` : 'Todos los gastos';
        doc.setFontSize(12);
        doc.text(range, 14, 30);
        (doc as any).autoTable({
            startY: 40,
            head: [['Fecha', 'Descripción', 'Responsable', 'Categoría', 'Monto (USD)', 'Monto (Bs.)']],
            body: filteredExpenses.map(e => [
                format(e.date, 'dd/MM/yyyy'),
                e.description,
                e.responsible || 'N/A',
                e.category,
                e.amount.toFixed(2),
                e.amountBolivares?.toFixed(2) || ''
            ]),
            foot: [['', '', '', 'Total General', formatCurrency(expenseTotals.usd), expenseTotals.bs > 0 ? formatCurrencyBs(expenseTotals.bs) : '']],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
            footStyles: { fontStyle: 'bold' },
            columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } }
        });
        window.open(URL.createObjectURL(doc.output('blob')), '_blank');
    };

    const totalPayrollToProcess = useMemo(() => Object.values(payrollAmounts).reduce((sum, amount) => sum + amount, 0), [payrollAmounts]);
    const payrollId = useMemo(() => {
        if (periodType === 'mensual' && selectedYear && selectedMonth !== undefined) return `mensual-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
        if (periodType === 'quincenal' && selectedYear && selectedMonth !== undefined) return `quincenal-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${selectedQuincena}`;
        if (periodType === 'semanal' && payrollPeriodDate?.from) return `semanal-${format(payrollPeriodDate.from, 'yyyy-MM-dd')}`;
        return null;
    }, [periodType, selectedYear, selectedMonth, selectedQuincena, payrollPeriodDate]);

    const isPayrollPaid = useMemo(() => payrollId ? paidPayrolls.includes(payrollId) : false, [payrollId, paidPayrolls]);

    const handleProcessPayroll = async () => {
        if (!payrollId || isPayrollPaid) return;
        let desc = 'Pago de nómina';
        let date = new Date();
        if (periodType === 'mensual' && selectedYear && selectedMonth !== undefined) {
            desc = `Nómina ${MONTHS[selectedMonth].label} ${selectedYear}`;
            date = new Date(selectedYear, selectedMonth + 1, 0);
        }
        await processPayroll(payrollId, { description: desc, amount: totalPayrollToProcess, category: 'Pago de nómina', date, responsible: 'Sistema' });
    };

    return (
        <div className="w-full">
        <Tabs defaultValue="expenses">
            <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="expenses">Gastos</TabsTrigger>
                <TabsTrigger value="payroll">Nómina</TabsTrigger>
                <TabsTrigger value="employees">Empleados</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Landmark /> Gestión de Gastos</CardTitle>
                            <CardDescription>Visualiza y descarga el rastro de tus egresos.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{date?.from ? format(date.from, "PP", { locale: es }) : 'Filtrar'}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={2} locale={es} />
                                </PopoverContent>
                            </Popover>
                            <Button onClick={handleDownloadExpensesPDF} variant="outline"><Download className="mr-2 h-4 w-4" />PDF</Button>
                            <Button onClick={() => handleOpenExpenseDialog()}><PlusCircle className="mr-2 h-4 w-4" />Gasto</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Responsable</TableHead>
                                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                                <TableHead className="text-right">Monto (USD)</TableHead>
                                <TableHead className="text-right">Fecha</TableHead>
                                <TableHead></TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {filteredExpenses.map(e => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium">{e.description}</TableCell>
                                        <TableCell>{e.responsible || <span className="text-muted-foreground italic">No asignado</span>}</TableCell>
                                        <TableCell className="hidden md:table-cell">{e.category}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(e.amount)}</TableCell>
                                        <TableCell className="text-right">{format(e.date, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenExpenseDialog(e)}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setExpenseToDelete(e); setDeleteExpenseAlertOpen(true); }} className="text-destructive">Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="justify-end border-t pt-4 font-bold text-lg">Total: {formatCurrency(expenseTotals.usd)}</CardFooter>
                </Card>
            </TabsContent>
            
            <TabsContent value="employees">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Users /> Equipo de Trabajo</CardTitle>
                            <CardDescription>Gestiona el personal y sus salarios base.</CardDescription>
                        </div>
                        <Button onClick={() => { setSelectedEmployee(null); setIsEmployeeEditMode(false); setEmployeeDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Empleado
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Cargo</TableHead><TableHead className="text-right">Salario (USD)</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {employees.map(emp => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8"><AvatarImage src={emp.photoUrl} /><AvatarFallback>{emp.name?.[0] || '?'}</AvatarFallback></Avatar>
                                                <div><div>{emp.name || 'Empleado'}</div><div className="text-xs text-muted-foreground">{emp.idNumber}</div></div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{emp.position}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(emp.monthlySalary)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setIsEmployeeEditMode(true); setEmployeeDialogOpen(true); }}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setEmployeeToDelete(emp); setDeleteEmployeeAlertOpen(true); }} className="text-destructive">Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogContent><DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Nuevo'} Gasto</DialogTitle></DialogHeader><ExpenseForm initialData={selectedExpense} onSubmit={handleExpenseSubmit} onClose={() => setExpenseDialogOpen(false)}/></DialogContent>
        </Dialog>

        <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
            <DialogContent><DialogHeader><DialogTitle>{isEmployeeEditMode ? 'Editar' : 'Nuevo'} Empleado</DialogTitle></DialogHeader>
                <EmployeeForm initialData={selectedEmployee} onSubmit={async (v) => { if (isEmployeeEditMode && selectedEmployee) await updateEmployee({ ...selectedEmployee, ...v }); else await addEmployee(v); setEmployeeDialogOpen(false); }} onClose={() => setEmployeeDialogOpen(false)} />
            </DialogContent>
        </Dialog>

        <AlertDialog open={deleteExpenseAlertOpen} onOpenChange={setDeleteExpenseAlertOpen}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={async () => { if (expenseToDelete) await deleteExpense(expenseToDelete.id); setDeleteExpenseAlertOpen(false); }}>Sí, Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteEmployeeAlertOpen} onOpenChange={setDeleteEmployeeAlertOpen}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación de empleado?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={async () => { if (employeeToDelete) await deleteEmployee(employeeToDelete.id); setDeleteEmployeeAlertOpen(false); }}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
        </div>
    );
}
