// src/components/GuestbookContainer.tsx
"use client";

import { useState, useEffect } from "react"; // useEffect 추가!
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Post = {
  id: number;
  content: string;
  nickname: string;
  created_at: string;
};

export default function GuestbookContainer({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  // ▼▼▼ 1. [불러오기] 페이지가 처음 뜰 때, 로컬 저장소 확인 ▼▼▼
  useEffect(() => {
    // 개발 환경에서만 실행
    if (process.env.NODE_ENV === "development") {
      // 1. 'my_local_posts'라는 이름으로 저장된 게 있는지 확인
      const savedData = localStorage.getItem("my_local_posts");
      
      if (savedData) {
        const localPosts = JSON.parse(savedData);
        // 2. 서버 데이터(initialPosts) 앞에 로컬 데이터(localPosts)를 합침
        setPosts([...localPosts, ...initialPosts]);
      }
    }
  }, [initialPosts]); // initialPosts가 바뀔 때마다 실행


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !nickname) return alert("내용을 입력해주세요!");

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // ▼▼▼ 2. [저장하기] 가짜 데이터를 로컬 저장소에 넣기 ▼▼▼
      const fakePost = {
        id: Date.now(),
        content: content,
        nickname: nickname,
        created_at: new Date().toISOString(),
      };

      // 화면 업데이트
      setPosts([fakePost, ...posts]);

      // 로컬 스토리지 업데이트
      // 1) 기존에 저장된 거 가져오기
      const existingData = localStorage.getItem("my_local_posts");
      const existingPosts = existingData ? JSON.parse(existingData) : [];
      
      // 2) 새 글을 맨 앞에 추가해서 다시 저장하기
      const newLocalPosts = [fakePost, ...existingPosts];
      localStorage.setItem("my_local_posts", JSON.stringify(newLocalPosts));

      console.log("개발 모드: 로컬 스토리지에 저장됨 (새로고침 해도 유지됨)");

      setContent("");
      setNickname("");
      return;
    }

    // --- 배포 환경 코드는 기존과 동일 ---
    const { error } = await supabase
      .from("guestbook")
      .insert([{ content, nickname }]);

    if (!error) {
      alert("🎉 방명록이 등록되었습니다!");
      setContent("");
      setNickname("");
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
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