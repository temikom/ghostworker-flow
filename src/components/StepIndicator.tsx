import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={index} className="flex items-center">
            <motion.div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                isCompleted && "bg-success text-success-foreground",
                isCurrent && "bg-ghost text-ghost-foreground shadow-ghost",
                !isCompleted && !isCurrent && "bg-secondary text-muted-foreground"
              )}
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                stepNumber
              )}
            </motion.div>
            
            {index < totalSteps - 1 && (
              <div 
                className={cn(
                  "w-12 h-0.5 mx-1 transition-colors duration-300",
                  stepNumber < currentStep ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
