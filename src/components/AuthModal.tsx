import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    countryCodes,
    countries,
    countriesWithCities,
} from "@/constants/locations";
import { Mail } from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState("+62");
    const [selectedCountry, setSelectedCountry] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [availableCities, setAvailableCities] = useState<string[]>([]);

    // Update available cities when country changes
    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        setSelectedCity(""); // Reset city selection
        setAvailableCities(
            countriesWithCities[country as keyof typeof countriesWithCities] ||
                []
        );
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);

        // Simulate Google OAuth sign in
        setTimeout(() => {
            toast({
                title: "Welcome back!",
                description: "You've successfully signed in with Google.",
            });
            setIsLoading(false);
            onClose();
        }, 1500);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate Google OAuth sign up process
        setTimeout(() => {
            toast({
                title: "Account created successfully!",
                description:
                    "Welcome to Arrangely! You can now start creating arrangements.",
            });
            setIsLoading(false);
            onClose();
            // Redirect to homepage would happen here
            window.location.href = "/";
        }, 1500);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-md"
                aria-describedby="auth-description"
            >
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold text-primary">
                        Welcome to Arrangely
                    </DialogTitle>
                    <p id="auth-description" className="text-muted-foreground">
                        Join Arrangely to create and manage your arrangements
                    </p>
                </DialogHeader>

                <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sign In</CardTitle>
                                <CardDescription>
                                    Enter your credentials to access your
                                    arrangements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Button
                                        onClick={handleGoogleSignIn}
                                        className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                                        disabled={isLoading}
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        {isLoading
                                            ? "Signing in..."
                                            : "Continue with Google"}
                                    </Button>

                                    <div className="text-center text-sm text-muted-foreground">
                                        By signing in, you agree to our Terms of
                                        Service and Privacy Policy
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="signup">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Account</CardTitle>
                                <CardDescription>
                                    Join thousands of Arrangely leaders using
                                    Arrangely
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={handleSignUp}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="Arrangely"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">
                                            Phone Number
                                        </Label>
                                        <div className="flex gap-2">
                                            <Select
                                                value={selectedCountryCode}
                                                onValueChange={
                                                    setSelectedCountryCode
                                                }
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Code" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {countryCodes.map(
                                                        (code) => (
                                                            <SelectItem
                                                                key={code.value}
                                                                value={
                                                                    code.value
                                                                }
                                                            >
                                                                {code.label}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="812345678"
                                                className="flex-1"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Your Role</Label>
                                        <select
                                            id="role"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            required
                                        >
                                            <option value="">
                                                Select your role
                                            </option>
                                            <option value="keyboardist">
                                                Keyboardist/Pianist
                                            </option>
                                            <option value="music-director">
                                                Music Director
                                            </option>
                                            <option value="worship-leader">
                                                Worship Leader
                                            </option>
                                            <option value="musician">
                                                Musician
                                            </option>
                                            <option value="singer">
                                                Singer
                                            </option>
                                            <option value="sound-engineer">
                                                Sound Engineer
                                            </option>
                                            <option value="music-teacher">
                                                Music Teacher
                                            </option>
                                            <option value="composer">
                                                Composer/Arranger
                                            </option>
                                            <option value="student">
                                                Music Student
                                            </option>
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="country">
                                                Country *
                                            </Label>
                                            <Select
                                                value={selectedCountry}
                                                onValueChange={
                                                    handleCountryChange
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select country first" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background border border-border max-h-[200px] overflow-y-auto z-50">
                                                    {countries.map(
                                                        (country) => (
                                                            <SelectItem
                                                                key={country}
                                                                value={country}
                                                            >
                                                                {country}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="city">City *</Label>
                                            <Select
                                                value={selectedCity}
                                                onValueChange={setSelectedCity}
                                                disabled={!selectedCountry}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={
                                                            selectedCountry
                                                                ? "Select city"
                                                                : "Select country first"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background border border-border max-h-[200px] overflow-y-auto z-50">
                                                    {availableCities.map(
                                                        (city) => (
                                                            <SelectItem
                                                                key={city}
                                                                value={city}
                                                            >
                                                                {city}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="hearAbout">
                                            How did you hear about us?
                                        </Label>
                                        <select
                                            id="hearAbout"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            required
                                        >
                                            <option value="">
                                                Select an option
                                            </option>
                                            <option value="social-media">
                                                Social Media (Facebook,
                                                Instagram, etc.)
                                            </option>
                                            <option value="youtube">
                                                YouTube
                                            </option>
                                            <option value="google">
                                                Google Search
                                            </option>
                                            <option value="friend">
                                                Friend/Word of Mouth
                                            </option>
                                            <option value="church">
                                                Church/Ministry
                                            </option>
                                            <option value="community">
                                                Music Community/Forum
                                            </option>
                                            <option value="ad">
                                                Advertisement
                                            </option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                                        disabled={isLoading}
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        {isLoading
                                            ? "Creating account..."
                                            : "Complete Sign up with Google"}
                                    </Button>

                                    <div className="text-center text-sm text-muted-foreground mt-4">
                                        By signing up, you agree to our Terms of
                                        Service and Privacy Policy
                                    </div>
                                </form>

                                <div className="mt-4 p-4 bg-muted rounded-lg">
                                    <h4 className="font-semibold text-sm mb-2">
                                        What you get:
                                    </h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>✅ Unlimited song arrangements</li>
                                        <li>✅ powered chord detection</li>
                                        <li>✅ Team collaboration tools</li>
                                        <li>✅ Setlist planning</li>
                                        <li>✅ Mobile & offline access</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;
