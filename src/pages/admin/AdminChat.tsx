import { AdminChatDashboard } from "@/components/chatbot/AdminChatDashboard";
import RoleGuard from "@/components/RoleGuard";

const AdminChat = () => {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gradient-sanctuary flex">
        {/* Main Content */}
        <div className="flex-1">
          <main className="p-6 md:p-12">
            <AdminChatDashboard />
          </main>
        </div>
      </div>
    </RoleGuard>
  );
};

export default AdminChat;
