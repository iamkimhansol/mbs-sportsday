"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Song, getMusicDuration } from "@/lib/music";
import { Trash2, ShieldCheck, LogOut, Loader2, Copy, FileDown, Check, Save, Clock, Calendar, Users, ListMusic, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AppSettings {
  startTime: string;
  endTime: string;
}

export default function AdminPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    startTime: "",
    endTime: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;

    // 1. 노래 목록 가져오기
    const q = query(collection(db, "songs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const songsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Song[];
        setSongs(songsData);
        setLoading(false);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore error:", error);
        setDbError(error.message);
        setLoading(false);
      }
    );

    // 2. 설정 가져오기
    const unsubSettings = onSnapshot(doc(db, "settings", "recommendation"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSettings({
          startTime: data.startTime?.toDate ? data.startTime.toDate().toISOString().slice(0, 16) : "",
          endTime: data.endTime?.toDate ? data.endTime.toDate().toISOString().slice(0, 16) : "",
        });
      }
    });

    // 3. 접속자 수 가져오기 (실시간 반영 개선)
    let lastPresenceDocs: any[] = [];
    const presenceQ = query(collection(db, "presence"));
    
    const calculateOnlineUsers = (docs: any[]) => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const activeUsers = docs.filter(doc => {
        const data = doc.data();
        const lastActive = data.lastActive?.toDate ? data.lastActive.toDate().getTime() : 0;
        return lastActive >= twoMinutesAgo;
      });
      setOnlineUsers(activeUsers.length);
    };

    const unsubPresence = onSnapshot(presenceQ, 
      (snapshot) => {
        lastPresenceDocs = snapshot.docs;
        calculateOnlineUsers(lastPresenceDocs);
      },
      (err) => {
        console.error("Presence listener error:", err);
      }
    );

    // 30초마다 화면상의 접속자 수 다시 계산 (서버 데이터 변경 없어도 시간 경과 반영)
    const presenceInterval = setInterval(() => {
      calculateOnlineUsers(lastPresenceDocs);
    }, 30 * 1000);

    return () => {
      unsubscribe();
      unsubSettings();
      unsubPresence();
      clearInterval(presenceInterval);
    };
  }, [isAuthorized]);

  const totalDurationMillis = songs.reduce((acc, song) => acc + (song.durationMillis || 0), 0);
  const totalMinutes = Math.floor(totalDurationMillis / (1000 * 60));
  const totalSeconds = Math.floor((totalDurationMillis / 1000) % 60);

  const repairData = async () => {
    const songsToRepair = songs.filter(s => !s.durationMillis);
    if (songsToRepair.length === 0) {
      alert("모든 곡의 정보가 이미 정상입니다!");
      return;
    }

    if (!confirm(`${songsToRepair.length}곡의 재생 시간 정보를 불러올까요?`)) return;

    setIsMigrating(true);
    try {
      const batch = writeBatch(db);
      for (const song of songsToRepair) {
        const duration = await getMusicDuration(song.trackId);
        if (duration > 0) {
          batch.update(doc(db, "songs", song.id), { durationMillis: duration });
        }
      }
      await batch.commit();
      alert("데이터 보정이 완료되었습니다!");
    } catch (err) {
      console.error(err);
      alert("보정 중 오류가 발생했습니다.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (password === adminPass && adminPass) {
      setIsAuthorized(true);
      setError("");
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
  };

  const deleteSong = async (id: string) => {
    if (!confirm("이 노래를 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "songs", id));
    } catch (error) {
      console.error("Error deleting song:", error);
    }
  };

  const clearPlaylist = async () => {
    if (!confirm("정말로 모든 노래를 삭제하고 초기화하시겠습니까?")) return;
    try {
      const querySnapshot = await getDocs(collection(db, "songs"));
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, "songs", document.id));
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing playlist:", error);
    }
  };

  const copyToClipboard = () => {
    const text = songs.map(song => `${song.title} - ${song.artist}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const exportToCSV = () => {
    const headers = ["Title", "Artist", "Album"];
    const rows = songs.map(song => [
      `"${song.title.replace(/"/g, '""')}"`,
      `"${song.artist.replace(/"/g, '""')}"`,
      `"${song.album.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `playlist_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "recommendation"), {
        startTime: Timestamp.fromDate(new Date(settings.startTime)),
        endTime: Timestamp.fromDate(new Date(settings.endTime)),
      });
      alert("추천 시간이 성공적으로 저장되었습니다!");
    } catch (err) {
      console.error(err);
      alert("설정 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl mb-4">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">관리자 로그인</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full px-5 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-2 ml-1">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              로그인
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold text-slate-800">관리자 모드</h1>
          </div>
          <button
            onClick={() => setIsAuthorized(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-medium transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Time Settings Section */}
        <section className="bg-white p-8 rounded-[2rem] border border-blue-50 shadow-sm space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">추천 시간 설정 🕒</h3>
              <p className="text-sm text-slate-500 font-medium font-sans">노래 추천을 활성화할 기간을 정해주세요.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Calendar size={14} /> 시작 시간
              </label>
              <input
                type="datetime-local"
                value={settings.startTime}
                onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Calendar size={14} /> 종료 시간
              </label>
              <input
                type="datetime-local"
                value={settings.endTime}
                onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : (
              <>
                <Save size={20} />
                <span>설정 저장하기</span>
              </>
            )}
          </button>
        </section>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">현재 접속자</p>
              <h4 className="text-2xl font-black text-slate-800">{onlineUsers}<span className="text-sm ml-1 text-slate-400 font-bold">명</span></h4>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <ListMusic size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">총 플레이타임</p>
                {songs.some(s => !s.durationMillis) && (
                  <button
                    onClick={repairData}
                    disabled={isMigrating}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded-md transition-all flex items-center gap-1 group/btn"
                    title="재생 시간 정보가 없는 곡 보정하기"
                  >
                    <RefreshCw size={12} className={isMigrating ? "animate-spin" : "group-hover/btn:rotate-180 transition-transform duration-500"} />
                    <span className="text-[10px] font-black">정보 보정</span>
                  </button>
                )}
              </div>
              <h4 className="text-2xl font-black text-slate-800">
                {totalMinutes}<span className="text-sm mx-0.5 text-slate-400 font-bold">분</span> {totalSeconds}<span className="text-sm ml-0.5 text-slate-400 font-bold">초</span>
              </h4>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">추천 목록 관리</h2>
            <p className="text-slate-500">현재 총 {songs.length}곡이 추천되었습니다.</p>
          </div>
          <button
            onClick={clearPlaylist}
            disabled={songs.length === 0}
            className="px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
          >
            플레이리스트 초기화
          </button>
        </div>

        {/* Export Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={copyToClipboard}
            disabled={songs.length === 0}
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all group disabled:opacity-50"
          >
            {copySuccess ? (
              <>
                <Check className="text-green-500" size={20} />
                <span className="font-semibold text-green-500">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="text-slate-400 group-hover:text-blue-500" size={20} />
                <span className="font-semibold">전체 곡 정보 복사</span>
              </>
            )}
          </button>
          <button
            onClick={exportToCSV}
            disabled={songs.length === 0}
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-green-400 hover:text-green-600 transition-all group disabled:opacity-50"
          >
            <FileDown className="text-slate-400 group-hover:text-green-500" size={20} />
            <span className="font-semibold">CSV 파일로 다운로드</span>
          </button>
        </div>

        {dbError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-mono break-all">
            <strong>DB 에러 발생:</strong> {dbError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-300" size={40} />
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {songs.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                추천된 노래가 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <AnimatePresence>
                  {songs.map((song) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, x: 50 }}
                      className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-slate-100">
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 line-clamp-1">{song.title}</h3>
                        <p className="text-sm text-slate-500 truncate">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => deleteSong(song.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
