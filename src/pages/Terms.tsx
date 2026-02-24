import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Shield,
  Music,
  CreditCard,
  Users,
  AlertTriangle,
} from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Terms & Conditions
            </h1>
            <p className="text-xl text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please read these Terms & Conditions carefully before using our
              platform.
            </p>
          </div>

          <div className="space-y-8">
            {/* Acceptance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Acceptance of Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  By accessing and using Arrangely ("we", "our", or the
                  "platform"), you ("you" or "user") agree to be bound by these
                  Terms & Conditions. If you do not agree with these terms,
                  please do not use our platform.
                </p>
                <div className="bg-accent-soft p-4 rounded-lg">
                  <p className="text-sm font-medium">
                    <strong>Age Requirement:</strong> This platform may be used
                    by elementary, middle school, high school students, and
                    adults. Users under the age of 18 must obtain consent from a
                    parent or legal guardian.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>User Accounts & Responsibilities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Account Creation</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Provide accurate, complete, and up-to-date information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Notify us immediately of any unauthorized access</li>
                    <li>You are responsible for all activities under your account</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Acceptable Use</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Use the platform only for lawful purposes</li>
                    <li>Respect other users and maintain professional conduct</li>
                    <li>
                      Do not upload harmful content or attempt to compromise
                      platform security
                    </li>
                    <li>Comply with community guidelines and copyright laws</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* IP */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="h-5 w-5 text-primary" />
                  <span>Intellectual Property & Content</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Your Content</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>
                      You retain ownership of your original music arrangements
                    </li>
                    <li>
                      You must have proper rights or licenses for copyrighted
                      material
                    </li>
                    <li>
                      You grant us a license to store, display, and distribute
                      your content
                    </li>
                    <li>You may delete your content at any time</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Copyright Compliance</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Respect the rights of songwriters and publishers</li>
                    <li>
                      Share only arrangements you are authorized to distribute
                    </li>
                    <li>
                      We respond to valid DMCA takedown requests
                    </li>
                    <li>
                      Repeated violations may result in account termination
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Important:</strong> Creating chord charts does not
                    grant copyright ownership of the underlying song. Always
                    ensure you have appropriate licenses for public performance
                    or distribution.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>Subscription & Billing Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Subscription Plans</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>
                      We offer multiple subscription tiers with different
                      features
                    </li>
                    <li>
                      Subscriptions automatically renew unless cancelled
                    </li>
                    <li>
                      You may upgrade, downgrade, or cancel at any time
                    </li>
                    <li>
                      Changes take effect in the next billing cycle
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    Billing & Refunds
                  </h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>
                      All payments are securely processed by third-party
                      providers
                    </li>
                    <li>
                      Prices may change with 30 days’ prior notice
                    </li>
                    <li>
                      Refunds are available within 14 days for annual plans
                    </li>
                    <li>
                      Pro-rated refunds may apply for early cancellation
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Free Trial</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>
                      Trial period provides full access to premium features
                    </li>
                    <li>No charges during the trial period</li>
                    <li>
                      Cancel before the trial ends to avoid charges
                    </li>
                    <li>
                      Limited to one trial per user/payment method
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Liability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <span>Limitation of Liability</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, Arrangely and its
                  affiliates are not liable for:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>
                    Indirect, incidental, special, or consequential damages
                  </li>
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Service interruptions or technical failures</li>
                  <li>Actions of third parties or other users</li>
                  <li>
                    Copyright infringement by user-generated content
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you have any questions regarding these Terms & Conditions:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong>Email:</strong> info@arrangely.io
                  </p>
                  <p>
                    <strong>Support:</strong> info@arrangely.io
                  </p>
                  <p>
                    <strong>Mailing Address:</strong> RUKO GRAND ORCHARD, JALAN
                    TERUSAN KELAPA HYBRIDA BLOK F 02, Jakarta Utara, DKI Jakarta
                    14140
                  </p>
                </div>
                <div className="bg-accent-soft p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Governing Law:</strong> These Terms are governed by
                    the laws of Indonesia. Any disputes shall be resolved
                    through mediation or the competent courts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
