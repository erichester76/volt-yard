import Link from "@/app/locale-link";

export default function GiftSentPage() {
  return <main className="purchase-research-page"><section className="hero purchase-research-hero"><div className="wrap">
    <p className="eyebrow">Gift link on the way</p>
    <h1 className="heading-primary">Check the email you entered.</h1>
    <p className="intro">If payment succeeds, that inbox receives a private link you can forward. The recipient uses the link to learn about the gift and create their own account. You do not need one.</p>
    <Link className="inline-cta" href="/black-friday">Buy another gift</Link>
  </div></section></main>;
}
