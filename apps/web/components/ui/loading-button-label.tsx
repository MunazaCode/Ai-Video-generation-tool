import type { ReactNode } from "react";
import { ButtonSpinner } from "./button-spinner";

export function LoadingButtonLabel({
  loading,
  loadingText,
  spinnerSize = "md",
  children,
}: {
  loading: boolean;
  loadingText: string;
  spinnerSize?: "sm" | "md";
  children: ReactNode;
}) {
  if (!loading) {
    return <>{children}</>;
  }
  return (
    <>
      <ButtonSpinner size={spinnerSize} />
      <span>{loadingText}</span>
    </>
  );
}
