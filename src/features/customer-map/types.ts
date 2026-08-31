export type CustomerMapItem = { id: number; name: string; phone: string; address: string; latitude: number; longitude: number; lastConsultDate: string | null; isFavorite: boolean; markerNo: number };
export type CustomerMapUnmapped = { id: number; name: string; phone: string; address: string; mapStatusLabel: string };
export type CustomerMapStats = { totalCustomers: number; mappedCount: number; unmappedCount: number };
export type CustomerMapResult = { customers: CustomerMapItem[]; unmappedCustomers: CustomerMapUnmapped[]; centerLat: number; centerLng: number; zoom: number; stats: CustomerMapStats };
