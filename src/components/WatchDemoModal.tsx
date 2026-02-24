import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayCircle, X } from "lucide-react";

interface WatchDemoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WatchDemoModal = ({ isOpen, onClose }: WatchDemoModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-4xl p-0"
                aria-describedby="demo-description"
            >
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                        <PlayCircle className="h-6 w-6" />
                        Arrangely Demo
                    </DialogTitle>
                    <p id="demo-description" className="text-muted-foreground">
                        See how Arrangely transforms your Arrange preparation
                        workflow
                    </p>
                </DialogHeader>

                <div className="px-6 pb-6">
                    {/* Video Container */}
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                        {/* Placeholder for demo video */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <div className="text-center text-white">
                                <PlayCircle className="h-20 w-20 mx-auto mb-4 opacity-80" />
                                <h3 className="text-2xl font-semibold mb-2">
                                    Demo Video
                                </h3>
                                <p className="text-lg opacity-90">
                                    Complete walkthrough of WorshipFlow features
                                </p>
                                <Button
                                    disabled
                                    className="mt-4 bg-white text-primary hover:bg-white/90"
                                    onClick={() => {
                                        // In real implementation, this would start the video
                                        
                                    }}
                                >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Play Demo (5:30)
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Demo Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-primary">
                                What you'll see:
                            </h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>
                                    • powered chord detection from YouTube
                                </li>
                                <li>• Real-time team collaboration</li>
                                <li>• Instant transposition tools</li>
                                <li>• Mobile-optimized interface</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-primary">
                                Perfect for:
                            </h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>• Worship leaders & music directors</li>
                                <li>• Church musicians & pianists</li>
                                <li>• Small to large worship teams</li>
                                <li>• Multi-campus churches</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button className="flex-1 bg-gradient-worship hover:opacity-90">
                            Start Free Trial
                        </Button>
                        <Button variant="outline" className="flex-1">
                            Schedule Personal Demo
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WatchDemoModal;
