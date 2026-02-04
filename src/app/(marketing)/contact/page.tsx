"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implement real contact form submission via server action
    // For now, simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.info("Thank you for your message! Contact form submission coming soon.");
    setIsSubmitting(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Contact Us</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Have questions? We&apos;d love to hear from you. Send us a message and
          we&apos;ll respond as soon as possible.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Mail className="mb-2 h-6 w-6 text-primary" />
              <CardTitle className="text-lg">Email</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:support@docconnect.com"
                className="text-muted-foreground hover:text-foreground"
              >
                support@docconnect.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Phone className="mb-2 h-6 w-6 text-primary" />
              <CardTitle className="text-lg">Phone</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="tel:+1-800-DOCCONNECT"
                className="text-muted-foreground hover:text-foreground"
              >
                1-800-DOCCONNECT
              </a>
              <p className="mt-1 text-sm text-muted-foreground">
                Mon-Fri, 9am-5pm EST
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MapPin className="mb-2 h-6 w-6 text-primary" />
              <CardTitle className="text-lg">Office</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                123 Main Street
                <br />
                San Francisco, CA 94102
                <br />
                United States
              </p>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              Looking for help with your account?
              <br />
              Visit our{" "}
              <Link href="/help" className="text-primary hover:underline">
                Help Center
              </Link>{" "}
              for quick answers.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select name="subject" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="support">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="press">Press Inquiry</SelectItem>
                    <SelectItem value="enterprise">Enterprise Sales</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="How can we help you?"
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Social Links */}
      <div className="mt-16 text-center">
        <h2 className="mb-4 text-xl font-semibold">Connect With Us</h2>
        <div className="flex justify-center gap-6">
          <a
            href="https://twitter.com/docconnect"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            Twitter
          </a>
          <a
            href="https://facebook.com/docconnect"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            Facebook
          </a>
          <a
            href="https://instagram.com/docconnect"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            Instagram
          </a>
          <a
            href="https://linkedin.com/company/docconnect"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
