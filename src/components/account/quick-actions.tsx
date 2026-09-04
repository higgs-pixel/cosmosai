import Link from "next/link";
import { ArrowUpRight, BookOpen, Globe2, ImageIcon, MessageCircle, Star } from "lucide-react";

const actions = [
  { title: "Earth Dashboard", href: "/earth", icon: Globe2 },
  { title: "NASA Images", href: "/image-explorer", icon: ImageIcon },
  { title: "Orbit Tracker", href: "/orbit", icon: Globe2 },
  { title: "Read Blog", href: "/blog", icon: BookOpen },
  { title: "View Saved", href: "/discoveries", icon: Star },
];

export function QuickActions() {
  return (
    <section className="rounded-xl border border-white/5 bg-[#0F1115] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Quick Actions</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-gray-100">Jump back into COSMOS.</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-xl border border-white/5 bg-[#08090D] p-4 transition hover:bg-[#16181D] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-300" />
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-100">{action.title}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
