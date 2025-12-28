import React from "react";
import { View, type ViewStyle } from "react-native";
import type { BoxProps } from "./types";

export const Box = ({
  children,
  style,
  padding,
  flexDirection,
}: BoxProps) => {
  const nativeStyle: ViewStyle = {
    flexDirection: flexDirection || "column",
    padding: typeof padding === "number" ? padding : 0,
    ...(style as ViewStyle),
  };

  return <View style={nativeStyle}>{children}</View>;
};
