import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ShoppingCart, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Orders() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
            <p className="text-muted-foreground">
              Track orders extracted from conversations.
            </p>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </motion.div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-ghost/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-ghost" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No orders yet
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Orders will appear here once your AI starts extracting them from customer conversations.
          </p>
          <Button variant="brand">
            Learn how order extraction works
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
