import React from "react";
import clsx from "clsx";

type PropsWithChildren = { children: React.ReactNode; className?: string };

export const Card: React.FC<PropsWithChildren> = ({ children, className }) => {
  return (
    <div className={clsx("bg-white rounded-xl shadow-md p-4", className)}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<PropsWithChildren> = ({ children, className }) => (
  <div className={clsx("mb-4", className)}>{children}</div>
);

export const CardTitle: React.FC<PropsWithChildren & { as?: string }> = ({
  children,
  className,
  as: As = "h3",
}) => {
  const Tag = As as any;
  return (
    <Tag className={clsx("text-lg font-semibold text-gray-800", className)}>
      {children}
    </Tag>
  );
};

export const CardDescription: React.FC<PropsWithChildren> = ({ children, className }) => (
  <p className={clsx("text-sm text-gray-500", className)}>{children}</p>
);

export const CardContent: React.FC<PropsWithChildren> = ({ children, className }) => (
  <div className={clsx("pt-2", className)}>{children}</div>
);
