"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { searchMusic, MusicTrack, Song } from "@/lib/music";
import SearchSection from "@/components/SearchSection";
import PlaylistSection from "@/components/PlaylistSection";
import { Music, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AppSettings {
  startTime: any;
  endTime: any;
}

export default function RecommendPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. 설정 가져오기 및 시간 체크
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "recommendation"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setSettings(data);
        
        const now = new Date();
        const start = data.startTime?.toDate();
        const end = data.endTime?.toDate();

        // 기간이 아니면 홈으로 강제 이동
        if ((start && now < start) || (end && now > end)) {
          router.replace("/");
        } else {
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true); // 설정이 없으면 일단 허용
      }
    });
    return () => unsubSettings();
  }, [router]);

  // 2. 노래 목록 가져오기
  useEffect(() => {
    const q = query(collection(db, "songs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Song[];
      setSongs(songsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const addSong = async (track: MusicTrack) => {
    const isDuplicate = songs.some((song) => song.trackId === track.trackId);
    if (isDuplicate) {
      showMessage("이미 추가된 노래입니다!", "error");
      return;
    }

    try {
      await addDoc(collection(db, "songs"), {
        ...track,
        createdAt: serverTimestamp(),
      });
      showMessage("노래가 추천되었습니다!", "success");
    } catch (error) {
      console.error(error);
      showMessage("추천 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <main className="min-h-screen bg-[#fcfdff]">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-[100] h-16 shadow-sm">
        <div className="max-w-2xl mx-auto h-full px-4 flex items-center justify-between">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-bold text-sm">처음으로</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Music size={16} strokeWidth={2.5} />
            </div>
            <span className="font-black text-slate-800 tracking-tight">노래 추천페이지</span>
          </div>
          <div className="w-20"></div> {/* Spacer for balance */}
        </div>
      </nav>

      {!isInitialized ? (
        <div className="pt-32 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">설정을 불러오는 중...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-12"
        >
          <section className="space-y-6">
            <div className="px-1">
              <h2 className="text-2xl font-black text-slate-800 mb-2">노래 찾기 🔍</h2>
              <p className="text-sm text-slate-500 font-medium">플레이리스트에 추가할 곡을 검색해 보세요.</p>
            </div>
            <SearchSection onAddSong={addSong} />
          </section>

          <section>
            <PlaylistSection songs={songs} loading={loading} />
          </section>
        </motion.div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-white font-black text-sm z-[200] ${
              message.type === "success" ? "bg-blue-600" : "bg-red-500"
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
