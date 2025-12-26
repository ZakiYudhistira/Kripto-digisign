"use client"

import * as React from "react"
import { 
  Upload, 
  Download, 
  Key, 
  User, 
  FileText, 
  CheckCircle2, 
  Loader2,
  AlertTriangle 
} from "lucide-react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import { signPDF, downloadPDF } from "~/helper/pdf"

export default function SignDocumentPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [username, setUsername] = React.useState("")
  const [privateKey, setPrivateKey] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isSigned, setIsSigned] = React.useState(false)
  const [signedPdfBlob, setSignedPdfBlob] = React.useState<Blob | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setIsSigned(false) // Reset signed state if new file selected
      setError(null)
    }
  }

  // Handle the actual PDF signing
  const handleSignAndProcess = async () => {
    if (!file || !username || !privateKey) {
      setError("Please fill in all fields")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Sign the PDF client-side
      const signedBlob = await signPDF(file, privateKey, username)
      
      setSignedPdfBlob(signedBlob)
      setIsSigned(true)
    } catch (err) {
      console.error('Signing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign PDF')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle download of signed PDF
  const handleDownload = () => {
    if (signedPdfBlob && file) {
      const originalName = file.name.replace('.pdf', '')
      downloadPDF(signedPdfBlob, `${originalName}_signed.pdf`)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Sign Document</CardTitle>
          <CardDescription>
            Authenticate with your keys to sign and secure your PDF.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </p>
            </div>
          )}

          {/* Credentials Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="username" 
                  placeholder="johndoe" 
                  className="pl-9" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isProcessing || isSigned}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="private-key">Private Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="private-key" 
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;Paste your private key here...&#10;-----END PRIVATE KEY-----" 
                  className="w-full min-h-[100px] pl-9 pr-3 py-2 font-mono text-xs border rounded-md resize-none"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  disabled={isProcessing || isSigned}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* File Operations Section */}
          <div className="space-y-4">
            <Label>Document (PDF)</Label>
            
            {/* Custom Upload Area */}
            <div className="grid w-full items-center gap-1.5">
              <label 
                htmlFor="pdf-upload" 
                className={`
                  flex flex-col items-center justify-center w-full h-32 
                  border-2 border-dashed rounded-lg cursor-pointer 
                  hover:bg-accent/50 transition-colors
                  ${file ? "border-primary bg-accent/20" : "border-muted-foreground/25"}
                `}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> PDF
                      </p>
                    </>
                  )}
                </div>
                <Input 
                  id="pdf-upload" 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isProcessing || isSigned}
                />
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 bg-muted/30 pt-6">
          {/* Action Button: Changes based on state */}
          {!isSigned ? (
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleSignAndProcess}
              disabled={!file || !username || !privateKey || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing Document...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Sign PDF
                </>
              )}
            </Button>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium p-2 bg-green-50 rounded-md border border-green-100">
                <CheckCircle2 className="h-5 w-5" />
                Document Signed Successfully
              </div>
              <Button className="w-full" variant="outline" size="lg" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Signed PDF
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}