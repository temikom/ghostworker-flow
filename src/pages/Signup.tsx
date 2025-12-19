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
import { ArrowLeft, ArrowRight, Loader2, Mail, Eye, EyeOff } from "lucide-react";

type SignupStep = 1 | 2 | 3;

export default function Signup() {
  const [step, setStep] = useState<SignupStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(password)) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters with uppercase, lowercase, and numbers.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setStep(3);
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Verification email sent",
      description: "We've sent another verification link to your email.",
    });
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
              />
            </div>

            <Button type="submit" className="w-full" size="lg" variant="brand">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Divider />

            <SocialAuthButtons
              onGoogleClick={() => toast({ title: "Google OAuth", description: "Connect Cloud to enable OAuth" })}
              onMicrosoftClick={() => toast({ title: "Microsoft OAuth", description: "Connect Cloud to enable OAuth" })}
            />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-ghost hover:underline font-medium">
                Sign in
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
              <p className="text-sm text-muted-foreground">Creating account for</p>
              <p className="font-medium text-foreground">{email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" variant="brand" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="text-ghost hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-ghost hover:underline">Privacy Policy</a>
            </p>
          </motion.form>
        );

      case 3:
        return (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-ghost/10 flex items-center justify-center mx-auto animate-pulse-glow">
              <Mail className="w-10 h-10 text-ghost" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Check your email
              </h2>
              <p className="text-muted-foreground">
                We've sent a verification link to
              </p>
              <p className="font-medium text-foreground mt-1">{email}</p>
            </div>

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium">
                Important: Verify your email to access your dashboard
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The link expires in 15 minutes
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Resend verification email
              </Button>
              
              <button
                onClick={() => setStep(1)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
          </motion.div>
        );
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1:
        return "Create your account";
      case 2:
        return "Set your password";
      case 3:
        return "Verify your email";
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 1:
        return "Start automating your conversations in minutes";
      case 2:
        return "Choose a strong password to secure your account";
      case 3:
        return undefined;
    }
  };

  return (
    <AuthLayout title={getTitle()} subtitle={getSubtitle()}>
      <StepIndicator currentStep={step} totalSteps={3} />
      <AnimatePresence mode="wait">
        {getStepContent()}
      </AnimatePresence>
    </AuthLayout>
  );
}
