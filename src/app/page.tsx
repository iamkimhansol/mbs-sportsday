"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Music, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AppSettings {
  startTime: any;
  endTime: any;
}

export default function Home() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [timeErrorModal, setTimeErrorModal] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPendingStart, setIsPendingStart] = useState(false);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "recommendation"), (docSnap) => {
      if (docSnap.exists()) {
        const newSettings = docSnap.data() as AppSettings;
        setSettings(newSettings);
        
        // 만약 사용자가 이미 클릭해서 대기 중이라면 즉시 시간 체크 후 입장 시도
        if (isPendingStart) {
          checkTimeAndStart(newSettings);
        }
      }
    });
    return () => unsubSettings();
  }, [isPendingStart]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const checkTimeAndStart = (currentSettings: AppSettings) => {
    const now = new Date();
    const start = currentSettings.startTime?.toDate();
    const end = currentSettings.endTime?.toDate();

    if (start && now < start) {
      const timeStr = start.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      setTimeErrorModal(`아직 추천 기간이 아닙니다!\n추천 시작: ${timeStr}`);
      setIsPendingStart(false); // 팝업이 떴으므로 대기 해제
      return;
    }

    if (end && now > end) {
      setTimeErrorModal("노래 추천 기간이 종료되었습니다.\n참여해주셔서 감사합니다!");
      setIsPendingStart(false);
      return;
    }

    router.push("/recommend");
  };

  const handleStart = () => {
    if (!settings) {
      setIsPendingStart(true); // 대기 상태로 전환
      return;
    }

    checkTimeAndStart(settings);
  };

  return (
    <main className="min-h-screen bg-[#fcfdff] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          {/* Hero / Landing Section */}
          <section className="relative overflow-hidden bg-blue-600 rounded-[2.5rem] p-10 sm:p-14 text-white shadow-2xl shadow-blue-100 w-full">
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                <Music size={18} />
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">2026 명서중학교 체육한마당</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
                  우리가 만드는<br />
                  <span className="text-yellow-200">플레이리스트 🎧</span>
                </h1>
                <p className="text-base sm:text-lg text-blue-50 font-medium leading-relaxed max-w-md opacity-90">
                  체육대회 중 듣고 싶은 노래를<br />자유롭게 추천해 주세요.
                </p>
              </div>

              <div className="bg-yellow-100/95 backdrop-blur-sm rounded-3xl p-6 border border-yellow-200/50 shadow-sm text-yellow-900">
                <ul className="text-sm sm:text-base font-bold space-y-2 list-none leading-snug">
                  <li className="flex gap-2">✨ <span>체육대회를 더욱더 신나게 할 노래를 추천해 주세요!</span></li>
                  <li className="flex gap-2 text-red-600">🚫 <span>19금 노래는 추천하실 수 없습니다.</span></li>
                  <li className="flex gap-2">📻 <span>모든 노래는 방송부의 심의를 거쳐 방송됩니다.</span></li>
                  <li className="flex gap-2">🔏 <span>노래 추천은 익명이며, 추천 횟수에 제한은 없습니다.</span></li>
                </ul>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleStart}
                  disabled={isPendingStart}
                  className="w-full py-5 bg-white text-blue-600 rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-80"
                >
                  {isPendingStart ? (
                    <>
                      <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      불러오는 중...
                    </>
                  ) : (
                    <>
                      노래 추천 하러가기
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 border border-white/10"
                >
                  방송부에 문의하기
                </button>
              </div>
            </div>
          </section>
        </motion.div>
      </AnimatePresence>

      {/* Time Error Modal */}
      <AnimatePresence>
        {timeErrorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTimeErrorModal(null)}
            className="fixed inset-0 w-full h-full bg-slate-900/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border-4 border-yellow-400 space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Clock size={40} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">앗, 잠시만요! 🚧</h3>
                <div className="text-slate-600 font-bold whitespace-pre-line leading-relaxed">
                  {timeErrorModal}
                </div>
              </div>
              <button
                onClick={() => setTimeErrorModal(null)}
                className="w-full py-4 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-lg hover:bg-yellow-500 transition-all active:scale-95"
              >
                확인했습니다
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 w-full h-full bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-blue-50 space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-2 rotate-3 shadow-sm">
                <Music size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">도움이 필요한가요? 📡</h3>
              <p className="text-slate-500 text-sm font-medium">방송부 MSB가 친절하게 안내해 드릴게요.</p>
              
              <div className="space-y-3">
                <a href="https://www.instagram.com/ms_broadcast" target="_blank" className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl">
                  <div className="p-3 bg-white rounded-xl text-blue-600"><Music size={20} /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-blue-400 uppercase">Instagram</p>
                    <p className="text-sm font-bold text-slate-800">방송부 인스타그램</p>
                  </div>
                </a>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
              >
                확인했어요
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
