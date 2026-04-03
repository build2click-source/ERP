# Phase 8: E-Invoicing Adapter & Audit Compliance

With the core ERP and UI fully integrated and functional, the next critical step specified by the PRD is fulfilling **Section 8: E-Invoicing Adapter & Payload (India GST)** along with finalizing our audit workflows. 

## Goal
Implement a robust adapter structure to handle outward GST APIs (IRP/GSP) for generating Invoice Reference Numbers (IRN) and QR Codes securely, along with configuring the system for end-to-end auditability.

## Proposed Changes

### Core API Extensions 
#### [NEW] `src/lib/compliance/e-invoice-adapter.ts`
We will build out the Indian GST e-invoicing adapter engine.
- **`generateIrnPayload(invoiceId)`**: Constructs the strictly typed JSON payload required by the NIC (National Informatics Centre) IRP, incorporating Supplier GSTIN, Recipient GSTIN, tax breakup, and HSN codes.
- **`submitToGsp(payload)`**: A mockable network adapter that simulates signing and submitting the payload to a GST Suvidha Provider.
- **`processIrpResponse(response)`**: Processes the returned IRN string and Signed QR Code, updating the `invoices` table immutably.

#### [MODIFY] `src/app/api/invoices/[id]/post/route.ts`
- Upgrade the invoice posting lifecycle to automatically trigger the `e-invoice-adapter.ts` after local accounting ledgers are written.
- Ensure the transaction is rolled back or marked 'Pending IRN' if the external API fails (ensuring idempotency).

#### [NEW] `src/lib/audit/logger.ts`
- Implement tamper-evident auditing.
- Track user operations and document read-receipt logs especially for KYC and tax documents as denoted in the PRD.

## Open Questions
> [!IMPORTANT]
> The e-invoicing flow typically interacts with a Sandbox GSP provider during development. Since we do not have real Sandbox keys defined in `.env` yet, the adapter will use a **Mock Strategy** to simulate network latency, generate a fake IRN (e.g., a 64-character hex string), and return a simulated signed QR code for testing. Are you okay with this mock implementation for the adapter?

## Verification Plan

### Automated Tests
- Build internal jest/vitest unit tests for the `generateIrnPayload` ensuring the JSON output perfectly matches the schema requirements.
- Ensure the Mock Strategy safely updates the database and creates the e-invoice reference correctly.
