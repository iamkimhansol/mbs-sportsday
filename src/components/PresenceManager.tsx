"use client";

import { useEffect } from "react";
import { doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PresenceManager() {
  useEffect(() => {
    // 세션 ID 생성 (탭별로 고유)
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const presenceRef = doc(db, "presence", sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          lastActive: serverTimestamp(),
        });
      } catch (err) {
        console.error("Presence update failed:", err);
      }
    };

    // 초기 업데이트
    updatePresence();

    // 1분마다 하트비트
    const interval = setInterval(updatePresence, 60 * 1000);

    // 종료 시 삭제 시도
    const cleanup = () => {
      // navigator.sendBeacon은 Firestore SDK와 함께 사용하기 어려우므로 
      // 일반적인 deleteDoc 시도 (항상 보장되지는 않음)
      deleteDoc(presenceRef).catch(() => {});
    };

    window.addEventListener("beforeunload", cleanup);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, []);

  return null;
}
