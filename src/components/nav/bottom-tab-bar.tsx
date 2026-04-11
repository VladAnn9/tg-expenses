"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  HomeIcon,
  ReceiptIcon,
  WalletIcon,
  PeopleIcon,
  GearIcon,
} from "@/components/ui/icons";

const TABS = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, exact: true },
  { href: "/dashboard/expenses", label: "Expenses", icon: ReceiptIcon },
  { href: "/dashboard/accounts", label: "Accounts", icon: WalletIcon },
  { href: "/dashboard/household", label: "Household", icon: PeopleIcon },
  { href: "/dashboard/settings", label: "Settings", icon: GearIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-sand/30 bg-cream/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="mx-auto flex max-w-2xl justify-around">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 px-3 py-2 transition-colors duration-150 active:scale-95 ${
                active ? "text-sage" : "text-ink-light/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] tracking-wide">{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-0 h-0.5 w-5 rounded-full bg-sage"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
