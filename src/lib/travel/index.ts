export type TravelStatus = 'draft' | 'confirmed' | 'cancelled' | 'completed'
export interface TravelBooking { id: string; customerId: string; type: 'flight' | 'hotel' | 'package' | 'transfer' | 'other'; status: TravelStatus; details: Record<string, unknown> }
export interface VisaCase { id: string; customerId: string; destination: string; status: 'open' | 'documents' | 'submitted' | 'approved' | 'rejected'; details: Record<string, unknown> }
export interface SupplierRequest { id: string; serviceType: string; payload: Record<string, unknown> }
