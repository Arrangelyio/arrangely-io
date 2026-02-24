// src/pages/AdminChatPage.tsx

import { useParams } from "react-router-dom";

// Sesuaikan path import ini ke lokasi komponen AdminChatInterface Anda
import { AdminChatInterface } from "@/components/chatbot/AdminChatInterface";

export default function AdminChatPage() {
  // Hook `useParams` akan mengambil parameter dinamis dari URL (:id)
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="container mx-auto p-6 text-center">
        Invalid Conversation ID.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-20">
      {/* Anda bisa menambahkan layout atau header di sini jika perlu */}
      <AdminChatInterface conversationId={id} />
    </div>
  );
}
