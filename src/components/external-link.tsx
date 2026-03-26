import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn, isExternalHref } from "@/lib/utils";

type ExternalLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> & {
    href: string;
    children: ReactNode;
  };

export function ExternalLink({
  href,
  className,
  children,
  ...props
}: ExternalLinkProps) {
  const isExternal = isExternalHref(href);
  return (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cn("interactive-link", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
