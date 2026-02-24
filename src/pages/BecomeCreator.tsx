import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Crown, Users, Music, Youtube, Instagram, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const INSTRUMENTS = [
    "Guitar",
    "Piano",
    "Drums",
    "Bass",
    "Violin",
    "Cello",
    "Flute",
    "Trumpet",
    "Saxophone",
    "Clarinet",
    "Banjo",
    "Harmonica",
    "Mandolin",
    "Vocals",
    "Ukulele",
    "Other",
];

const BecomeCreator = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        experience_years: "",
        musical_background: "",
        instruments: [] as string[],
        motivation: "",
        youtube_url: "",
        instagram_url: "",
        tiktok_url: "",
    });
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user?.email) {
                setFormData((prev) => ({ ...prev, email: user.email! }));
            }
        };
        fetchUser();
    }, []);

    const toggleInstrument = (instrument: string) => {
        setFormData((prev) => ({
            ...prev,
            instruments: prev.instruments.includes(instrument)
                ? prev.instruments.filter((i) => i !== instrument)
                : [...prev.instruments, instrument],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !formData.full_name ||
            !formData.email ||
            !formData.musical_background
        ) {
            toast({
                title: "Required fields missing",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        if (formData.musical_background.length < 50) {
            toast({
                title: "Musical background too short",
                description:
                    "Please provide at least 50 characters describing your musical experience",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Authentication required",
                    variant: "destructive",
                });
                navigate("/auth");
                return;
            }

            const { data: existingApplication } = await supabase
                .from("creator_applications")
                .select("id, status")
                .eq("user_id", user.id)
                .maybeSingle();

            if (existingApplication) {
                toast({
                    title: "Application already exists",
                    description: `You already have a ${existingApplication.status} application.`,
                    variant: "destructive",
                });
                return;
            }

            const { error: dbError } = await supabase
                .from("creator_applications")
                .insert({
                    user_id: user.id,
                    full_name: formData.full_name,
                    email: formData.email,
                    experience_years: formData.experience_years
                        ? parseInt(formData.experience_years)
                        : null,
                    musical_background: formData.musical_background,
                    instruments: formData.instruments,
                    motivation: formData.motivation || null,
                    status: "pending",
                    sample_work_url_1: formData.youtube_url,
                    sample_work_url_2: formData.instagram_url,
                    sample_work_url_3: formData.tiktok_url,
                });

            if (dbError) throw dbError;

            toast({
                title: "Application submitted!",
                description:
                    "We'll review your application and get back to you soon.",
            });

            setTimeout(() => navigate("/"), 1500);
        } catch (error) {
            console.error("Error submitting application:", error);
            toast({
                title: "Error",
                description: "Failed to submit application. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto mt-12 px-4 py-12">
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="h-6 w-6 text-primary" />
                            <CardTitle className="text-3xl">
                                Arranger Application
                            </CardTitle>
                        </div>
                        <CardDescription className="text-base">
                            Join our community of talented arrangers and share
                            your musical expertise with others.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* 1. Personal Information Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="h-5 w-5 text-primary" />
                                    <h3 className="text-xl font-semibold">
                                        Personal Information
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">
                                            Full Name{" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    full_name: e.target.value,
                                                })
                                            }
                                            placeholder="Your full name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">
                                            Email Address{" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            placeholder="edo.alfiyanus24@gmail.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="experience_years">
                                        Years of Musical Experience
                                    </Label>
                                    <Input
                                        id="experience_years"
                                        type="number"
                                        min="0"
                                        value={formData.experience_years}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                experience_years:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="e.g. 5"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        How many years have you been involved in
                                        music?
                                    </p>
                                </div>
                            </div>

                            {/* 2. Musical Background Section */}
                            <div className="space-y-6 pt-4 border-t">
                                <div className="flex items-center gap-2 mb-4">
                                    <Music className="h-5 w-5 text-primary" />
                                    <h3 className="text-xl font-semibold">
                                        Musical Background
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="musical_background">
                                        Musical Background & Experience{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Textarea
                                        id="musical_background"
                                        value={formData.musical_background}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                musical_background:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="Tell us about your musical journey, training, performance experience, and accomplishments..."
                                        rows={6}
                                        required
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Minimum 50 characters - be detailed
                                        about your musical experience
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Label>
                                        Instruments You Play{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Select all that apply
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {INSTRUMENTS.map((instrument) => (
                                            <div
                                                key={instrument}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={instrument}
                                                    checked={formData.instruments.includes(
                                                        instrument
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleInstrument(
                                                            instrument
                                                        )
                                                    }
                                                />
                                                <Label
                                                    htmlFor={instrument}
                                                    className="text-sm font-normal cursor-pointer"
                                                >
                                                    {instrument}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Portfolio Samples Section (YouTube, Instagram, TikTok) */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center gap-2 mb-4">
                                    <Video className="h-5 w-5 text-primary" />
                                    <h3 className="text-xl font-semibold">
                                        Portfolio Samples
                                    </h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Please provide links to your musical
                                    arrangements or performances on these
                                    platforms.
                                </p>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="youtube"
                                            className="flex items-center gap-2"
                                        >
                                            <Youtube className="h-4 w-4 text-red-600" />{" "}
                                            YouTube URL
                                        </Label>
                                        <Input
                                            id="youtube"
                                            type="url"
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={formData.youtube_url}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    youtube_url: e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="instagram"
                                            className="flex items-center gap-2"
                                        >
                                            <Instagram className="h-4 w-4 text-pink-600" />{" "}
                                            Instagram URL
                                        </Label>
                                        <Input
                                            id="instagram"
                                            type="url"
                                            placeholder="https://instagram.com/reels/..."
                                            value={formData.instagram_url}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    instagram_url:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="tiktok"
                                            className="flex items-center gap-2"
                                        >
                                            <Music className="h-4 w-4 text-black" />{" "}
                                            TikTok URL
                                        </Label>
                                        <Input
                                            id="tiktok"
                                            type="url"
                                            placeholder="https://tiktok.com/@user/video/..."
                                            value={formData.tiktok_url}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    tiktok_url: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Motivation Section */}
                            <div className="space-y-4 pt-4 border-t">
                                <Label
                                    htmlFor="motivation"
                                    className="text-lg font-semibold"
                                >
                                    Why do you want to become an arranger?
                                </Label>
                                <Textarea
                                    id="motivation"
                                    value={formData.motivation}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            motivation: e.target.value,
                                        })
                                    }
                                    placeholder="Tell us what motivates you to share your arrangements..."
                                    rows={4}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading
                                        ? "Submitting..."
                                        : "Submit Application"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BecomeCreator;
