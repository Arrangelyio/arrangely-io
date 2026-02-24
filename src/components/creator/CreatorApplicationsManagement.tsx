import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    Music,
    User,
    Calendar,
    Mail,
    Globe,
    Star,
    Users,
    Crown,
    ExternalLink,
    MessageCircle,
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CreatorApplication {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    musical_background: string;
    experience_years?: number;
    instruments: string[];
    specialties: string[] | null; // Tambahkan | null
    motivation: string;
    sample_work_url_1?: string;
    sample_work_url_2?: string;
    sample_work_url_3?: string;
    social_links?: any;
    status: string;
    admin_notes?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    created_at: string;
    updated_at: string;
}

// Helper functions
const getStatusIcon = (status: string) => {
    switch (status) {
        case "pending":
            return <Clock className="h-4 w-4 text-yellow-600" />;
        case "approved":
            return <CheckCircle className="h-4 w-4 text-green-600" />;
        case "rejected":
            return <XCircle className="h-4 w-4 text-red-600" />;
        default:
            return <FileText className="h-4 w-4" />;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case "pending":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "approved":
            return "bg-green-100 text-green-800 border-green-200";
        case "rejected":
            return "bg-red-100 text-red-800 border-red-200";
        default:
            return "bg-gray-100 text-gray-800 border-gray-200";
    }
};

