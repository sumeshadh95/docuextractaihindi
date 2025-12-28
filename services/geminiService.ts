import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { ExtractionResult } from "../types";

export const extractDataFromImage = async (base64Image: string, mimeType: string): Promise<ExtractionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      document_type_guess: { type: Type.STRING, description: "Guess of the document type (e.g., 'list_only', 'mixed', 'text_only')" },
      extracted_text: { type: Type.STRING, description: "The narrative text extracted from the document." },
      extracted_table: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            Name: { type: Type.STRING },
            Address: { type: Type.STRING },
            Phone: { type: Type.STRING },
            Email: { type: Type.STRING },
            Organization: { type: Type.STRING },
            Notes: { type: Type.STRING },
          },
          required: ["Name", "Address", "Phone", "Email", "Organization", "Notes"],
        },
        description: "The structured list of people/contacts found in the document."
      },
      warnings: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Any warnings or uncertainties during extraction."
      },
    },
    required: ["document_type_guess", "extracted_text", "extracted_table"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Using Flash for speed, switch to pro if needed for complex layout
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract data from this image following the system instructions.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, // Low temperature for more deterministic extraction
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
