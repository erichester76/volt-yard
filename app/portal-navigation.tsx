import Link from "next/link";

export function AdminNavigation() {
  return (
    <nav className="portal-links" aria-label="Administration navigation">
      <Link href="/admin">Shop approvals &amp; change requests</Link>
      <Link href="/admin/catalog">Services &amp; catalog</Link>
      <Link href="/admin/community">Community moderation</Link>
       <Link href="/admin/memberships">Memberships &amp; expert payouts</Link>
       <Link href="/admin/translations">Translations</Link>
    </nav>
  );
}

export function PartnerNavigation() {
  return (
    <nav className="portal-links" aria-label="Partner navigation">
      <Link href="/portal">Shop profile &amp; change requests</Link>
      <Link href="/installer/work">Work queue &amp; managed fulfillment</Link>
      <Link href="/expert-work">Expert jobs</Link>
    </nav>
  );
}
