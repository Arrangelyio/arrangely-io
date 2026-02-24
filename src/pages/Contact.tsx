import React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";

const Contact = () => {
    return (
        <div className="min-h-screen bg-background pt-5">
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-foreground mb-4">
                            Contact Us
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Get in touch with our team. We'd love to hear from
                            you.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Send us a message</CardTitle>
                                <CardDescription>
                                    Fill out the form below and we'll get back
                                    to you as soon as possible.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="name"
                                        className="text-sm font-medium"
                                    >
                                        Name
                                    </label>
                                    <Input id="name" placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="text-sm font-medium"
                                    >
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label
                                        htmlFor="subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>
                                    <Input
                                        id="subject"
                                        placeholder="What's this about?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label
                                        htmlFor="message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>
                                    <Textarea
                                        id="message"
                                        placeholder="Your message..."
                                        rows={4}
                                    />
                                </div>
                                <Button className="w-full">Send Message</Button>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            {/* Email Card */}
                            <a
                            href="mailto:info@arrangely.io"
                            className="block transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                            <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                <div className="flex items-center space-x-3">
                                    <Mail className="h-5 w-5 text-primary" />
                                    <div>
                                    <h3 className="font-semibold">Email</h3>
                                    <p className="text-muted-foreground">info@arrangely.io</p>
                                    </div>
                                </div>
                                </CardContent>
                            </Card>
                            </a>

                            {/* WhatsApp Card */}
                            <a
                            href="https://wa.me/6281393693999"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                            <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                <div className="flex items-center space-x-3">
                                    <Phone className="h-5 w-5 text-green-600" />
                                    <div>
                                    <h3 className="font-semibold">WhatsApp</h3>
                                    <p className="text-muted-foreground">0813-9369-3999</p>
                                    </div>
                                </div>
                                </CardContent>
                            </Card>
                            </a>

                            {/* Address Card */}
                            <a
                            href="https://google.com/maps/dir/-6.111374,106.7420857/Rukan+Grand+Orchard,+Ruko+Grand+Orchard+B,+Jl.+Terusan+Klp.+Hybrida+No.25,+RT.9%2FRW.1,+Sukapura,+Kec.+Cilincing,+Jkt+Utara,+Daerah+Khusus+Ibukota+Jakarta+14140/@-6.1410506,106.6651977,11.01z/data=!4m10!4m9!1m1!4e1!1m5!1m1!1s0x2e698becf2d660b1:0x7cf7a9be25574beb!2m2!1d106.9203598!2d-6.1493899!3e0?entry=ttu&g_ep=EgoyMDI1MTAwNi4wIKXMDSoASAFQAw%3D%3D"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                            <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                <div className="flex items-center space-x-3">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    <div>
                                    <h3 className="font-semibold">Address</h3>
                                    <p className="text-muted-foreground">
                                        RUKO GRAND ORCHARD
                                        <br />
                                        JALAN TERUSAN KELAPA HYBRIDA BLOK F 02
                                        <br />
                                        Desa/Kelurahan Sukapura, Kec. Cilincing
                                        <br />
                                        Kota Adm. Jakarta Utara, Provinsi DKI Jakarta
                                        <br />
                                        Kode Pos: 14140, Indonesia
                                    </p>
                                    </div>
                                </div>
                                </CardContent>
                            </Card>
                            </a>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
