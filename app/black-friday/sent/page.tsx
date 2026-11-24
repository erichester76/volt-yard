import Link from "@/app/locale-link";

export default function GiftSentPage() {
  return <main className="purchase-research-page"><section className="hero purchase-research-hero"><div className="wrap">
    <p className="eyebrow">Gift saved</p>
    <h1 className="heading-primary">Check the email you used at checkout.</h1>
    <p className="intro">If you chose to hold the gift, that email has the private link to forward when you are ready. If you chose a date, we saved it and will email the recipient then. The recipient is not emailed immediately.</p>
    <Link className="inline-cta" href="/black-friday">Buy another gift</Link>
  </div></section></main>;
}
