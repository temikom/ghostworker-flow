import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Shield, 
  Zap, 
  ArrowRight, 
  Check,
  Bot,
  Lock,
  Workflow
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="brand">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-ghost/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ghost/10 text-ghost text-sm font-medium">
                <Zap className="w-4 h-4" />
                Enterprise-grade AI automation
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground leading-tight mb-6"
            >
              Automate conversations.
              <br />
              <span className="text-gradient-ghost">Scale effortlessly.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              GhostWorker handles your WhatsApp, Instagram, and Messenger conversations 
              with AI precision. Simpler than Google, more secure than most.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/signup">
                <Button variant="hero" size="xl" className="group">
                  Start for free
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button variant="hero-secondary" size="xl">
                Watch demo
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                <span>Bank-level encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-success" />
                <span>GDPR compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>SOC2 ready</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-semibold text-foreground mb-4"
            >
              Everything you need to automate
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              One platform. All your messaging channels. Powered by AI.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "Multi-channel inbox",
                description: "WhatsApp, Instagram, Messenger — all in one unified inbox. Never miss a conversation."
              },
              {
                icon: Bot,
                title: "AI-powered responses",
                description: "Smart automation that understands intent, extracts orders, and responds naturally."
              },
              {
                icon: Workflow,
                title: "Workflow automation",
                description: "Connect to n8n, webhooks, and your existing tools. Automate beyond messaging."
              },
              {
                icon: Shield,
                title: "Enterprise security",
                description: "OAuth, email verification, rate limiting, and audit logs. Built for compliance."
              },
              {
                icon: Zap,
                title: "Instant setup",
                description: "Connect your channels in minutes. No complex configurations required."
              },
              {
                icon: Lock,
                title: "Human override",
                description: "Stay in control. Jump in anytime when human touch is needed."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border"
              >
                <div className="w-12 h-12 rounded-lg bg-ghost/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-ghost" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center bg-primary rounded-2xl p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-semibold text-primary-foreground mb-4">
                Ready to automate your conversations?
              </h2>
              <p className="text-primary-foreground/70 text-lg mb-8">
                Join thousands of businesses using GhostWorker to scale their messaging.
              </p>
              <Link to="/signup">
                <Button 
                  size="xl" 
                  className="bg-ghost text-ghost-foreground hover:bg-ghost/90 shadow-ghost"
                >
                  Get started for free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo />
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 GhostWorker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
