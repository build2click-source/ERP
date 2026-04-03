/**
 * GSTIN LOOKUP — Auto-populate client details from GST Portal
 * 
 * Uses the public GST Search API to fetch:
 * - Trade name / Legal name
 * - Address (principal place of business)
 * - Registration status
 * - State code / Place of supply
 * 
 * Note: The public API has rate limits. For production use,
 * consider caching results and using the official GSTN API.
 */

export interface GstinDetails {
  gstin: string;
  legalName: string;
  tradeName: string;
  registrationDate: string;
  status: string;
  stateCode: string;
  stateName: string;
  address: {
    building: string;
    street: string;
    locality: string;
    district: string;
    state: string;
    pincode: string;
    fullAddress: string;
  };
  businessType: string;
  valid: boolean;
}

/**
 * Validate GSTIN format (15-character alphanumeric).
 * Format: 2-digit state code + 10-char PAN + 1-char entity + 'Z' + 1-char checksum
 */
export function validateGstinFormat(gstin: string): boolean {
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(gstin.toUpperCase());
}

/**
 * Extract state code from GSTIN (first 2 digits).
 */
const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

export function getStateFromGstin(gstin: string): { code: string; name: string } | null {
  const code = gstin.substring(0, 2);
  const name = STATE_CODES[code];
  return name ? { code, name } : null;
}

/**
 * Lookup GSTIN details from the public GST API.
 * Falls back to format-based extraction if API is unavailable.
 */
export async function lookupGstin(gstin: string): Promise<GstinDetails> {
  const normalized = gstin.toUpperCase().trim();

  if (!validateGstinFormat(normalized)) {
    throw new GstinError(`Invalid GSTIN format: "${gstin}". Must be 15 alphanumeric characters.`);
  }

  const stateInfo = getStateFromGstin(normalized);

  try {
    // Try public GST API
    const response = await fetch(
      `https://sheet.gstincheck.co.in/check/${process.env.GSTIN_API_KEY || 'free'}/${normalized}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.ok) {
      const data = await response.json();

      if (data.flag && data.data) {
        const d = data.data;
        const addr = d.pradr?.addr || {};

        return {
          gstin: normalized,
          legalName: d.lgnm || '',
          tradeName: d.tradeNam || d.lgnm || '',
          registrationDate: d.rgdt || '',
          status: d.sts || 'Unknown',
          stateCode: stateInfo?.code || '',
          stateName: stateInfo?.name || '',
          address: {
            building: addr.bnm || '',
            street: addr.st || '',
            locality: addr.loc || '',
            district: addr.dst || '',
            state: addr.stcd || stateInfo?.name || '',
            pincode: addr.pncd || '',
            fullAddress: [addr.bnm, addr.st, addr.loc, addr.dst, addr.stcd, addr.pncd]
              .filter(Boolean)
              .join(', '),
          },
          businessType: d.ctb || '',
          valid: true,
        };
      }
    }
  } catch {
    // API unavailable — fall back to format-based extraction
    console.warn('GSTIN API unavailable, using format-based extraction');
  }

  // Fallback: extract what we can from the GSTIN format
  return {
    gstin: normalized,
    legalName: '',
    tradeName: '',
    registrationDate: '',
    status: 'Unverified',
    stateCode: stateInfo?.code || '',
    stateName: stateInfo?.name || '',
    address: {
      building: '',
      street: '',
      locality: '',
      district: '',
      state: stateInfo?.name || '',
      pincode: '',
      fullAddress: '',
    },
    businessType: '',
    valid: false,
  };
}

// ============================================================
// CUSTOM ERROR
// ============================================================

export class GstinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GstinError';
  }
}
