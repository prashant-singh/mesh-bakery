"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, RefreshCw, Truck, MessageCircle, Instagram } from 'lucide-react';
import { FeaturedAnnouncement, type FeaturedConfig } from '@/components/FeaturedAnnouncement';
import { fetchFeaturedConfig } from '@/lib/featuredConfig';

export default function ReturnPolicyPage() {
	// Hardcoded URLs to match your main configuration
	const instagramHref = "https://www.instagram.com/meshbakeryprints/";
	const whatsappHref = `https://wa.me/919999999999?text=${encodeURIComponent("Hi Mesh Bakery! I have a question regarding your returns and refunds policy.")}`;
	const [featuredConfig, setFeaturedConfig] = React.useState<FeaturedConfig | null>(null);

	React.useEffect(() => {
		fetchFeaturedConfig()
			.then(data => setFeaturedConfig(data))
			.catch(err => console.error('Failed to load featured config', err));
	}, []);

	return (
		<div className="min-h-screen flex flex-col bg-[#fbf7f2] font-sans selection:bg-[#ff6b35]/20">

			{/* Header matching main layout style */}
			<header className="px-6 md:px-12 py-6 md:py-8 grid grid-cols-3 items-center">
				<div>
					<Link
						href="/"
						className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2d2a26]/60 hover:text-[#2d2a26] transition-colors"
					>
						<ArrowLeft className="h-3 w-3" /> back
					</Link>
				</div>
				<div className="flex items-center justify-center gap-2 md:gap-3">
					<div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
						<div className="w-3 h-3 bg-white rounded-sm rotate-12" />
					</div>
					<span className="text-[clamp(1rem,4vw,1.25rem)] font-serif font-light tracking-[0.02em] text-[#2d2a26] whitespace-nowrap">
						mesh bakery
					</span>
				</div>
				<div />
			</header>

			<FeaturedAnnouncement config={featuredConfig} className="pb-4 md:pb-6" />

			{/* Main Content Area */}
			<main className="flex-1 max-w-3xl mx-auto w-full px-6 pb-24 pt-4 md:pt-8">

				{/* Page Intro Block */}
				<div className="mb-12 relative">
					<div className="absolute -top-10 -right-10 w-[250px] h-[250px] bg-[#e9e4db]/40 rounded-full blur-3xl -z-10" />
					<span className="text-[10px] font-bold tracking-widest uppercase text-[#5b6346]">customer care</span>
					<h1 className="text-4xl md:text-5xl font-serif font-light text-[#2d2a26] mt-2 mb-4 leading-[1.1]">
						returns &amp; <span className="text-[#5b6346] italic">refunds.</span>
					</h1>
					<p className="text-[#3d3a36] opacity-60 text-sm leading-relaxed">
						uncomplicating things so you can focus on building your collection.
					</p>
				</div>

				{/* Content Cards Layout */}
				<div className="flex flex-col gap-6">

					{/* Section 1: Custom 3D Prints */}
					<div className="flex flex-col rounded-[18px] border border-[#e9e4db] p-6 md:p-8 bg-white shadow-[0_4px_20px_rgba(45,42,38,0.02)]">
						<div className="flex items-center gap-2 text-[#ff6b35] mb-3">
							<ShieldCheck className="h-4 w-4" />
							<h2 className="text-[11px] font-bold uppercase tracking-widest">custom 3D prints</h2>
						</div>
						<p className="text-sm text-[#3d3a36] opacity-80 leading-relaxed">
							Because our pieces (including keychains, desk toys, and bookmarks) are uniquely manufactured and custom-made to order, they are generally **exempt from standard returns** unless they sustain damage during transit or exhibit explicit fabrication defects.
						</p>
					</div>

					{/* Section 3: Damaged Items */}
					<div className="flex flex-col rounded-[18px] border border-[#e9e4db] p-6 md:p-8 bg-white shadow-[0_4px_20px_rgba(45,42,38,0.02)]">
						<div className="flex items-center gap-2 text-[#2d2a26] mb-3">
							<Truck className="h-4 w-4" />
							<h2 className="text-[11px] font-bold uppercase tracking-widest">damaged items policy</h2>
						</div>
						<p className="text-sm text-[#3d3a36] opacity-80 leading-relaxed">
							If a parcel catches an accidental break along its path, drop us a line within **48 hours of delivery**. To help us process a claim, please share a quick, continuous **unboxing video** showing the unopened package and the damaged item inside. Once verified, we will immediately fast-track a replacement print out to your workshop.
						</p>
					</div>

					{/* Section 4: Refund Processing */}
					<div className="flex flex-col rounded-[18px] border border-[#e9e4db] p-6 md:p-8 bg-white shadow-[0_4px_20px_rgba(45,42,38,0.02)]">
						<h2 className="text-[11px] font-bold uppercase tracking-widest text-[#2d2a26]/50 mb-3">processing timeline</h2>
						<p className="text-sm text-[#3d3a36] opacity-80 leading-relaxed">
							Approved adjustments post-inspection route straight back to your baseline funding platform. Please allow a standard **5 to 7 business days** for financial institutions to resolve and post the credits into your account balance.
						</p>
					</div>

					{/* Support CTA Panel matching the side layout of your main modall buttons */}
					<div className="mt-4 p-6 md:p-8 rounded-[24px] bg-[#f0ebe3] border border-[#e9e4db] text-center flex flex-col items-center max-w-md mx-auto w-full">
						<h3 className="text-lg font-serif font-light text-[#2d2a26] mb-2">still have questions?</h3>
						<p className="text-xs text-[#3d3a36] opacity-60 mb-6 leading-relaxed">
							We are a human-run studio. Let us know if something went wrong with your prints and we will make it right.
						</p>

						<div className="w-full flex flex-col gap-2">

							<a
								href={instagramHref}
								target="_blank"
								rel="noopener noreferrer"
								className="w-full bg-[#2d2a26] text-[#faf8f5] h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-widest hover:bg-[#1f1c19] transition-colors duration-150"
							>
								<Instagram className="h-4 w-4" />
								dm on instagram
							</a>
						</div>
					</div>

				</div>
			</main>

			{/* Footer matching your exact setup */}
			<footer className="w-full bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
				<div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="text-xs">
						&copy; {new Date().getFullYear()} MeshBakery
					</div>
					<div className="flex items-center gap-6 text-sm">
						<Link
							href="/"
							className="hover:text-white transition-colors underline underline-offset-4 decoration-slate-700 hover:decoration-white"
						>
							Return to Shop
						</Link>
						<span className="h-4 w-px bg-slate-800 hidden sm:block" />
						<a
							href={instagramHref}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 hover:text-white transition-colors group"
							aria-label="Follow us on Instagram"
						>
							<Instagram className="h-4 w-4 text-slate-400 group-hover:text-pink-500 transition-colors" />
							<span className="font-medium">Instagram</span>
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
