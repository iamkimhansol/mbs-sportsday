"use client";

import { useState, useRef } from "react";
import { Search, Loader2, Plus, Play, Pause } from "lucide-react";
import { searchMusic, MusicTrack } from "@/lib/music";
import { motion, AnimatePresence } from "framer-motion";

interface SearchSectionProps {
  onAddSong: (track: MusicTrack) => void;
}

export default function SearchSection({ onAddSong }: SearchSectionProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (url: string, id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(id);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setShowAll(false);
    const data = await searchMusic(query);
    setResults(data);
    setIsSearching(false);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="가수나 제목을 입력하세요..."
          className="w-full px-6 py-4.5 pl-14 bg-white rounded-3xl border-2 border-slate-100 shadow-xl shadow-slate-100/50 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-3 top-2 bottom-2 px-5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="animate-spin" size={20} /> : "검색"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {(showAll ? results : results.slice(0, 3)).map((track, index) => (
            <motion.div
              key={track.trackId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-blue-600 transition-colors">{track.title}</h3>
                  {track.isExplicit && (
                    <span className="flex-shrink-0 bg-red-400 text-white text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-sm shadow-sm" title="19세 미만 청취 불가">
                      19
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 font-medium truncate">{track.artist}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 truncate">{track.album}</p>
              </div>
              <div className="flex items-center gap-2 pr-1">
                {track.previewUrl && (
                  <button
                    onClick={() => togglePreview(track.previewUrl, track.trackId)}
                    className={`p-3 rounded-full transition-all flex-shrink-0 shadow-sm ${
                      playingId === track.trackId 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                    }`}
                    title="미리듣기"
                  >
                    {playingId === track.trackId ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                )}
                <button
                  onClick={() => onAddSong(track)}
                  className="p-3 bg-yellow-50 text-yellow-600 rounded-full hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-100 transition-all flex-shrink-0"
                  title="추가하기"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {results.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold text-sm hover:bg-blue-100 transition-all mt-2 active:scale-[0.98]"
        >
          검색 결과 {results.length - 3}개 더보기
        </button>
      )}

      {results.length === 0 && !isSearching && query && (
        <p className="text-center text-slate-400 py-8">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}
