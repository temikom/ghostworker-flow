import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  {
    label: "Total Conversations",
    value: "1,284",
    change: "+12.5%",
    trend: "up",
    icon: MessageSquare,
  },
  {
    label: "Active Users",
    value: "892",
    change: "+8.2%",
    trend: "up",
    icon: Users,
  },
  {
    label: "Orders Today",
    value: "47",
    change: "+23.1%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    label: "Response Rate",
    value: "98.5%",
    change: "-0.3%",
    trend: "down",
    icon: TrendingUp,
  },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Good morning, John
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your automations today.
            </p>
          </div>
          <Link to="/dashboard/integrations">
            <Button variant="brand">
              <Plus className="w-4 h-4 mr-2" />
              Add integration
            </Button>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-ghost/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-ghost" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  stat.trend === "up" ? "text-success" : "text-destructive"
                )}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions / Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-ghost/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-ghost" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Ready to automate?
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Connect your first messaging channel to start automating conversations with AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/dashboard/integrations">
              <Button variant="brand">
                Connect WhatsApp
              </Button>
            </Link>
            <Link to="/dashboard/integrations">
              <Button variant="outline">
                Connect Instagram
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl border border-border"
        >
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Conversations</h3>
          </div>
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              No conversations yet. Connect an integration to get started.
            </p>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
