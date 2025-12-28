import type { ReactNode, CSSProperties } from "react";

export interface BoxProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  padding?: number | string;
  flexDirection?: "row" | "column";
}
