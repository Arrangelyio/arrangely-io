import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Search, 
  Music, 
  Users, 
  CreditCard, 
  Settings, 
  FileText, 
  MessageCircle,
  BookOpen,
  Headphones,
  Smartphone,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const helpCategories = [
    {
      icon: <Music className="h-6 w-6" />,
      title: "Creating Arrangements",
      description: "Learn how to create, edit, and organize your chord sheets",
      color: "bg-blue-50 text-blue-600",
      link: "#arrangements"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Collaboration",
      description: "Share arrangements and collaborate with your team",
      color: "bg-green-50 text-green-600",
      link: "#collaboration"
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Billing & Subscriptions",
      description: "Manage your subscription and payment methods",
      color: "bg-purple-50 text-purple-600",
      link: "#billing"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Account Settings",
      description: "Update your profile and account preferences",
      color: "bg-orange-50 text-orange-600",
      link: "#account"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile App",
      description: "Using Arrangely on your mobile device",
      color: "bg-pink-50 text-pink-600",
      link: "#mobile"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Creator Program",
      description: "Sell arrangements and earn with Arrangely",
      color: "bg-indigo-50 text-indigo-600",
      link: "#creator"
    }
  ];

  const faqs = [
    {
      category: "arrangements",
      question: "How do I create my first arrangement?",
      answer: "To create your first arrangement, go to the Editor page and click 'New Arrangement'. You can start by entering song details, adding lyrics, and then placing chords above the lyrics. Use our chord picker for quick chord insertion."
    },
    {
      category: "arrangements", 
      question: "Can I import chords from YouTube videos?",
      answer: "Yes! Use our YouTube import feature to automatically detect chords from YouTube videos. Go to the YouTube Real-time Generator and paste a YouTube URL to get started."
    },
    {
      category: "arrangements",
      question: "How do I transpose my arrangements?",
      answer: "You can transpose any arrangement by using the transpose tool in the arrangement viewer. Click the transpose button and select your desired key."
    },
    {
      category: "collaboration",
      question: "How do I share arrangements with my team?",
      answer: "You can share arrangements by setting their visibility to 'Team' or 'Public' in the arrangement settings. Team members can then view and collaborate on your arrangements."
    },
    {
      category: "collaboration",
      question: "Can multiple people edit the same arrangement?",
      answer: "Currently, arrangements have a single owner who can edit them. However, team members can view, comment, and suggest changes through our collaboration features."
    },
    {
      category: "billing",
      question: "What's included in the free plan?",
      answer: "The free plan includes basic arrangement creation, limited song library access, and the ability to create up to 5 arrangements. Upgrade to Premium for unlimited arrangements and advanced features."
    },
    {
      category: "billing",
      question: "How do I cancel my subscription?",
      answer: "You can cancel your subscription anytime from your Profile > Subscription settings. Your premium features will remain active until the end of your current billing period."
    },
    {
      category: "account",
      question: "How do I change my password?",
      answer: "Go to your Profile settings and click 'Change Password'. You'll need to enter your current password and then your new password twice for confirmation."
    },
    {
      category: "account",
      question: "Can I change my email address?",
      answer: "Currently, email addresses cannot be changed after registration. If you need to change your email, please contact our support team for assistance."
    },
    {
      category: "mobile",
      question: "Is there a mobile app?",
      answer: "Arrangely is fully optimized for mobile browsers. You can access all features through your mobile browser by visiting arrangely.io. A dedicated mobile app is in development."
    },
    {
      category: "creator",
      question: "How do I become a creator?",
      answer: "Apply for the Creator Program through your profile settings. Once approved, you can upload and sell your arrangements to other users on the platform."
    },
    {
      category: "creator",
      question: "How do creator earnings work?",
      answer: "Creators earn a percentage of each sale. Earnings are tracked in your Creator Dashboard and can be withdrawn monthly through our supported payment methods."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <HelpCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Help Center</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Find answers to common questions and learn how to get the most out of Arrangely
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <Link to="/contact">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center space-x-3 p-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Contact Support</h3>
                    <p className="text-sm text-muted-foreground">Get personalized help</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/chat">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center space-x-3 p-4">
                  <Headphones className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Live Chat</h3>
                    <p className="text-sm text-muted-foreground">Chat with our AI assistant</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center space-x-3 p-4">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Getting Started</h3>
                  <p className="text-sm text-muted-foreground">New to Arrangely?</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Help Categories */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Browse by Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-4`}>
                      {category.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
            
            {searchQuery && (
              <div className="mb-4">
                <Badge variant="secondary">
                  {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''} for "{searchQuery}"
                </Badge>
              </div>
            )}

            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <Card>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        <span className="font-medium">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-0">
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFaqs.length === 0 && searchQuery && (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any help articles matching "{searchQuery}"
                </p>
                <Link to="/contact">
                  <Button>Contact Support</Button>
                </Link>
              </Card>
            )}
          </div>

          {/* Getting Started Guide */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>Getting Started with Arrangely</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">1. Create Your First Arrangement</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Start by creating a simple chord sheet for a song you know well.
                  </p>
                  <Link to="/editor">
                    <Button size="sm" variant="outline">Go to Editor</Button>
                  </Link>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">2. Explore the Song Library</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Browse existing arrangements and add them to your personal library.
                  </p>
                  <Link to="/library">
                    <Button size="sm" variant="outline">Browse Library</Button>
                  </Link>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">3. Try YouTube Import</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatically detect chords from your favorite YouTube videos.
                  </p>
                  <Link to="/youtube-realtime-generate">
                    <Button size="sm" variant="outline">Try YouTube Import</Button>
                  </Link>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">4. Collaborate with Your Team</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Share arrangements and work together with your worship team.
                  </p>
                  <Link to="/collaboration">
                    <Button size="sm" variant="outline">Learn Collaboration</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Still Need Help */}
          <Card className="text-center">
            <CardContent className="p-8">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-6">
                Our support team is here to help you succeed with Arrangely
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/contact">
                  <Button>Contact Support</Button>
                </Link>
                <Link to="/chat">
                  <Button variant="outline">Live Chat</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Help;