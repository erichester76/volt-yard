import Link from "@/app/locale-link";

export default function GiftSentPage() {
  return <main className="purchase-research-page"><section className="hero purchase-research-hero"><div className="wrap">
    <p className="eyebrow">You are all set</p>
    <h1 className="heading-primary">The gift is waiting in your email.</h1>
    <p className="intro">If you are keeping the link, it is there for you to forward whenever the moment feels right. If you picked a date, we will send it then. Either way, they will not get a surprise email today.</p>
    <Link className="inline-cta" href="/black-friday">Give another one</Link>
  </div></section></main>;
}
