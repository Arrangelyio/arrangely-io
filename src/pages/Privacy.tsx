import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Users, FileText, Globe } from "lucide-react";
const Privacy = () => {
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-xl text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your privacy is important to us. This policy explains how we collect, use, and protect your data.
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Information We Collect</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Personal Information</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Account information (name, email address, profile details)</li>
                    <li>Professional information (musical role, experience level)</li>
                    <li>Contact information and communication preferences</li>
                    <li>Payment information (processed securely through third parties)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Musical Content</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Song arrangements and chord sheets you create</li>
                    <li>Musical preferences and instrument selections</li>
                    <li>Usage patterns and platform interactions</li>
                    <li>Collaboration data with other users</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Technical Data</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Device information and browser type</li>
                    <li>IP address and location data</li>
                    <li>Usage analytics and performance metrics</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>How We Use Your Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Service Provision</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Provide and maintain our platform services</li>
                    <li>Process your arrangements and manage your library</li>
                    <li>Enable collaboration features with other users</li>
                    <li>Handle subscription billing and payments</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Communication</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Send service updates and notifications</li>
                    <li>Provide customer support and respond to inquiries</li>
                    <li>Share product updates and new features</li>
                    <li>Send marketing communications (with consent)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Platform Improvement</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Analyze usage patterns to improve our services</li>
                    <li>Develop new features based on user needs</li>
                    <li>Ensure platform security and prevent fraud</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <span>Information Sharing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We do not sell your personal information. We may share your information only in these circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>With your explicit consent</li>
                  <li>With service providers who help us operate the platform</li>
                  <li>When required by law or legal process</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>In connection with a business transfer or merger</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>Data Security & Storage</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and authentication systems</li>
                  <li>Secure cloud infrastructure with leading providers</li>
                  <li>Data backup and recovery procedures</li>
                </ul>
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <p className="text-sm">
                    <strong>Data Retention:</strong> We keep your data for as long as your account is active 
                    or as needed to provide services. You can request data deletion at any time.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>Your Rights (GDPR Compliance)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you are in the EU/EEA, you have the following rights regarding your personal data:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong>Erasure:</strong> Request deletion of your personal data</li>
                  <li><strong>Portability:</strong> Receive your data in a structured format</li>
                  <li><strong>Restriction:</strong> Limit how we process your data</li>
                  <li><strong>Objection:</strong> Object to data processing for marketing</li>
                </ul>
                <div className="bg-accent-soft p-4 rounded-lg mt-4">
                  <p className="text-sm">
                    To exercise these rights, contact us at <strong>info@arrangely.io</strong>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cookies & Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We use cookies and similar technologies to improve your experience:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li><strong>Essential cookies:</strong> Required for platform functionality</li>
                  <li><strong>Analytics cookies:</strong> Help us understand usage patterns</li>
                  <li><strong>Preference cookies:</strong> Remember your settings and choices</li>
                  <li><strong>Marketing cookies:</strong> Deliver relevant advertisements (with consent)</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  You can manage cookie preferences through your browser settings or our cookie consent banner.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our platform is intended for users 18 years and older. We do not knowingly collect 
                  personal information from children under 18. If we discover we have collected such 
                  information, we will promptly delete it.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy or how we handle your data:
                </p>
                 <div className="space-y-2">
                   <p><strong>Email:</strong> info@arrangely.io</p>
                   <p><strong>Support:</strong> Visit our live chat or contact form</p>
                   <p><strong>Mailing Address:</strong> RUKO GRAND ORCHARD, JALAN TERUSAN KELAPA HYBRIDA BLOK F 02, Desa/Kelurahan Sukapura, Kec. Cilincing, Kota Adm. Jakarta Utara, Provinsi DKI Jakarta, Kode Pos: 14140</p>
                 </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Policy Updates:</strong> We may update this policy periodically. 
                    We'll notify you of significant changes via email or platform notifications.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>;
};
export default Privacy;