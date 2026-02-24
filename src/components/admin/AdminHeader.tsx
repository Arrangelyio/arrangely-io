import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

const AdminHeader = ({ onToggleSidebar }: AdminHeaderProps) => {
  const { user } = useUserRole();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="text-sm"
        >
          View Site
        </Button>

        <Avatar>
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default AdminHeader;