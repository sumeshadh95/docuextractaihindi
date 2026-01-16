import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { ExtractionResult } from "../types";

export const extractDataFromImage = async (
  base64Image: string,
  mimeType: string,
  headers: string[]
): Promise<ExtractionResult> => {
  const apiKey = import.meta.env.VITE_API_KEY || "";

  if (!apiKey) {
    console.warn("API Key might be missing. Ensure VITE_API_KEY is set in .env.local");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Dynamically build properties for the table row based on headers
  const tableRowProperties: Record<string, any> = {};
  const requiredFields: string[] = [];

  headers.forEach(header => {
    tableRowProperties[header] = { type: Type.STRING };
    requiredFields.push(header);
  });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      document_type_guess: { type: Type.STRING, description: "Guess of the document type" },
      extracted_text: { type: Type.STRING, description: "The narrative text extracted from the document." },
      extracted_table: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: tableRowProperties,
          required: requiredFields,
        },
        description: "The structured list of extracted data mapped to the provided headers."
      },
      warnings: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Any warnings or uncertainties."
      },
    },
    required: ["document_type_guess", "extracted_text", "extracted_table"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `STRICT OCR TASK: Extract data from this document (handwritten or typed).

CRITICAL RULES:
1. TRANSCRIBE ONLY what is ACTUALLY WRITTEN - do NOT invent or hallucinate data
2. Read each cell carefully and transcribe the EXACT text you see
3. If text is illegible, use empty string "" - do NOT make up data
4. Column headers must NEVER appear as cell values - extract actual row data only
5. IMPORTANT - PROPER SPACING: Names like "Ramesh Karki" MUST have space between first and last name. Never merge names like "RameshKarki"
6. For English/Romanized names: Preserve spaces (e.g., "Hari Sharma" not "HariSharma")
7. For Hindi text: Transcribe exactly as written
8. For places: Include full address with proper punctuation and spacing

EXAMPLES OF CORRECT EXTRACTION:
- "Ramesh Karki" ✓ (NOT "RameshKarki" ✗)
- "Lakeside, Pokhara" ✓ (NOT "LakesidePokhara" ✗)
- "Hari Sharma" ✓ (NOT "HariSharma" ✗)

Map extracted data to these headers: ${JSON.stringify(headers)}`,
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    const result = JSON.parse(text) as ExtractionResult;
    return result;

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
