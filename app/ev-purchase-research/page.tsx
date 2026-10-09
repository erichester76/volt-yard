import Link from "@/app/locale-link";

const paths = [
  ["Owner perspectives", "Compare real ownership experience, charging routines, and the trade-offs people discover after the purchase.", "Explore the community", "/community"],
  ["Practical guides", "Build a better question list with plain-language articles and tutorials for everyday EV ownership.", "Read guides and tutorials", "/journal"],
  ["Pre-purchase inspection", "If an inspection service is available for your vehicle and area, start with the service catalog before you buy.", "Explore inspection services", "/services"],
  ["New-owner essentials", "See available products and packages that can help make your first months of ownership easier.", "Explore owner essentials", "/upgrades"],
] as const;

export default function EvPurchaseResearchPage() {
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">Before you buy</p>
      <h1 className="heading-primary">Research the ownership experience, not just the spec sheet.</h1>
      <p className="intro">Learn what owners wish they had known, build better questions, and decide which next step makes sense for the EV you are considering.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      <div className="home-section-heading"><h2>Get closer to the real decision.</h2><p>Vehicle reviews are not part of Amped Up yet. Until they are, start with owner conversations, practical resources, and the services or essentials that are actually available.</p></div>
      <div className="purchase-research-grid">{paths.map(([title, copy, action, href]) => <article key={href}><h3>{title}</h3><p>{copy}</p><Link href={href}>{action} <span aria-hidden="true">→</span></Link></article>)}</div>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>A confident purchase starts with better context.</h2><p>Availability, compatibility, and next steps vary by vehicle, area, and partner. We will keep building the research tools that help you make the call.</p><Link className="inline-cta" href="/community">Ask owners a question</Link></div></section>
  </main>;
}
