import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicRegistrationForm from "@/components/registration/PublicRegistrationForm";
import HexBackground from "@/components/HexBackground";
import {
  getFormAvailability,
  getFormBannerUrl,
  getRegistrationFormBySlug,
} from "@/lib/registrations";
import { RESERVED_SLUGS } from "@/lib/registration-types";
import { getResolvedSiteEvents } from "@/lib/site-events";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};

  const form = await getRegistrationFormBySlug(slug);
  if (!form) return {};

  return {
    title: `${form.title} | MazeX`,
    description: form.description ?? `Register for ${form.title}`,
  };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;

  // Hard-stop on reserved paths so they continue to their own Next.js routes.
  if (RESERVED_SLUGS.has(slug)) {
    notFound();
  }

  const form = await getRegistrationFormBySlug(slug);
  if (!form) notFound();

  const availability = getFormAvailability(form);
  const bannerUrl = form.bannerFileId ? getFormBannerUrl(form.bannerFileId) : null;
  const siteEvents = await getResolvedSiteEvents();

  return (
    <>
      <Navbar registerHref={siteEvents.competition.navbarHref} />
      <main className="site-shell min-h-screen">
        <div aria-hidden="true" className="site-background">
          <div className="site-background-glow site-background-glow-primary" />
          <div className="site-background-glow site-background-glow-secondary" />
          <div className="site-background-glow site-background-glow-tertiary" />
          <HexBackground opacity={0.3} />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
          {bannerUrl && (
            <div className="mb-8 w-full overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl sm:mb-12">
              <div className="relative aspect-[21/9] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl}
                  alt={form.title}
                  className="h-full w-full object-cover"
                />
                {/* Optional: leave a very subtle gradient or remove it if pure image is preferred */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/40 to-transparent pointer-events-none" />
              </div>
            </div>
          )}

          <div className={`mb-4 sm:mb-6 ${!bannerUrl ? "text-center" : ""}`}>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md ${
                availability.state === "open"
                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                  : availability.state === "closed"
                    ? "border-rose-500/40 bg-rose-500/20 text-rose-200"
                    : "border-amber-500/40 bg-amber-500/20 text-amber-200"
              }`}
            >
              {availability.label}
            </span>
            <h1 className={`mt-4 font-bold tracking-tight text-white ${!bannerUrl ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-5xl"}`}>
              {form.title}
            </h1>
          </div>

          {/* Descriptions and info below banner or title */}
          <div className="mb-10 sm:mb-12">
            {form.description && (
              <p className="text-lg leading-relaxed text-slate-300">
                {form.description}
              </p>
            )}
            {availability.description && (
              <p className="mt-8 text-sm font-medium text-slate-400">
                {availability.description}
              </p>
            )}
          </div>

          <div className="relative z-10 overflow-hidden rounded-[2rem] border border-white/5 bg-[#030712] shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <PublicRegistrationForm
              form={form}
              availability={availability}
              slug={slug}
            />
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
