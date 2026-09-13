
export type Supplier = {
    id: string; // Changed to string for Firestore auto-ID
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
};

export const initialSuppliers: Omit<Supplier, 'id'>[] = [
    {
        name: 'Plásticos de Venezuela C.A.',
        contactPerson: 'Ernesto Gámez',
        phone: '+58 414-1234567',
        email: 'ventas@plasticosven.com',
        address: 'Zona Industrial La Hamaca, Maracay, Aragua'
    },
    {
        name: 'Etiquetas Andinas S.A.',
        contactPerson: 'Sofia Castillo',
        phone: '+58 412-7654321',
        email: 'scastillo@etiandinas.com',
        address: 'Av. Bolivar Norte, Valencia, Carabobo'
    },
    {
        name: 'Químicos Industriales El Sol',
        contactPerson: 'Ricardo Mendoza',
        phone: '+58 424-9876543',
        email: 'ricardo.m@quimisol.net',
        address: 'Calle 72, Maracaibo, Zulia'
    }
];
