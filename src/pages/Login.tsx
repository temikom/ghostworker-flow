import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLayout } from "@/components/AuthLayout";
import { StepIndicator } from "@/components/StepIndicator";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { Divider } from "@/components/Divider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, getErrorMessage, isAccountLocked, isEmailUnverified, isRateLimited } from "@/lib/api";
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

type LoginStep = 1 | 2;

export default function Login() {
  const [step, setStep] = useState<LoginStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, checkEmail } = useAuth();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { exists, providers } = await checkEmail(email);
      
      if (!exists) {
        toast({
          title: "Account not found",
          description: "No account found with this email. Would you like to sign up?",
          variant: "destructive",
        });
        return;
      }

      // If user has OAuth providers but no password, show different message
      if (providers.length > 0 && !exists) {
        toast({
          title: "Sign in with " + providers[0],
          description: `This account uses ${providers.join(", ")} for sign in.`,
        });
        return;
      }

      setStep(2);
    } catch (error) {
      if (isRateLimited(error)) {
        toast({
          title: "Too many requests",
          description: "Please wait a moment and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
    } catch (error) {
      if (isAccountLocked(error)) {
        navigate(`/account-locked?email=${encodeURIComponent(email)}`);
        return;
      }
      
      if (isEmailUnverified(error)) {
        toast({
          title: "Email not verified",
          description: "Please check your email and verify your account first.",
          variant: "destructive",
        });
        return;
      }

      if (isRateLimited(error)) {
        toast({
          title: "Too many attempts",
          description: "Please wait a moment and try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sign in failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthClick = async (provider: 'google' | 'microsoft') => {
    try {
      const { url } = await authApi.getOAuthUrl(provider);
      window.location.href = url;
    } catch (error) {
      toast({
        title: "OAuth unavailable",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.form
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleEmailSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" variant="brand" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <Divider />

            <SocialAuthButtons
              onGoogleClick={() => handleOAuthClick('google')}
              onMicrosoftClick={() => handleOAuthClick('microsoft')}
            />

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-ghost hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </motion.form>
        );

      case 2:
        return (
          <motion.form
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handlePasswordSubmit}
            className="space-y-6"
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground">Signing in as</p>
              <p className="font-medium text-foreground">{email}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-ghost hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" variant="brand" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.form>
        );
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1:
        return "Welcome back";
      case 2:
        return "Enter your password";
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 1:
        return "Sign in to continue to GhostWorker";
      case 2:
        return undefined;
    }
  };

  return (
    <AuthLayout title={getTitle()} subtitle={getSubtitle()}>
      <StepIndicator currentStep={step} totalSteps={2} />
      <AnimatePresence mode="wait">
        {getStepContent()}
      </AnimatePresence>
    </AuthLayout>
  );
}
