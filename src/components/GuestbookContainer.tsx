// src/components/GuestbookContainer.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Post = {
  id: number;
  content: string;
  nickname: string;
  created_at: string;
};

// 1. props에 serverId 추가
export default function GuestbookContainer({ 
  initialPosts, 
  serverId 
}: { 
  initialPosts: Post[], 
  serverId: string 
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  useEffect(() => {
    let currentPosts = initialPosts;

    if (process.env.NODE_ENV === "development") {
      // ▼▼▼ [여기부터 변경됨] 서버 ID 검사 로직 ▼▼▼
      
      const savedServerId = sessionStorage.getItem("last_server_id");
      
      // 1. 저장된 서버 ID와 현재 서버 ID가 다르면? (서버가 재시작되었다는 뜻!)
      if (savedServerId !== serverId) {
        console.log("🔄 서버 재시작 감지! 로컬 데이터를 초기화합니다.");
        sessionStorage.removeItem("my_session_posts"); // 데이터 삭제
        sessionStorage.setItem("last_server_id", serverId!); // 새 ID 저장
      } 
      else {
        // 2. ID가 같으면? (그냥 새로고침 한 것임) -> 데이터 복구
        const savedData = sessionStorage.getItem("my_session_posts");
        if (savedData) {
          const sessionPosts = JSON.parse(savedData);
          currentPosts = [...sessionPosts, ...initialPosts];
        }
      }
    }
    
    setPosts(currentPosts);
  }, [initialPosts, serverId]); // serverId가 바뀌면 실행


  const handleSubmit = async (e: React.FormEvent) => {
    // ... (이 함수 내부는 이전과 100% 동일합니다. 건드릴 필요 없습니다.) ...
    e.preventDefault();
    if (!content || !nickname) return alert("내용을 입력해주세요!");

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      const fakePost = {
        id: Date.now(),
        content: content,
        nickname: nickname,
        created_at: new Date().toISOString(),
      };

      setPosts([fakePost, ...posts]);

      const existingData = sessionStorage.getItem("my_session_posts");
      const existingPosts = existingData ? JSON.parse(existingData) : [];
      
      const newSessionPosts = [fakePost, ...existingPosts];
      sessionStorage.setItem("my_session_posts", JSON.stringify(newSessionPosts));
      
      // ★ 저장할 때 현재 서버 ID도 같이 갱신 (안 해도 되지만 안전하게)
      sessionStorage.setItem("last_server_id", serverId); 

      console.log("개발 모드: 데이터 저장됨");
      setContent("");
      setNickname("");
      return; 
    }
    
    // ... 배포 환경 코드 ...
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
    // ... JSX 코드 동일 ...
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