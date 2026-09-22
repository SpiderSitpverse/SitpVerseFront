import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

export function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const animated = useAnimatedCounter(value);
  return <span className={className}>{animated.toLocaleString("es-CO")}</span>;
}
