/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wind, 
  MapPin, 
  Calendar as CalendarIcon, 
  Navigation, 
  Waves, 
  Sun, 
  Info,
  Loader2,
  ChevronRight,
  Umbrella,
  Search,
  Star,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { getBeachRecommendations, Beach, WindForecast, analyzeSpecificBeach, BeachAnalysis, generateBeachImage } from './lib/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ wind: WindForecast; beaches: Beach[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{ wind: WindForecast; analysis: BeachAnalysis; beachName: string; imageUrl?: string } | null>(null);

  const fetchRecommendations = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const result = await getBeachRecommendations(formattedDate);
      
      // Fetch images for each beach in parallel
      const beachesWithImages = await Promise.all(
        result.beaches.map(async (beach: Beach) => {
          const imageUrl = await generateBeachImage(beach.name, beach.location);
          return { ...beach, imageUrl };
        })
      );
      
      setData({ ...result, beaches: beachesWithImages });
    } catch (err) {
      console.error(err);
      setError("Impossibile recuperare le previsioni. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const result = await analyzeSpecificBeach(searchQuery, formattedDate);
      const imageUrl = await generateBeachImage(searchQuery, "Sardegna");
      setSearchResult({ ...result, beachName: searchQuery, imageUrl });
    } catch (err) {
      console.error(err);
      setError("Errore durante la ricerca della spiaggia.");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(selectedDate);
  }, [selectedDate]);

  const dates = Array.from({ length: 5 }, (_, i) => addDays(new Date(), i));

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-[#E6D5B8]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDFCF8]/80 backdrop-blur-md border-b border-[#1A1A1A]/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white">
              <Waves size={20} />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight">Sardegna Vento</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">Beach Finder</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium opacity-70">
            <a href="#" className="hover:opacity-100 transition-opacity">Mappa</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Venti</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Info</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h2 className="text-5xl md:text-7xl font-serif font-light leading-[0.9] mb-6 tracking-tighter">
              Trova il tuo <span className="italic">rifugio</span> dal vento.
            </h2>
            <p className="text-lg opacity-60 leading-relaxed mb-8">
              Analizziamo le previsioni del vento in tempo reale per consigliarti le calette più calme e riparate della Sardegna.
            </p>

            {/* Date Selector */}
            <div className="flex flex-wrap gap-3 mb-8">
              {dates.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 border",
                      isSelected 
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-lg shadow-[#1A1A1A]/20" 
                        : "bg-white text-[#1A1A1A] border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30"
                    )}
                  >
                    {format(date, 'EEE d MMM', { locale: it })}
                  </button>
                );
              })}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-md group">
              <input
                type="text"
                placeholder="Cerca una spiaggia specifica..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#1A1A1A]/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/5 focus:border-[#1A1A1A]/20 transition-all text-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={18} />
              <button 
                type="submit"
                disabled={searchLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#1A1A1A] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {searchLoading ? <Loader2 className="animate-spin" size={14} /> : "Cerca"}
              </button>
            </form>
          </motion.div>
        </section>

        {/* Search Result Overlay/Section */}
        <AnimatePresence>
          {searchResult && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-16 p-8 bg-[#F5F2ED] rounded-[3rem] border-2 border-[#1A1A1A]/5 relative overflow-hidden"
            >
              <button 
                onClick={() => setSearchResult(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl">
                  <img 
                    src={searchResult.imageUrl} 
                    alt={searchResult.beachName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <h3 className="text-3xl font-serif text-white">{searchResult.beachName}</h3>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={cn(
                      "px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm uppercase tracking-wider",
                      searchResult.analysis.recommendation.toLowerCase().includes('consigliata') 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    )}>
                      {searchResult.analysis.recommendation.toLowerCase().includes('consigliata') ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                      {searchResult.analysis.recommendation}
                    </div>
                    <div className="flex items-center gap-1 bg-white px-4 py-2 rounded-2xl shadow-sm">
                      <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-lg">{searchResult.analysis.score}</span>
                      <span className="text-xs opacity-40 font-bold">/10</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold uppercase tracking-widest opacity-40 mb-3">Analisi dell'esperto</h4>
                  <p className="text-lg leading-relaxed mb-6 italic font-serif">
                    "{searchResult.analysis.reason}"
                  </p>

                  <div className="p-4 bg-white/50 rounded-2xl border border-[#1A1A1A]/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
                      <Wind size={14} />
                      <span>Condizioni Vento</span>
                    </div>
                    <p className="text-sm font-medium">{searchResult.wind.direction} • {searchResult.wind.speed}</p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar: Wind Info */}
          <aside className="lg:col-span-4">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading-wind"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 rounded-3xl bg-[#F5F2ED] border border-[#1A1A1A]/5 flex flex-col items-center justify-center min-h-[300px]"
                >
                  <Loader2 className="animate-spin mb-4 opacity-20" size={32} />
                  <p className="text-sm font-medium opacity-40 uppercase tracking-widest">Analisi venti...</p>
                </motion.div>
              ) : data ? (
                <motion.div
                  key="wind-data"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="sticky top-28"
                >
                  <div className="p-8 rounded-3xl bg-[#1A1A1A] text-white shadow-2xl">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Wind size={20} className="text-[#E6D5B8]" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">Previsione Vento</span>
                    </div>
                    
                    <div className="mb-8">
                      <h3 className="text-4xl font-serif italic mb-2">{data.wind.direction}</h3>
                      <p className="text-sm opacity-60 font-medium">{data.wind.speed}</p>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-sm leading-relaxed opacity-80">
                          {data.wind.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#E6D5B8]">
                        <Info size={14} />
                        <span>Consiglio dell'esperto</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-6 rounded-3xl border border-[#1A1A1A]/10 bg-white">
                    <h4 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-40">Legenda Venti</h4>
                    <div className="grid grid-cols-2 gap-4 text-[11px] font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="opacity-40">Maestrale</span>
                        <span>Nord-Ovest (Fresco)</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="opacity-40">Scirocco</span>
                        <span>Sud-Est (Caldo)</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="opacity-40">Libeccio</span>
                        <span>Sud-Ovest</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="opacity-40">Grecale</span>
                        <span>Nord-Est</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </aside>

          {/* Main List: Beaches */}
          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading-beaches"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-[#F5F2ED] rounded-3xl animate-pulse" />
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  className="p-12 text-center bg-red-50 rounded-3xl border border-red-100"
                >
                  <p className="text-red-600 font-medium">{error}</p>
                  <button 
                    onClick={() => fetchRecommendations(selectedDate)}
                    className="mt-4 text-sm font-bold underline"
                  >
                    Riprova
                  </button>
                </motion.div>
              ) : data ? (
                <motion.div 
                  key="beaches-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.3em] opacity-30">Spiagge Consigliate</h3>
                    <span className="text-[10px] font-bold px-3 py-1 bg-[#F5F2ED] rounded-full uppercase tracking-widest">
                      {data.beaches.length} Risultati
                    </span>
                  </div>

                  {data.beaches.map((beach, index) => (
                    <motion.div
                      key={beach.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative bg-white rounded-[2rem] border border-[#1A1A1A]/5 hover:border-[#1A1A1A]/20 transition-all duration-500 hover:shadow-xl hover:shadow-[#1A1A1A]/5 overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Beach Image */}
                        <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden">
                          <img 
                            src={beach.imageUrl} 
                            alt={beach.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        </div>

                        <div className="flex-1 p-8">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-[#1A1A1A]/40 mb-3">
                                <MapPin size={14} />
                                <span className="text-[11px] font-bold uppercase tracking-widest">{beach.location}</span>
                              </div>
                              <h4 className="text-3xl font-serif mb-4 group-hover:text-[#1A1A1A] transition-colors">{beach.name}</h4>
                              <p className="text-sm leading-relaxed opacity-60 mb-6 max-w-xl">
                                {beach.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F2ED] rounded-xl text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]/70">
                                  <Umbrella size={14} />
                                  <span>{beach.whySheltered}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end justify-between self-stretch">
                              <button className="w-12 h-12 rounded-full border border-[#1A1A1A]/10 flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:text-white transition-all duration-300">
                                <Navigation size={18} />
                              </button>
                              <div className="hidden md:block text-[10px] font-black opacity-5 tracking-tighter leading-none select-none">
                                0{index + 1}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-[#1A1A1A]/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-30">
            <Waves size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Sardegna Vento &copy; 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest opacity-40">
            <a href="#" className="hover:opacity-100 transition-opacity">Privacy</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Termini</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Contatti</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
