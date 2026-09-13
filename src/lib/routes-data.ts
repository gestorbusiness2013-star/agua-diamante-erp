
export type Route = {
    id: string; // Changed to string for Firestore
    name: string;
    customerIds: string[]; // Changed to string array
};

// This initial data is used for seeding the database on first run.
// After the first run, data will be fetched from Firestore.
export const initialRoutes: Omit<Route, 'id'>[] = [
    // The context will now handle associating the initial customers
    // to these routes dynamically when seeding.
];
