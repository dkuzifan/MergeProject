// src/app/guestbook/page.tsx
import { supabase } from "@/lib/supabase";
import GuestbookContainer from "@/components/GuestbookContainer";
import { SERVER_ID } from "@/lib/server-id"; // 1. ID 가져오기

export const dynamic = "force-dynamic";

export default async function GuestbookPage() {
  const { data: guestbookList } = await supabase
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-8 text-center">📝 방명록</h1>
      
      {/* 2. serverId를 컴포넌트에게 전달 */}
      <GuestbookContainer 
        initialPosts={guestbookList || []} 
        serverId={SERVER_ID} 
      />
    </div>
  );
}