"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthNavLink } from "@/components/auth/auth-nav-link";
import { homepageNavigationLinks } from "./homepage-contract";

export function GlassNav() {
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(".cosmos-aryan-home");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      setHidden(currentScrollY > lastScrollY.current && currentScrollY > 100);
      lastScrollY.current = currentScrollY;
    };
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-28 transition-transform duration-700 ease-in-out ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/40 to-transparent" />
      <div className="pointer-events-auto relative z-10 mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6 pt-4 md:px-8 lg:px-12">
        <Link
          href="/"
          data-cursor-link="true"
          className="aryan-cursor-target group flex items-center gap-4"
          aria-label="COSMOS AI home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white shadow-lg">
            <Image
              src="/home/aryan/logo.png"
              alt=""
              fill
              sizes="36px"
              className="object-contain p-1"
              priority
            />
          </span>
          <span className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-white drop-shadow-sm">
            COSMOS AI
          </span>
        </Link>

        <nav
          className="hidden items-center gap-8 font-sans text-sm font-semibold text-gray-200 md:flex"
          aria-label="Primary navigation"
        >
          {homepageNavigationLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-cursor-link="true"
              className="aryan-cursor-target transition-colors hover:text-[#00E5FF]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <AuthNavLink variant="aryan" />
        </div>

        <button
          type="button"
          className="aryan-cursor-target grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-black/65 text-white backdrop-blur-md md:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="aryan-mobile-navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div
          id="aryan-mobile-navigation"
          className={`absolute right-6 top-[4.75rem] w-[min(19rem,calc(100vw-3rem))] rounded-xl border border-white/15 bg-black/95 p-3 shadow-2xl backdrop-blur-xl transition duration-300 md:hidden ${mobileOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
        >
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {homepageNavigationLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 hover:text-[#00E5FF]"
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/about"
              className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 hover:text-[#00E5FF]"
              onClick={closeMobileMenu}
            >
              About
            </Link>
          </nav>
          <div className="mt-2 border-t border-white/10 pt-3">
            <AuthNavLink variant="aryan" className="w-full" />
          </div>
        </div>
      </div>
    </header>
  );
}
