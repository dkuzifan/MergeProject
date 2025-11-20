// src/app/guestbook/page.tsx
import { supabase } from "@/lib/supabase";
import GuestbookContainer from "@/components/GuestbookContainer"; // 방금 만든 컴포넌트

export default async function GuestbookPage() {
  // 1. 서버에서 데이터를 가져옵니다.
  const { data: guestbookList } = await supabase
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-8 text-center">📝 방명록</h1>
      
      {/* 2. 데이터를 컨테이너에게 넘겨줍니다 (initialPosts) */}
      {/* 만약 데이터가 없으면 빈 배열([])을 넘깁니다 */}
      <GuestbookContainer initialPosts={guestbookList || []} />
    </div>
  );
}