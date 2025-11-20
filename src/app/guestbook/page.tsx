// src/app/guestbook/page.tsx
import { supabase } from "@/lib/supabase";
import GuestbookForm from "@/components/GuestbookForm"; // 입력폼 가져오기

// 이 페이지는 서버에서 데이터를 가져오므로 async 컴포넌트입니다.
export default async function GuestbookPage() {
  
  // 1. 데이터 가져오기 (최신순 정렬 추가: .order)
  const { data: guestbookList } = await supabase
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false }); // 최신글이 위로 오게

  return (
    <div className="min-h-screen p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">📝 방명록</h1>

      {/* 2. 글쓰기 폼 (클라이언트 컴포넌트) */}
      <GuestbookForm />

      {/* 3. 글 목록 보여주기 (서버 사이드 렌더링) */}
      <div className="space-y-4">
        {guestbookList?.map((post) => (
          <div
            key={post.id}
            className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700"
          >
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