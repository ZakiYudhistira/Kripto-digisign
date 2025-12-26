"use client"

import * as React from "react"
import { 
  Upload, 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Loader2, 
  ShieldCheck,
  Info
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
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { verifyPDF } from "~/helper/pdf"

// Possible states for the verification result
type VerificationStatus = "idle" | "success" | "error"

export default function VerifyDocumentPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [username, setUsername] = React.useState("")
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [status, setStatus] = React.useState<VerificationStatus>("idle")
  const [message, setMessage] = React.useState("")
  const [details, setDetails] = React.useState<{
    signer: string;
    timestamp: string;
    algorithm: string;
  } | null>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus("idle") // Reset status on new file
      setMessage("")
      setDetails(null)
    }
  }

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(e.target.value)
      setStatus("idle") // Reset status on username change
      setMessage("")
      setDetails(null)
  }

  // Handle the actual PDF verification
  const handleVerify = async () => {
    if (!file || !username) return
    
    setIsVerifying(true)
    setStatus("idle")
    setMessage("")
    setDetails(null)

    try {
      const result = await verifyPDF(file, username.trim())
      
      setStatus(result.isValid ? "success" : "error")
      setMessage(result.message)
      setDetails(result.details || null)
      
    } catch (error) {
      console.error('Verification error:', error)
      setStatus("error")
      setMessage("An unexpected error occurred during verification.")
    } finally {
      setIsVerifying(false)
    }
  }

  const canSubmit = file !== null && username.trim().length > 0

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Verify Signature</CardTitle>
          <CardDescription>
            Upload a signed PDF and enter the signer's username to verify authenticity.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
            
           {/* 1. Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username">Signer's Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="username" 
                placeholder="e.g. johndoe" 
                className="pl-9"
                value={username}
                onChange={handleUsernameChange} 
              />
            </div>
          </div>

          <Separator />

          {/* 2. PDF Upload Button/Area */}
          <div className="space-y-4">
            <Label>Signed Document (PDF)</Label>
            <div className="grid w-full items-center gap-1.5">
              <label 
                htmlFor="pdf-upload-verify" 
                className={`
                  flex flex-col items-center justify-center w-full h-32 
                  border-2 border-dashed rounded-lg cursor-pointer 
                  hover:bg-accent/50 transition-colors group
                  ${file ? "border-primary bg-accent/20" : "border-muted-foreground/25"}
                `}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> PDF
                      </p>
                    </>
                  )}
                </div>
                <Input 
                  id="pdf-upload-verify" 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 bg-muted/30 pt-6">
          {/* 3. Verify Button */}
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleVerify}
            disabled={!canSubmit || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify Signature
              </>
            )}
          </Button>
          
          {/* Result Feedback Areas */}
          {status === "success" && (
            <Alert variant="default" className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Signature Valid ✓</AlertTitle>
              <AlertDescription>
                {message}
                {details && (
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Signer:</strong> {details.signer}</p>
                    <p><strong>Signed:</strong> {new Date(details.timestamp).toLocaleString()}</p>
                    <p><strong>Algorithm:</strong> {details.algorithm}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>
                {message}
                {details && (
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Document signer:</strong> {details.signer}</p>
                    <p><strong>Signed on:</strong> {new Date(details.timestamp).toLocaleString()}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

        </CardFooter>
      </Card>
    </div>
  )
}