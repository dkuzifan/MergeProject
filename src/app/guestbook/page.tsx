// src/app/guestbook/page.tsx
import { supabase } from "@/lib/supabase";
import GuestbookContainer from "@/components/GuestbookContainer";

// ▼▼▼ [이 줄을 추가하세요!] ▼▼▼
export const dynamic = "force-dynamic"; 
// 뜻: "강제로(force) 다이내믹하게(dynamic) 처리해라 = 캐시하지 마라"

export default async function GuestbookPage() {
  const { data: guestbookList } = await supabase
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-8 text-center">📝 방명록</h1>
      
      <GuestbookContainer initialPosts={guestbookList || []} />
    </div>
  );
}