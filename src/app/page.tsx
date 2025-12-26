import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Highlighter } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          Deep<span className="text-primary">Read</span>
        </h1>
        <p className="text-muted-foreground max-w-md">
          AI-powered research assistant for academic papers with precise citations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-primary mb-2" />
            <CardTitle>PDF Import</CardTitle>
            <CardDescription>
              Upload and parse academic papers with text extraction
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Highlighter className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Smart Highlights</CardTitle>
            <CardDescription>
              Highlight passages with precise page and offset citations
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <MessageSquare className="h-8 w-8 text-primary mb-2" />
            <CardTitle>AI Chat</CardTitle>
            <CardDescription>
              Discuss papers with AI and get verified citations
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button>Get Started</Button>
        <Button variant="secondary">Learn More</Button>
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Built with Next.js 14, TypeScript, TailwindCSS, and shadcn/ui
      </p>
    </div>
  );
}
