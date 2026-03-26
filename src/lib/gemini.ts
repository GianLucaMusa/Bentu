import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Beach {
  name: string;
  location: string;
  description: string;
  whySheltered: string;
  imageUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface BeachAnalysis {
  score: number;
  recommendation: string;
  reason: string;
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

export async function generateBeachImage(beachName: string, location: string) {
  const model = "gemini-2.5-flash-image";
  const prompt = `A stunning, high-quality photograph of the beach "${beachName}" in ${location}, Sardinia. Crystal clear turquoise water, white sand, Mediterranean scrub, sunny day, cinematic lighting, professional travel photography.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
  return `https://picsum.photos/seed/${beachName.replace(/\s/g, '')}/800/450`;
}

export async function analyzeSpecificBeach(beachName: string, date: string): Promise<{ wind: WindForecast; analysis: BeachAnalysis }> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Sei un esperto di spiagge della Sardegna. 
  L'utente vuole sapere se la spiaggia "${beachName}" è una buona scelta per il giorno ${date}.
  
  1. Cerca le previsioni del vento in Sardegna per la data ${date}.
  2. Valuta quanto la spiaggia "${beachName}" è riparata da quel vento.
  3. Dai un punteggio da 1 a 10 (1 = pessima, 10 = perfetta).
  4. Fornisci una raccomandazione (Consigliata/Sconsigliata) e spiega il motivo.
  
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
          analysis: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              recommendation: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["score", "recommendation", "reason"]
          }
        },
        required: ["wind", "analysis"]
      }
    }
  });

  return JSON.parse(response.text);
}
