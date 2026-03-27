import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Request Limiter to stay within 15 requests per minute
class RequestLimiter {
  private requests: number[] = [];
  private readonly LIMIT = 14; // Slightly below 15 for safety
  private readonly WINDOW_MS = 60 * 1000;

  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < this.WINDOW_MS);
    
    if (this.requests.length >= this.LIMIT) {
      const oldest = this.requests[0];
      const waitTime = this.WINDOW_MS - (now - oldest);
      isRateLimited = true;
      console.warn(`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      isRateLimited = false;
      return this.checkLimit();
    }
    
    this.requests.push(now);
  }
}

const limiter = new RequestLimiter();

export let isRateLimited = false;

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours for forecast data

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

  await limiter.checkLimit();
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
  // Optimization: Use a high-quality placeholder by default to save API quota.
  // This is a zero-cost operation (no API calls).
  return `https://picsum.photos/seed/${beachName.replace(/\s/g, '')}/800/450`;
}

export async function analyzeSpecificBeach(beachName: string, date: string): Promise<{ wind: WindForecast; analysis: BeachAnalysis }> {
  const cacheKey = `analysis-${beachName.replace(/\s/g, '-')}-${date}`;
  const cached = getFromCache<{ wind: WindForecast; analysis: BeachAnalysis }>(cacheKey);
  if (cached) return cached;

  await limiter.checkLimit();
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
