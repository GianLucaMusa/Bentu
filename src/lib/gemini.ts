import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const CACHE_EXPIRATION_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

function getFromCache<T>(key: string): T | null {
  const cached = localStorage.getItem(`beach-cache-${key}`);
  if (!cached) return null;

  try {
    const item: CacheItem<T> = JSON.parse(cached);
    if (Date.now() - item.timestamp > CACHE_EXPIRATION_MS) {
      localStorage.removeItem(`beach-cache-${key}`);
      return null;
    }
    return item.data;
  } catch (e) {
    return null;
  }
}

function saveToCache<T>(key: string, data: T) {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now()
  };
  localStorage.setItem(`beach-cache-${key}`, JSON.stringify(item));
}

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
  const cacheKey = `recommendations-${date}`;
  const cached = getFromCache<{ wind: WindForecast; beaches: Beach[] }>(cacheKey);
  if (cached) return cached;

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

  const result = JSON.parse(response.text);
  saveToCache(cacheKey, result);
  return result;
}

export async function generateBeachImage(beachName: string, location: string) {
  const cacheKey = `image-${beachName.replace(/\s/g, '-')}`;
  const cached = getFromCache<string>(cacheKey);
  if (cached) return cached;

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
        const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        saveToCache(cacheKey, imageUrl);
        return imageUrl;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
  return `https://picsum.photos/seed/${beachName.replace(/\s/g, '')}/800/450`;
}

export async function analyzeSpecificBeach(beachName: string, date: string): Promise<{ wind: WindForecast; analysis: BeachAnalysis }> {
  const cacheKey = `analysis-${beachName.replace(/\s/g, '-')}-${date}`;
  const cached = getFromCache<{ wind: WindForecast; analysis: BeachAnalysis }>(cacheKey);
  if (cached) return cached;

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

  const result = JSON.parse(response.text);
  saveToCache(cacheKey, result);
  return result;
}
