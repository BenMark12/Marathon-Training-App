"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.scss";

const planIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h4l3-8 4 16 3-8h4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const accountIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
  </svg>
);

const matchPlans = (p: string) => p === "/dashboard" || p.startsWith("/plans");
const matchAccount = (p: string) => p.startsWith("/account");

export function BottomNav({ singlePlanId }: { singlePlanId?: string }) {
  const pathname = usePathname();

  const items = [
    {
      href: singlePlanId ? `/plans/${singlePlanId}` : "/dashboard",
      label: singlePlanId ? "Plan" : "Plans",
      match: matchPlans,
      icon: planIcon,
    },
    {
      href: "/account",
      label: "Account",
      match: matchAccount,
      icon: accountIcon,
    },
  ];

  return (
    <nav className={styles.nav} aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`${styles.link} ${item.match(pathname) ? styles.active : ""}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
