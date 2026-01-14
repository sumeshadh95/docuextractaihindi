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
      model: "gemini-2.0-flash-lite",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Extract data and map it to these headers: ${JSON.stringify(headers)}. Follow system instructions.`,
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
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
