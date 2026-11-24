import Link from "@/app/locale-link";
import { CatalogTeaser } from "@/app/catalog-teaser";
import { Button } from "@/app/page-primitives";

export function GiftLandingView({
  amountLabel,
  message,
  claimed,
  claiming,
  preview,
  recipientEmail,
  onClaim,
}: {
  amountLabel: string;
  message: string;
  claimed: boolean;
  claiming: boolean;
  preview?: boolean;
  recipientEmail?: string;
  onClaim?: () => void;
}) {
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">{preview ? "You just scored big!" : "Your gift"}</p>
      <h1 className="heading-primary">{amountLabel ? `${amountLabel} and full network access` : "A gift is waiting."}</h1>
      <p className="intro">Whether this is your first day or your fifth year with your EV, someone just gave you a way to make the experience better. Amped Up is the place for better answers, the right parts, and the right specialist to get you and your car where you want to go. This gift is your entry to the Amped Up Network. Enjoy.</p>
      <CatalogTeaser compact title="The credit can go to things like" />
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      {message && <p className="form-message" role="status">{message}</p>}
      {amountLabel && <div className="purchase-research-grid gift-landing-grid">
        <article><h3>A home for the car</h3><p>Amped Up is the place EV owners were missing. Better answers. Specialists who actually work on these cars. A record that follows you, so the next question does not start from zero.</p></article>
        <article><h3>A serious gift</h3><p>Ninety days inside, normally $27. Ask, reply, vote, and keep the story of the car in one place. Plus {amountLabel} already set aside for service or an upgrade, whenever you want it.</p></article>
        <article><h3>You just got in</h3><p>{claimed ? "The network is open. The credit is ready when you want it." : "Someone just handed you the membership, the credit, and a place built for this car. That is a lot of access."}</p>{recipientEmail && !claimed && <p className="gift-landing-email">Open it with {recipientEmail}.</p>}{!claimed && !preview && <Button disabled={claiming} onClick={onClaim}>{claiming ? "Opening your gift..." : "Open my gift"}</Button>}</article>
      </div>}
    </div></section>
    {claimed && <section className="purchase-research-close"><div className="wrap"><h2>Go use it.</h2><p>Look at service, upgrades, or what other owners already figured out.</p><Link className="inline-cta" href="/services">Browse services</Link></div></section>}
  </main>;
}
