"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyGiftRedirect() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  useEffect(() => {
    if (token) router.replace(`/gift-landing/${token}`);
  }, [router, token]);
  return <main className="purchase-research-page"><section className="hero purchase-research-hero"><div className="wrap"><p>Opening your gift...</p></div></section></main>;
}
