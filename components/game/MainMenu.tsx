"use client";

import { motion } from "framer-motion";
import {
  ChevronLeft,
  Crown,
  LogOut,
  Play,
  RotateCcw,
  ScrollText,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ui } from "@/lib/i18n";
import type { MenuDialog } from "@/types/game";

type MenuAction = {
  id: "new" | "continue" | MenuDialog;
  label: string;
  description: string;
  icon: LucideIcon;
  primary?: boolean;
};

const menuActions: MenuAction[] = [
  {
    id: "new",
    label: ui.menu.newGame.label,
    description: ui.menu.newGame.description,
    icon: Play,
    primary: true,
  },
  {
    id: "continue",
    label: ui.menu.continueGame.label,
    description: ui.menu.continueGame.description,
    icon: RotateCcw,
  },
  {
    id: "online",
    label: ui.menu.online.label,
    description: ui.menu.online.description,
    icon: Users,
  },
  {
    id: "settings",
    label: ui.menu.settings.label,
    description: ui.menu.settings.description,
    icon: Settings,
  },
  {
    id: "achievements",
    label: ui.menu.achievements.label,
    description: ui.menu.achievements.description,
    icon: Crown,
  },
  {
    id: "exit",
    label: ui.menu.exit.label,
    description: ui.menu.exit.description,
    icon: LogOut,
  },
];

export function MainMenu({
  onStart,
  onOpenDialog,
}: {
  onStart: (mode: "new" | "continue") => void;
  onOpenDialog: (dialog: MenuDialog) => void;
}) {
  const activate = (id: MenuAction["id"]) => {
    if (id === "new" || id === "continue") onStart(id);
    else onOpenDialog(id);
  };

  return (
    <motion.main
      className="main-menu-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <section className="menu-panel" aria-label={ui.menu.aria}>
        <div className="brand-lockup">
          <motion.div
            className="brand-crest"
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            aria-hidden="true"
          >
            <Shield />
            <span />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.55 }}
          >
            <p className="brand-eyebrow">{ui.brand.eyebrow}</p>
            <h1>{ui.brand.name}</h1>
            <p className="brand-subtitle">{ui.brand.subtitle}</p>
          </motion.div>
        </div>

        <nav className="menu-actions" aria-label={ui.menu.aria}>
          {menuActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                type="button"
                className={action.primary ? "menu-action is-primary" : "menu-action"}
                onClick={() => activate(action.id)}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.055, duration: 0.4 }}
                whileTap={{ scale: 0.985 }}
              >
                <span className="menu-action-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="menu-action-copy">
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
                <ChevronLeft className="menu-action-arrow" aria-hidden="true" />
              </motion.button>
            );
          })}
        </nav>

        <footer className="menu-footer">
          <span>
            <ScrollText aria-hidden="true" />
            {ui.menu.footer}
          </span>
          <span>{ui.menu.version}</span>
        </footer>
      </section>

      <div className="menu-chapter-card">
        <span className="chapter-rule" aria-hidden="true" />
        <p>{ui.brand.chapter}</p>
        <small>{ui.brand.save}</small>
      </div>
    </motion.main>
  );
}