const CreatorApplicationsManagement = () => {
    const { toast } = useToast();
    const [applications, setApplications] = useState<CreatorApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplication, setSelectedApplication] =
        useState<CreatorApplication | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchApplications();
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("creator_applications")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            setApplications(data || []);
        } catch (error) {
            console.error("Error fetching applications:", error);
            toast({
                title: "Error",
                description: "Failed to load creator applications",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApplicationAction = async (
        applicationId: string,
        status: "approved" | "rejected",
        notes?: string
    ) => {
        try {
            const { error } = await supabase
                .from("creator_applications")
                .update({
                    status,
                    admin_notes: notes,
                    reviewed_by: currentUser?.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq("id", applicationId);

            if (error) {
                throw error;
            }

            // If approved, update user role to creator
            if (status === "approved") {
                const application = applications.find(
                    (app) => app.id === applicationId
                );
                if (application) {
                    const { error: profileError } = await supabase
                        .from("profiles")
                        .update({ role: "creator" })
                        .eq("user_id", application.user_id);

                    if (profileError) {
                        console.error(
                            "Error updating profile role:",
                            profileError
                        );
                    } else {
                        // Send congratulations email
                        try {
                            await supabase.functions.invoke(
                                "send-creator-congratulations",
                                {
                                    body: {
                                        email: application.email,
                                        creatorName: application.full_name,
                                    },
                                }
                            );
                            console.log(
                                "Congratulations email sent to:",
                                application.email
                            );
                        } catch (emailError) {
                            console.error(
                                "Error sending congratulations email:",
                                emailError
                            );
                            // Don't fail the approval process if email fails
                        }
                    }
                }
            }

            toast({
                title:
                    status === "approved"
                        ? "Application Approved! 🎉"
                        : "Application Rejected",
                description:
                    status === "approved"
                        ? "User has been granted creator status and can now upload arrangements."
                        : "Application has been rejected with admin notes.",
            });

            fetchApplications(); // Refresh the list
            setSelectedApplication(null);
        } catch (error) {
            console.error("Error updating application:", error);
            toast({
                title: "Error",
                description: "Failed to update application status",
                variant: "destructive",
            });
        }
    };

    const filteredApplications = (status: string) => {
        if (status === "all") return applications;
        return applications.filter((app) => app.status === status);
    };

    const stats = {
        total: applications.length,
        pending: applications.filter((app) => app.status === "pending").length,
        approved: applications.filter((app) => app.status === "approved")
            .length,
        rejected: applications.filter((app) => app.status === "rejected")
            .length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">
                        Loading creator applications...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Total Applications
                                </p>
                                <p className="text-3xl font-bold">
                                    {stats.total}
                                </p>
                            </div>
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Pending Review
                                </p>
                                <p className="text-3xl font-bold text-yellow-600">
                                    {stats.pending}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Approved
                                </p>
                                <p className="text-3xl font-bold text-green-600">
                                    {stats.approved}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Rejected
                                </p>
                                <p className="text-3xl font-bold text-red-600">
                                    {stats.rejected}
                                </p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Applications List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Creator Applications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">
                                All ({stats.total})
                            </TabsTrigger>
                            <TabsTrigger value="pending">
                                Pending ({stats.pending})
                            </TabsTrigger>
                            <TabsTrigger value="approved">
                                Approved ({stats.approved})
                            </TabsTrigger>
                            <TabsTrigger value="rejected">
                                Rejected ({stats.rejected})
                            </TabsTrigger>
                        </TabsList>

                        {["all", "pending", "approved", "rejected"].map(
                            (status) => (
                                <TabsContent
                                    key={status}
                                    value={status}
                                    className="mt-6"
                                >
                                    <div className="space-y-4">
                                        {filteredApplications(status).length ===
                                        0 ? (
                                            <div className="text-center py-8">
                                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                                <p className="text-muted-foreground">
                                                    No{" "}
                                                    {status === "all"
                                                        ? ""
                                                        : status}{" "}
                                                    applications found
                                                </p>
                                            </div>
                                        ) : (
                                            filteredApplications(status).map(
                                                (application) => (
                                                    <Card
                                                        key={application.id}
                                                        className="hover:shadow-md transition-shadow"
                                                    >
                                                        <CardContent className="p-6">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-4 flex-1">
                                                                    <Avatar className="h-12 w-12">
                                                                        <AvatarFallback>
                                                                            {application.full_name
                                                                                .split(
                                                                                    " "
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        n
                                                                                    ) =>
                                                                                        n[0]
                                                                                )
                                                                                .join(
                                                                                    ""
                                                                                )}
                                                                        </AvatarFallback>
                                                                    </Avatar>

                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex items-center gap-3">
                                                                            <h3 className="font-semibold text-lg">
                                                                                {
                                                                                    application.full_name
                                                                                }
                                                                            </h3>
                                                                            <Badge
                                                                                className={getStatusColor(
                                                                                    application.status
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-1">
                                                                                    {getStatusIcon(
                                                                                        application.status
                                                                                    )}
                                                                                    {application.status
                                                                                        .charAt(
                                                                                            0
                                                                                        )
                                                                                        .toUpperCase() +
                                                                                        application.status.slice(
                                                                                            1
                                                                                        )}
                                                                                </div>
                                                                            </Badge>
                                                                        </div>

                                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                            <div className="flex items-center gap-1">
                                                                                <Mail className="h-4 w-4" />
                                                                                {
                                                                                    application.email
                                                                                }
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <Calendar className="h-4 w-4" />
                                                                                {format(
                                                                                    new Date(
                                                                                        application.created_at
                                                                                    ),
                                                                                    "MMM dd, yyyy"
                                                                                )}
                                                                            </div>
                                                                            {application.experience_years && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Star className="h-4 w-4" />
                                                                                    {
                                                                                        application.experience_years
                                                                                    }{" "}
                                                                                    years
                                                                                    experience
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-wrap gap-2">
                                                                            {application.instruments
                                                                                .slice(
                                                                                    0,
                                                                                    3
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        instrument
                                                                                    ) => (
                                                                                        <Badge
                                                                                            key={
                                                                                                instrument
                                                                                            }
                                                                                            variant="secondary"
                                                                                            className="text-xs"
                                                                                        >
                                                                                            {
                                                                                                instrument
                                                                                            }
                                                                                        </Badge>
                                                                                    )
                                                                                )}
                                                                            {application
                                                                                .instruments
                                                                                .length >
                                                                                3 && (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="text-xs"
                                                                                >
                                                                                    +
                                                                                    {application
                                                                                        .instruments
                                                                                        .length -
                                                                                        3}{" "}
                                                                                    more
                                                                                </Badge>
                                                                            )}
                                                                        </div>

                                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                                            {application.motivation.substring(
                                                                                0,
                                                                                150
                                                                            )}
                                                                            ...
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <Dialog>
                                                                        <DialogTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    setSelectedApplication(
                                                                                        application
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Eye className="h-4 w-4 mr-2" />
                                                                                Review
                                                                            </Button>
                                                                        </DialogTrigger>
                                                                        <ApplicationDetailModal
                                                                            application={
                                                                                selectedApplication
                                                                            }
                                                                            onAction={
                                                                                handleApplicationAction
                                                                            }
                                                                            adminNotes={
                                                                                adminNotes
                                                                            }
                                                                            setAdminNotes={
                                                                                setAdminNotes
                                                                            }
                                                                        />
                                                                    </Dialog>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            )
                                        )}
                                    </div>
                                </TabsContent>
                            )
                        )}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

// Application Detail Modal Component
const ApplicationDetailModal = ({
    application,
    onAction,
    adminNotes,
    setAdminNotes,
}: {
    application: CreatorApplication | null;
    onAction: (
        id: string,
        status: "approved" | "rejected",
        notes?: string
    ) => void;
    adminNotes: string;
    setAdminNotes: (notes: string) => void;
}) => {
    if (!application) return null;

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                    Creator Application Review
                </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Application Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-medium">Full Name</p>
                                    <p className="text-muted-foreground">
                                        {application.full_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium">Email</p>
                                    <p className="text-muted-foreground">
                                        {application.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium">Experience</p>
                                    <p className="text-muted-foreground">
                                        {application.experience_years
                                            ? `${application.experience_years} years`
                                            : "Not specified"}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium">Applied</p>
                                    <p className="text-muted-foreground">
                                        {format(
                                            new Date(application.created_at),
                                            "MMM dd, yyyy"
                                        )}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Musical Background */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Music className="h-5 w-5" />
                                Musical Background
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="font-medium mb-2">
                                    Background & Experience
                                </p>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {application.musical_background}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium mb-2">Instruments</p>
                                <div className="flex flex-wrap gap-2">
                                    {application.instruments.map(
                                        (instrument) => (
                                            <Badge
                                                key={instrument}
                                                variant="secondary"
                                            >
                                                {instrument}
                                            </Badge>
                                        )
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="font-medium mb-2">Specialties</p>
                                <div className="flex flex-wrap gap-2">
                                    {application.specialties?.map(
                                        (specialty) => (
                                            <Badge
                                                key={specialty}
                                                className="bg-purple-100 text-purple-800"
                                            >
                                                {specialty}
                                            </Badge>
                                        )
                                    ) || (
                                        <p className="text-xs text-muted-foreground">
                                            No specialties listed
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="font-medium mb-2">Motivation</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {application.motivation}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Links */}
                    {application.social_links &&
                        typeof application.social_links === "object" &&
                        Object.values(application.social_links).some(
                            (link) => link
                        ) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Globe className="h-5 w-5" />
                                        Social Links
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {application.social_links.youtube && (
                                            <a
                                                href={
                                                    application.social_links
                                                        .youtube
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:underline"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                YouTube Channel
                                            </a>
                                        )}
                                        {application.social_links.instagram && (
                                            <a
                                                href={
                                                    application.social_links
                                                        .instagram
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:underline"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Instagram
                                            </a>
                                        )}
                                        {application.social_links.facebook && (
                                            <a
                                                href={
                                                    application.social_links
                                                        .facebook
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:underline"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Facebook
                                            </a>
                                        )}
                                        {application.social_links.website && (
                                            <a
                                                href={
                                                    application.social_links
                                                        .website
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:underline"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Website
                                            </a>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                </div>

                {/* Actions Panel */}
                <div className="space-y-6">
                    {/* Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Application Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge
                                className={`${getStatusColor(
                                    application.status
                                )} text-sm`}
                            >
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(application.status)}
                                    {application.status
                                        .charAt(0)
                                        .toUpperCase() +
                                        application.status.slice(1)}
                                </div>
                            </Badge>

                            {application.reviewed_at && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Reviewed on{" "}
                                    {format(
                                        new Date(application.reviewed_at),
                                        "MMM dd, yyyy"
                                    )}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Admin Actions */}
                    {application.status === "pending" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Review Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Admin Notes
                                    </label>
                                    <Textarea
                                        placeholder="Add notes about this application..."
                                        value={adminNotes}
                                        onChange={(e) =>
                                            setAdminNotes(e.target.value)
                                        }
                                        className="min-h-[100px]"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() =>
                                            onAction(
                                                application.id,
                                                "approved",
                                                adminNotes
                                            )
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        Approve Application
                                    </Button>

                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            onAction(
                                                application.id,
                                                "rejected",
                                                adminNotes
                                            )
                                        }
                                    >
                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                        Reject Application
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Previous Admin Notes */}
                    {application.admin_notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5" />
                                    Admin Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {application.admin_notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {(application.sample_work_url_1 ||
                        application.sample_work_url_2 ||
                        application.sample_work_url_3) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ExternalLink className="h-5 w-5" />
                                    Sample Work (Portfolio)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {application.sample_work_url_1 && (
                                    <a
                                        href={application.sample_work_url_1}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                                    >
                                        <Music className="h-4 w-4" /> YouTube
                                        Link
                                    </a>
                                )}
                                {application.sample_work_url_2 && (
                                    <a
                                        href={application.sample_work_url_2}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                                    >
                                        <Music className="h-4 w-4" /> Instagram
                                        Link
                                    </a>
                                )}
                                {application.sample_work_url_3 && (
                                    <a
                                        href={application.sample_work_url_3}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                                    >
                                        <Music className="h-4 w-4" /> TikTok
                                        Link
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DialogContent>
    );
};

export default CreatorApplicationsManagement;
