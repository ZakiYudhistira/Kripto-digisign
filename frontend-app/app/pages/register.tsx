"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, AlertTriangle, Key, Download, Copy, CheckCircle2 } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form"
import { generateECDSAKeyPair, exportPrivateKey, exportPublicKey, downloadTextFile } from "~/helper/crypto"

// 1. Define your validation schema
const formSchema = z.object({
  username: z
    .string()
    .min(3, {
      message: "Username must be at least 3 characters.",
    })
    .max(20, {
      message: "Username must not exceed 20 characters.",
    })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores.",
    }),
})

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [generatedKeys, setGeneratedKeys] = useState<{
    privateKey: string
    publicKey: string
    username: string
  } | null>(null)
  const [copiedPrivate, setCopiedPrivate] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 2. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  })

  // 3. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    
    try {
      // Generate ECDSA key pair
      const keyPair = await generateECDSAKeyPair()
      const privateKeyPEM = await exportPrivateKey(keyPair.privateKey)
      const publicKeyPEM = await exportPublicKey(keyPair.publicKey)

      // Send to backend - register username with public key
      const response = await fetch('http://localhost:3000/api/pubkey/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: values.username, 
          publicKey: publicKeyPEM 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error from backend
        throw new Error(data.message || 'Registration failed')
      }

      // Display the generated keys
      setGeneratedKeys({
        privateKey: privateKeyPEM,
        publicKey: publicKeyPEM,
        username: values.username,
      })

      console.log('Registration successful for:', values.username)
    } catch (error) {
      console.error('Error during registration:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to register. Please try again.'
      setError(errorMessage)
      
      // If it's a username conflict, also set form error
      if (errorMessage.includes('already exists')) {
        form.setError('username', {
          type: 'manual',
          message: errorMessage
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPrivateKey = async () => {
    if (generatedKeys) {
      await navigator.clipboard.writeText(generatedKeys.privateKey)
      setCopiedPrivate(true)
      setTimeout(() => setCopiedPrivate(false), 2000)
    }
  }

  const handleCopyPublicKey = async () => {
    if (generatedKeys) {
      await navigator.clipboard.writeText(generatedKeys.publicKey)
      setCopiedPublic(true)
      setTimeout(() => setCopiedPublic(false), 2000)
    }
  }

  const handleDownloadKeys = () => {
    if (generatedKeys) {
      const content = `DigiSign Key Pair for ${generatedKeys.username}
Generated on: ${new Date().toLocaleString()}

========== PRIVATE KEY (KEEP THIS SECRET!) ==========
${generatedKeys.privateKey}

========== PUBLIC KEY ==========
${generatedKeys.publicKey}

⚠️  WARNING: Store your private key securely!
⚠️  Never share your private key with anyone!
⚠️  You will need this private key to sign documents.
`
      downloadTextFile(`${generatedKeys.username}_keys.txt`, content)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">DigiSign</CardTitle>
          <CardDescription>
            {generatedKeys 
              ? "Your key pair has been generated successfully!" 
              : "Enter your preferred username to get started."}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!generatedKeys ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {error}
                    </p>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Jaki Ganteng..." 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Keys...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              {/* Username Display */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Username
                </label>
                <div className="mt-2 p-3 bg-muted rounded-md font-mono text-sm">
                  {generatedKeys.username}
                </div>
              </div>

              {/* Private Key Display */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                  <Key className="h-4 w-4 text-red-500" />
                  Private Key (Keep Secret!)
                </label>
                <div className="mt-2 relative">
                  <textarea
                    readOnly
                    value={generatedKeys.privateKey}
                    className="w-full h-32 p-3 bg-muted rounded-md font-mono text-xs resize-none"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopyPrivateKey}
                  >
                    {copiedPrivate ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Public Key Display */}
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-500" />
                  Public Key
                </label>
                <div className="mt-2 relative">
                  <textarea
                    readOnly
                    value={generatedKeys.publicKey}
                    className="w-full h-32 p-3 bg-muted rounded-md font-mono text-xs resize-none"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopyPublicKey}
                  >
                    {copiedPublic ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Download Button */}
              <Button 
                className="w-full" 
                onClick={handleDownloadKeys}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Keys as File
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t bg-muted/50 p-6">
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>The registration associates your username with a generated public key.</span>
            </p>
            <p className="flex items-start gap-2">
              <Key className="h-4 w-4 text-foreground shrink-0" />
              <span className="font-semibold">ALWAYS KEEP TRACK OF YOUR KEY PAIR</span>
            </p>
            <p className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span>Once generated it will not be saved.</span>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}