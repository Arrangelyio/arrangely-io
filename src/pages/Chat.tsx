import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatInterface } from "@/components/chatbot/ChatInterface";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { User } from "@supabase/supabase-js";
import AuthGuard from "@/components/AuthGuard";

const Chat = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
                <div className="text-center">
                    <MessageSquare className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-gradient-sanctuary pt-14">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Arrangely Support Chat
                        </h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Get instant help with creating arrangements, using
                            features, collaboration, and more. Our AI assistant
                            is here to guide you through Arrangely's
                            capabilities.
                        </p>
                    </div>

                    {user && <ChatInterface user={user} />}
                </div>
            </div>
        </AuthGuard>
    );
};

export default Chat;
