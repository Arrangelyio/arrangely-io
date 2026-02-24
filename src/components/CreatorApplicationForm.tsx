import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Crown, Loader2, Music, Users, Upload, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const creatorApplicationSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    musicalBackground: z
        .string()
        .min(
            50,
            "Please provide more details about your musical background (minimum 50 characters)"
        ),
    experienceYears: z.number().min(0).max(50).optional(),
    instruments: z
        .array(z.string())
        .min(1, "Please select at least one instrument"),
    specialties: z
        .array(z.string())
        .min(1, "Please select at least one specialty"),
    sampleWorkUrl: z
        .string()
        .url("Please enter a valid URL")
        .optional()
        .or(z.literal("")),
    motivation: z
        .string()
        .min(
            50,
            "Please tell us more about your motivation (minimum 50 characters)"
        ),
    socialLinks: z
        .object({
            youtube: z.string().optional(),
            instagram: z.string().optional(),
            facebook: z.string().optional(),
            website: z.string().optional(),
        })
        .optional(),
});

type CreatorApplicationForm = z.infer<typeof creatorApplicationSchema>;

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
    "Vocals",
    "Ukulele",
    "Mandolin",
    "Banjo",
    "Harmonica",
    "Other",
];

const SPECIALTIES = [
    "Contemporary Music",
    "Classical Music",
    "Jazz",
    "Pop Music",
    "Rock Music",
    "Folk Music",
    "World Music",
    "Children's Music",
    "Choir Arrangements",
    "Solo Performance",
    "Band Leadership",
    "Music Education",
    "Songwriting",
    "Music Production",
    "Sound Engineering",
    "Other",
];

interface CreatorApplicationFormProps {
    onClose: () => void;
}

export const CreatorApplicationForm = ({
    onClose,
}: CreatorApplicationFormProps) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const form = useForm<CreatorApplicationForm>({
        resolver: zodResolver(creatorApplicationSchema),
        defaultValues: {
            fullName: "",
            email: "",
            musicalBackground: "",
            experienceYears: undefined,
            instruments: [],
            specialties: [],
            sampleWorkUrl: "",
            motivation: "",
            socialLinks: {
                youtube: "",
                instagram: "",
                facebook: "",
                website: "",
            },
        },
    });

    // Get current user on component mount
    useState(() => {
        const getCurrentUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setCurrentUser(user);

            if (user) {
                // Pre-fill email from auth
                form.setValue("email", user.email || "");

                // Try to get display name from profile
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("user_id", user.id)
                    .single();

                if (profile && 'display_name' in profile && profile.display_name) {
                    form.setValue("fullName", String(profile.display_name));
                }
            }
        };
        getCurrentUser();
    });

    const onSubmit = async (data: CreatorApplicationForm) => {
        if (!currentUser) {
            toast({
                title: "Authentication Required",
                description: "Please log in to submit your application",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);

            // Check if user already has a pending application
            const { data: existingApp } = await supabase
                .from("creator_applications")
                .select("id, status")
                .eq("user_id", currentUser.id)
                .single();

            if (existingApp && 'status' in existingApp) {
                toast({
                    title: "Application Already Submitted",
                    description: `You already have a ${existingApp.status} application. Please wait for admin review.`,
                    variant: "destructive",
                });
                return;
            }

            // Submit the application
            const { error } = await supabase
                .from("creator_applications")
                .insert({
                    user_id: currentUser.id,
                    full_name: data.fullName,
                    email: data.email,
                    musical_background: data.musicalBackground,
                    experience_years: data.experienceYears,
                    instruments: data.instruments,
                    specialties: data.specialties,
                    sample_work_url: data.sampleWorkUrl || null,
                    motivation: data.motivation,
                    social_links: data.socialLinks,
                });

            if (error) {
                throw error;
            }

            toast({
                title: "Application Submitted Successfully! 🎉",
                description:
                    "Your creator application has been submitted for review. We'll notify you once it's approved.",
            });

            onClose();
            navigate("/admin/creators");
        } catch (error) {
            console.error("Error submitting application:", error);
            toast({
                title: "Submission Failed",
                description:
                    "There was an error submitting your application. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInstrumentChange = (instrument: string, checked: boolean) => {
        const currentInstruments = form.getValues("instruments");
        if (checked) {
            form.setValue("instruments", [...currentInstruments, instrument]);
        } else {
            form.setValue(
                "instruments",
                currentInstruments.filter((i) => i !== instrument)
            );
        }
    };

    const handleSpecialtyChange = (specialty: string, checked: boolean) => {
        const currentSpecialties = form.getValues("specialties");
        if (checked) {
            form.setValue("specialties", [...currentSpecialties, specialty]);
        } else {
            form.setValue(
                "specialties",
                currentSpecialties.filter((s) => s !== specialty)
            );
        }
    };

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <Crown className="h-6 w-6 text-purple-600" />
                    Arranger Application
                </DialogTitle>
            </DialogHeader>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    {/* Personal Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold">
                                Personal Information
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Your full name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="your.email@example.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="experienceYears"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Years of Musical Experience
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 5"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value
                                                        ? parseInt(
                                                              e.target.value
                                                          )
                                                        : undefined
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        How many years have you been involved in
                                        music?
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Musical Background */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Music className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold">
                                Musical Background
                            </h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="musicalBackground"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Musical Background & Experience *
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Tell us about your musical journey, training, performance experience, and accomplishments..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Minimum 50 characters - be detailed
                                        about your musical experience
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="instruments"
                            render={() => (
                                <FormItem>
                                    <FormLabel>
                                        Instruments You Play *
                                    </FormLabel>
                                    <FormDescription>
                                        Select all that apply
                                    </FormDescription>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                        {INSTRUMENTS.map((instrument) => (
                                            <div
                                                key={instrument}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={instrument}
                                                    checked={form
                                                        .watch("instruments")
                                                        .includes(instrument)}
                                                    onCheckedChange={(
                                                        checked
                                                    ) =>
                                                        handleInstrumentChange(
                                                            instrument,
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor={instrument}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {instrument}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="specialties"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Musical Specialties *</FormLabel>
                                    <FormDescription>
                                        What styles of music do you specialize
                                        in?
                                    </FormDescription>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                        {SPECIALTIES.map((specialty) => (
                                            <div
                                                key={specialty}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={specialty}
                                                    checked={form
                                                        .watch("specialties")
                                                        .includes(specialty)}
                                                    onCheckedChange={(
                                                        checked
                                                    ) =>
                                                        handleSpecialtyChange(
                                                            specialty,
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor={specialty}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {specialty}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Portfolio & Motivation */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Upload className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold">
                                Portfolio & Motivation
                            </h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="sampleWorkUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sample Work URL</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://youtube.com/watch?v=... or https://soundcloud.com/..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Optional: Share a link to your best
                                        musical arrangement or performance
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="motivation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Why do you want to become a creator? *
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Share your passion for music ministry and how you want to help the community through your arrangements..."
                                            className="min-h-[120px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Minimum 50 characters - tell us your
                                        story and motivation
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Link2 className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold">
                                Social Links (Optional)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="socialLinks.youtube"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>YouTube Channel</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://youtube.com/@yourchannel"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="socialLinks.instagram"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Instagram</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://instagram.com/yourprofile"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="socialLinks.facebook"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Facebook</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://facebook.com/yourpage"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="socialLinks.website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Website</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://yourwebsite.com"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Crown className="mr-2 h-4 w-4" />
                                    Submit Application
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </DialogContent>
    );
};
