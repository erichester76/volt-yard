import Link from "@/app/locale-link";

export default function CheckoutSuccessPage() {
  return <main className="commerce wrap"><section className="checkout-success"><p className="eyebrow">Payment received</p><h1>Your request is in motion.</h1><p>We confirm payment through Stripe webhooks before notifying compatible installers. You will hear from the installer that claims your request.</p><Link href="/catalog">Browse more services & upgrades</Link></section></main>;
}
