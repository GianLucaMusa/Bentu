import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Beach {
  name: string;
  location: string;
  description: string;
  whySheltered: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface WindForecast {
  direction: string;
  speed: string;
  description: string;
}

export async function getBeachRecommendations(date: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Sei un esperto di spiagge della Sardegna. 
  Oggi è il ${new Date().toLocaleDateString('it-IT')}. 
  L'utente vuole sapere quali sono le spiagge più riparate per il giorno ${date}.
  
  1. Cerca le previsioni del vento in Sardegna per la data ${date} (Maestrale, Scirocco, etc.).
  2. Identifica le 5-6 spiagge migliori che sarebbero riparate da quel vento specifico.
  3. Fornisci una descrizione per ognuna e spiega perché è riparata.
  
  Ritorna i dati in formato JSON.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          wind: {
            type: Type.OBJECT,
            properties: {
              direction: { type: Type.STRING },
              speed: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["direction", "speed", "description"]
          },
          beaches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                location: { type: Type.STRING },
                description: { type: Type.STRING },
                whySheltered: { type: Type.STRING }
              },
              required: ["name", "location", "description", "whySheltered"]
            }
          }
        },
        required: ["wind", "beaches"]
      }
    }
  });

  return JSON.parse(response.text);
}
