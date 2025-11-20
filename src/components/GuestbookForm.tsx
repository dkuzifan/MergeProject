// src/components/GuestbookForm.tsx
"use client"; // 1. 클라이언트 컴포넌트 선언

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation"; // 새로고침용

export default function GuestbookForm() {
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 페이지 리로딩 방지
    
    if (!content || !nickname) {
      alert("내용과 닉네임을 모두 입력해주세요!");
      return;
    }

    // 2. Supabase에 데이터 넣기 (INSERT)
    const { error } = await supabase
      .from("guestbook")
      .insert([{ content, nickname }]);

    if (error) {
      console.error(error);
      alert("에러가 발생했습니다.");
    } else {
      // 3. 성공 시 처리
      alert("방명록이 등록되었습니다!");
      setContent(""); // 입력창 비우기
      setNickname("");
      router.refresh(); // ★핵심: 페이지를 새로고침해서 새 글을 바로 보여줌
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="p-2 border rounded w-1/4 dark:bg-gray-700 dark:text-white"
        />
        <input
          type="text"
          placeholder="방명록을 남겨주세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="p-2 border rounded w-3/4 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <button
        type="submit"
        className="bg-green-500 text-white py-2 rounded hover:bg-green-600 transition font-bold"
      >
        등록하기
      </button>
    </form>
  );
}