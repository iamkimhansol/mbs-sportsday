"use client";

import { useState, useRef, useEffect } from "react";
import { Song } from "@/lib/music";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Loader2, Play, Pause, ChevronUp, ChevronDown } from "lucide-react";

interface PlaylistSectionProps {
  songs: Song[];
  loading: boolean;
}

export default function PlaylistSection({ songs, loading }: PlaylistSectionProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isAscending, setIsAscending] = useState(false); // 최신순 기본 설정
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

  if (loading && songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Music2 className="text-slate-300" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-1">플레이리스트가 비어있습니다</h3>
        <p className="text-slate-400">첫 번째 노래를 추천해 보세요!</p>
      </div>
    );
  }

  const sortedSongs = isAscending ? [...songs].reverse() : [...songs];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5 flex items-center gap-2">
            플레이리스트 <span className="text-2xl">🎧</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium">우리 학교 학생들의 추천 곡 ({songs.length}개)</p>
        </div>
        <button
          onClick={() => setIsAscending(!isAscending)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-100 px-3 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex-shrink-0 mb-1"
        >
          {isAscending ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isAscending ? "오래된 순" : "최신 순"}
        </button>
      </div>

      <div className="space-y-3.5">
        <AnimatePresence initial={false} mode="popLayout">
          {sortedSongs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
              transition={{
                layout: { duration: 0.4, type: "spring", stiffness: 100, damping: 20 },
                opacity: { duration: 0.2 }
              }}
              className="flex items-center gap-4 bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-shadow group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-400 font-black text-sm group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                {isAscending ? index + 1 : songs.length - index}
              </div>
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-blue-600 transition-colors">{song.title}</h3>
                <p className="text-sm text-slate-500 font-medium truncate">{song.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                {song.previewUrl && (
                  <button
                    onClick={() => togglePreview(song.previewUrl, song.id)}
                    className={`p-3 rounded-full transition-all shadow-sm ${
                      playingId === song.id ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                    }`}
                    title="미리듣기"
                  >
                    {playingId === song.id ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

