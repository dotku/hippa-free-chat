import { generateObject, createGateway } from "ai";
import { z } from "zod";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

const PHI_CATEGORIES = [
  "patient_name",
  "ssn",
  "medical_record_number",
  "date_of_birth",
  "diagnosis_treatment",
  "insurance_billing",
  "contact_information",
  "biometric_data",
  "medical_images",
  "prescription_details",
] as const;

const ScanResultSchema = z.object({
  safe: z.boolean().describe("Whether the message is safe to send (no PHI detected)"),
  reason: z.string().describe("Explanation of why the message was blocked, or empty string if safe"),
  categories: z.array(z.string()).describe("Categories of PHI detected, or empty array if safe"),
  confidence: z.number().describe("Confidence level of detection between 0 and 1"),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

const SYSTEM_PROMPT = `You are a HIPAA compliance scanner for a healthcare chat system. Your job is to analyze messages and detect Protected Health Information (PHI) that violates HIPAA privacy rules.

PHI includes any individually identifiable health information, specifically:
1. **Patient Names** - Full names or identifiable partial names combined with health context
2. **Social Security Numbers (SSN)** - Any SSN patterns (XXX-XX-XXXX)
3. **Medical Record Numbers (MRN)** - Hospital/clinic record identifiers
4. **Dates of Birth** - When combined with health-related information
5. **Diagnosis/Treatment Details** - Specific medical conditions, procedures, or treatments linked to identifiable individuals
6. **Insurance/Billing Info** - Policy numbers, billing codes with patient identifiers
7. **Contact Information** - Addresses, phone numbers, emails when tied to health context
8. **Biometric Data** - Fingerprints, retinal scans, genetic information with identity
9. **Medical Images** - References to identifiable medical imaging
10. **Prescription Details** - Medication names/dosages tied to identifiable patients

IMPORTANT RULES:
- General health discussions WITHOUT identifying information are SAFE (e.g., "How do I treat a headache?")
- Messages about scheduling without patient identity details are SAFE (e.g., "Can I book an appointment for Tuesday?")
- Messages with ONLY general medical terminology are SAFE
- Messages combining ANY identifier (name, SSN, DOB, MRN) with health information are NOT SAFE
- Even partial identifiers combined with health context should be flagged
- When in doubt about whether information is identifiable, flag it as unsafe

Respond with whether the message is safe, and if not, explain why and which categories of PHI were detected.`;

export async function scanMessage(content: string): Promise<ScanResult> {
  try {
    const { object } = await generateObject({
      model: gateway("openai/gpt-4o-mini"),
      schema: ScanResultSchema,
      system: SYSTEM_PROMPT,
      prompt: `Analyze this chat message for HIPAA PHI violations:\n\n"${content}"`,
    });

    return object;
  } catch (error) {
    console.error("PHI scan error:", error);
    // Fail safe: if scanning fails, block the message
    return {
      safe: false,
      reason: "Unable to verify message safety. Please try again.",
      categories: ["scan_error"],
      confidence: 0,
    };
  }
}
