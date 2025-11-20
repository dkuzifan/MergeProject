// src/components/GuestbookContainer.tsx
"use client"; // 클라이언트(브라우저)에서 상태를 관리해야 함

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// 데이터 타입 정의 (TypeScript가 좋아합니다)
type Post = {
  id: number;
  content: string;
  nickname: string;
  created_at: string;
};

// 부모(서버)에게서 초기 데이터를 물려받습니다
export default function GuestbookContainer({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts); // 화면에 보여줄 목록
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !nickname) return alert("내용을 입력해주세요!");

    // ▼▼▼ [핵심 로직: 환경 분리] ▼▼▼
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // 1. 개발 환경: 가짜 데이터를 만들어서 목록(State)에 강제로 끼워 넣음
      const fakePost = {
        id: Date.now(), // 임시 ID
        content: content,
        nickname: nickname,
        created_at: new Date().toISOString(), // 현재 시간
      };

      // "기존 목록 앞에 가짜 데이터를 붙여라!"
      setPosts([fakePost, ...posts]); 
      
      alert("🛠️ [개발 모드] 화면에만 추가되었습니다. (DB 저장 X)");
      setContent("");
      setNickname("");
      return; // 여기서 끝! DB 요청 안 함.
    }
    // ▲▲▲ [여기까지가 모킹(Mocking)] ▲▲▲


    // 2. 배포 환경: 실제로 DB에 저장
    const { error } = await supabase
      .from("guestbook")
      .insert([{ content, nickname }]);

    if (!error) {
      alert("🎉 방명록이 등록되었습니다!");
      setContent("");
      setNickname("");
      router.refresh(); // 서버 데이터를 다시 불러옴
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 입력 폼 */}
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
        <button type="submit" className="bg-green-500 text-white py-2 rounded hover:bg-green-600 transition font-bold">
          등록하기
        </button>
      </form>

      {/* 글 목록 (여기서 posts 상태를 보여줍니다) */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
            <p className="text-lg mb-2">{post.content}</p>
            <div className="text-sm text-gray-500 text-right">
              by {post.nickname} ({new Date(post.created_at).toLocaleDateString()})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}