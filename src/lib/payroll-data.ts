

export type Employee = {
    id: string; // Changed to string for Firestore auto-ID
    name: string;
    position: string;
    monthlySalary: number; // in USD
    idNumber: string;
    phone: string;
    address: string;
    birthDate: Date;
    photoUrl: string;
    idPhotoUrl: string;
    cvUrl: string;
};

export const initialEmployees: Omit<Employee, 'id'>[] = [
    { 
        name: "Carlos Perez", 
        position: "Operador de Línea", 
        monthlySalary: 800,
        idNumber: "V-12.345.678",
        phone: "+58 412-1234567",
        address: "Calle Principal 123, Caracas",
        birthDate: new Date("1990-05-15"),
        photoUrl: "https://placehold.co/100x100.png",
        idPhotoUrl: "https://placehold.co/400x250.png",
        cvUrl: "#"
    },
    { 
        name: "Luisa Fernandez", 
        position: "Operador de Línea", 
        monthlySalary: 800,
        idNumber: "V-13.456.789",
        phone: "+58 412-2345678",
        address: "Avenida Central 456, Maracaibo",
        birthDate: new Date("1992-08-20"),
        photoUrl: "https://placehold.co/100x100.png",
        idPhotoUrl: "https://placehold.co/400x250.png",
        cvUrl: "#"
    },
    { 
        name: "Jorge Martinez", 
        position: "Supervisor de Producción", 
        monthlySalary: 1200,
        idNumber: "V-14.567.890",
        phone: "+58 412-3456789",
        address: "Plaza Mayor 789, Valencia",
        birthDate: new Date("1985-11-30"),
        photoUrl: "https://placehold.co/100x100.png",
        idPhotoUrl: "https://placehold.co/400x250.png",
        cvUrl: "#"
    },
    { 
        name: "Maria Rodriguez", 
        position: "Control de Calidad", 
        monthlySalary: 950,
        idNumber: "V-15.678.901",
        phone: "+58 412-4567890",
        address: "Calle Luna 101, Barquisimeto",
        birthDate: new Date("1995-02-10"),
        photoUrl: "https://placehold.co/100x100.png",
        idPhotoUrl: "https://placehold.co/400x250.png",
        cvUrl: "#"
    },
    { 
        name: "Pedro Gomez", 
        position: "Mantenimiento", 
        monthlySalary: 900,
        idNumber: "V-16.789.012",
        phone: "+58 412-5678901",
        address: "Avenida Sol 212, Maracay",
        birthDate: new Date("1988-07-25"),
        photoUrl: "https://placehold.co/100x100.png",
        idPhotoUrl: "https://placehold.co/400x250.png",
        cvUrl: "#"
    },
];
