import Link from "@/app/locale-link";
import { Button } from "@/app/page-primitives";

export function GiftLandingView({
  amountLabel,
  message,
  claimed,
  claiming,
  signedIn,
  preview,
  onClaim,
}: {
  amountLabel: string;
  message: string;
  claimed: boolean;
  claiming: boolean;
  signedIn: boolean;
  preview?: boolean;
  onClaim?: () => void;
}) {
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">{preview ? "Example" : "Your gift"}</p>
      <h1 className="heading-primary">{amountLabel ? `${amountLabel} to make the car easier to own` : "A gift is waiting."}</h1>
      <p className="intro">Whether this is your first day or your fifth year with your EV, someone just gave you a way to make the experience better. Amped Up is the place for better answers, the right parts, and the right specialist to get you and your car where you want to go. This gift is your entry to the Amped Up Network. Enjoy.</p>
      {preview && <p className="gift-offer-limit">Their private link looks like this. The amount will be the one you choose.</p>}
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      {message && <p className="form-message" role="status">{message}</p>}
      {amountLabel && <div className="purchase-research-grid">
        <article><h3>90 days inside</h3><p>Membership is normally $9 a month, so this gift covers $27. It lets you keep a history of the car and join the owner conversation. Reading is free. These three months let you take part.</p></article>
        <article><h3>{amountLabel} for the work</h3><p>Spend it on any service or upgrade. It will not book the visit or pick the shop. You still choose.</p></article>
        <article><h3>Make it yours</h3><p>{claimed ? "Your membership is started and the credit is ready at checkout." : preview ? "They create their own account from this page, then claim the membership and credit." : signedIn ? "Claiming puts the membership and credit in your name." : "Create your own account when you want the gift in your name."}</p>{!claimed && !preview && <Button disabled={claiming} onClick={onClaim}>{claiming ? "Opening your gift..." : "Claim my gift"}</Button>}</article>
      </div>}
    </div></section>
    {claimed && <section className="purchase-research-close"><div className="wrap"><h2>Go use it.</h2><p>Look at service, upgrades, or what other owners already figured out.</p><Link className="inline-cta" href="/services">Browse services</Link></div></section>}
  </main>;
}
