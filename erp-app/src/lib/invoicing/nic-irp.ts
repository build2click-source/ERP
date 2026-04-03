/**
 * NIC IRP E-Invoicing API Adapter
 * 
 * Provides an interface to connect to the National Informatics Centre (NIC)
 * Invoice Registration Portal (IRP) for generating e-invoices, IRNs,
 * and e-Way Bills as required by Indian GST laws.
 * 
 * Note: This is an adapter shell. In a real production environment, 
 * this needs valid API credentials, an ASP/GSP provider (like ClearTax),
 * and RSA encryption for authentication payloads.
 */

export interface EInvoicePayload {
  documentType: 'INV' | 'CRN' | 'DBN';
  documentNumber: string;
  documentDate: string;
  sellerGstin: string;
  buyerGstin: string;
  buyerLegalName: string;
  buyerAddress1: string;
  buyerLocation: string;
  buyerPincode: number;
  buyerStateCode: string;
  dispatchDetails?: {
    companyName: string;
    address1: string;
    location: string;
    pincode: number;
    stateCode: string;
  };
  itemList: Array<{
    slNo: string;
    productDescription: string;
    isService: 'Y' | 'N';
    hsnCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    grossAmount: number;
    gstRate: number;
    igstAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    itemTotal: number;
  }>;
  totalBeforeTax: number;
  totalIgst?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalInvoiceValue: number;
}

export interface EInvoiceResponse {
  success: boolean;
  irn?: string;                  // 64-char Invoice Reference Number
  signedInvoice?: string;        // JWT signed by NIC
  signedQrCode?: string;         // Signed QR code for printing
  status?: 'ACT' | 'CAN';
  errorMessage?: string;
  errorCode?: string;
  infoDetails?: any;
}

export interface EWayBillPayload {
  irn: string;
  transporterId?: string;
  transporterName?: string;
  transportMode: '1' | '2' | '3' | '4'; // 1-Road, 2-Rail, 3-Air, 4-Ship
  distance: number;
  vehicleNo: string;
  vehicleType: 'R' | 'O'; // Regular or ODC
  docNo: string;
  docDate: string;
}

export interface EWayBillResponse {
  success: boolean;
  ewayBillNo?: string;
  ewayBillDate?: string;
  validUpto?: string;
  errorMessage?: string;
}

class NicIrpClient {
  private clientId: string;
  private clientSecret: string;
  private gstin: string;
  private baseUrl: string;

  constructor(config: { clientId: string; clientSecret: string; gstin: string; environment?: 'sandbox' | 'production' }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.gstin = config.gstin;
    this.baseUrl = config.environment === 'sandbox' 
      ? 'https://einv-apisandbox.nic.in' 
      : 'https://einv-api.nic.in';
  }

  // Authenticate and get AuthToken, Sek
  private async authenticate(): Promise<string> {
    // Implement standard NIC RSA encryption based auth with AppKey
    console.log(`[NIC IRP] Mock authenticating for GSTIN: ${this.gstin}`);
    return 'mock_auth_token_12345';
  }

  /**
   * Generate IRN for an invoice
   */
  async generateIrn(payload: EInvoicePayload): Promise<EInvoiceResponse> {
    try {
      console.log(`[NIC IRP] Generating IRN for Invoice: ${payload.documentNumber}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock successful response
      return {
        success: true,
        irn: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890def12',
        signedInvoice: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload.mock_signature',
        signedQrCode: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock_qr_payload.mock_qr_signature',
        status: 'ACT',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error generating IRN',
      };
    }
  }

  /**
   * Cancel an existing IRN
   */
  async cancelIrn(irn: string, cancelReason: '1' | '2' | '3' | '4', cancelRemarks: string): Promise<EInvoiceResponse> {
    try {
      console.log(`[NIC IRP] Cancelling IRN: ${irn.substring(0, 10)}... Reason: ${cancelReason}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        irn,
        status: 'CAN',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: 'Failed to cancel IRN',
      };
    }
  }

  /**
   * Generate E-Way Bill from existing IRN
   */
  async generateEWayBill(payload: EWayBillPayload): Promise<EWayBillResponse> {
    try {
      console.log(`[NIC IRP] Generating E-Way Bill for IRN: ${payload.irn.substring(0, 10)}...`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));

      return {
        success: true,
        ewayBillNo: '15${Math.floor(Math.random() * 1000000000)}',
        ewayBillDate: new Date().toISOString(),
        validUpto: new Date(Date.now() + 86400000).toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: 'Failed to generate E-Way bill',
      };
    }
  }
}

// Global default singleton instance
const globalForIrp = globalThis as unknown as { irpClient: NicIrpClient | undefined };

export const irpClient = globalForIrp.irpClient ?? new NicIrpClient({
  clientId: process.env.NIC_CLIENT_ID || 'dummy_client',
  clientSecret: process.env.NIC_CLIENT_SECRET || 'dummy_secret',
  gstin: process.env.COMPANY_GSTIN || '27XXXXX0000X1Z5',
  environment: 'sandbox'
});

if (process.env.NODE_ENV !== 'production') globalForIrp.irpClient = irpClient;
