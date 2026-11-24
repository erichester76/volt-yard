import Link from "@/app/locale-link";
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
      <p className="eyebrow">{preview ? "A look at the gift" : "Your gift"}</p>
      <h1 className="heading-primary">{amountLabel ? `${amountLabel} to make the car easier to own` : "A gift is waiting."}</h1>
      <p className="intro">Whether this is your first day or your fifth year with your EV, someone just gave you a way to make the experience better. Amped Up is the place for better answers, the right parts, and the right specialist to get you and your car where you want to go. This gift is your entry to the Amped Up Network. Enjoy.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      {message && <p className="form-message" role="status">{message}</p>}
      {amountLabel && <div className="purchase-research-grid">
        <article><h3>Three months with us</h3><p>Membership is normally $9 a month. This gift covers $27, so you can keep a history of the car and join the conversation. Reading is free. These three months let you take part.</p></article>
        <article><h3>{amountLabel} for the work</h3><p>Use it on any service or upgrade, whenever the car needs it. You still choose the shop and the visit.</p></article>
        <article><h3>Make it yours</h3><p>{claimed ? "You are in. The credit is ready when you want to use it." : recipientEmail ? `Open it with ${recipientEmail}. That is the email this gift was bought for.` : "Open it when you are ready. It stays with you."}</p>{!claimed && !preview && <Button disabled={claiming} onClick={onClaim}>{claiming ? "Opening your gift..." : "Open my gift"}</Button>}</article>
      </div>}
    </div></section>
    {claimed && <section className="purchase-research-close"><div className="wrap"><h2>Go use it.</h2><p>Look at service, upgrades, or what other owners already figured out.</p><Link className="inline-cta" href="/services">Browse services</Link></div></section>}
  </main>;
}
