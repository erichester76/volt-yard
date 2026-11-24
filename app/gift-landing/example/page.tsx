import { giftCreditMinimumCents } from "@/lib/gift-offers";
import { GiftLandingView } from "../gift-landing-view";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function GiftLandingExamplePage() {
  return <GiftLandingView amountLabel={money(giftCreditMinimumCents)} message="" claimed={false} claiming={false} signedIn={false} preview />;
}
