import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import AuthModal from "../AuthModal";
import UserMenu from "../UserMenu";

const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showAuth, setShowAuth] = useState(false);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center">
                                    <div className="text-white font-bold text-lg">
                                        ♪
                                    </div>
                                </div>
                                <span className="font-bold text-xl text-primary">
                                    Arrangely
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link
                                to="/library"
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                My Library
                            </Link>
                            
                            <Link
                                to="/arrangely-music-lab"
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                Music Lab
                            </Link>

                            <Link
                                to="/sequencer-store"
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                Sequencer
                            </Link>
                            
                            <Link
                                to="/events"
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                Events
                            </Link>

                            <Link
                                to="/creator-dashboard"
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                Creator Hub
                            </Link>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Mobile Menu */}
                            <div className="md:hidden">
                                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Menu className="h-5 w-5" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent
                                        side="right"
                                        className="w-[280px] sm:w-[400px]"
                                    >
                                        <div className="flex flex-col space-y-4 mt-8">
                                            <Link
                                                to="/marketplace"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Marketplace
                                            </Link>
                                            <Link
                                                to="/library"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                My Library
                                            </Link>
                            <Link
                                to="/arrangely-music-lab"
                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                onClick={() => setIsOpen(false)}
                            >
                                Music Lab
                            </Link>
                            <Link
                                to="/sequencer-store"
                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                onClick={() => setIsOpen(false)}
                            >
                                Sequencer
                            </Link>
                            <Link
                                to="/arrangely-music-lab/transactions"
                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                onClick={() => setIsOpen(false)}
                            >
                                My Music Lab Transactions
                            </Link>
                            <Link
                                to="/events"
                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                onClick={() => setIsOpen(false)}
                            >
                                Events
                            </Link>
                                            <Link
                                                to="/my-tickets"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                My Tickets
                                            </Link>
                                            <Link
                                                to="/transactions"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Transactions
                                            </Link>
                                            <Link
                                                to="/features/ai-song-analysis"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Features
                                            </Link>
                                            <Link
                                                to="/pricing"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Pricing
                                            </Link>
                                            <Link
                                                to="/creator-dashboard"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Creator Hub
                                            </Link>
                                            <Link
                                                to="/editor"
                                                className="text-muted-foreground hover:text-primary transition-colors py-2"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Editor
                                            </Link>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {/* Desktop Auth */}
                            <div className="hidden md:flex items-center gap-4">
                                <UserMenu />
                            </div>

                            {/* Mobile Auth */}
                            <div className="md:hidden">
                                <UserMenu />
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
        </>
    );
};
export default Navigation;
