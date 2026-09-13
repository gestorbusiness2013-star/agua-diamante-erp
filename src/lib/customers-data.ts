
export type MarketProductSurvey = {
    productId: string; // ID of the market product
    purchasePrice: number;
    sellingPrice: number;
    weeklyVolume: number;
};

export type Customer = {
    id: string; 
    name: string;
    rif: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    geolocation?: string;
    // New dynamic survey data
    marketSurvey?: MarketProductSurvey[];
};

// This initial data is used for seeding the database on first run.
// After the first run, data will be fetched from Firestore.
export const initialCustomers: Omit<Customer, 'id'>[] = [
    {
        name: "Supermercado La Esquina",
        rif: "J-12345678-9",
        contactPerson: "Ana Rivas",
        phone: "+58 212-5551234",
        email: "compras@laesquina.com",
        address: "Av. Principal, Edif. Centro, Local 1, Caracas",
        geolocation: "https://maps.app.goo.gl/1",
        marketSurvey: [],
    },
    {
        name: "Distribuidora Central",
        rif: "J-98765432-1",
        contactPerson: "Pedro Castillo",
        phone: "+58 241-5555678",
        email: "pedidos@districentral.com",
        address: "Zona Industrial, Lote 5, Valencia",
        geolocation: "https://maps.app.goo.gl/2",
        marketSurvey: [],
    }
];

// New data structure for market products
export type MarketProduct = {
    id: string;
    name: string;
    description?: string;
};

export const initialMarketProducts: Omit<MarketProduct, 'id'>[] = [
    { name: "Agua Mineral Minalba 1.5L", description: "Competidor principal en tamaño familiar." },
    { name: "Agua Mineral Nevada 1.5L", description: "Competidor de precio bajo." },
    { name: "Jugo Yukery Manzana 1L", description: "Alternativa de bebida." },
];
