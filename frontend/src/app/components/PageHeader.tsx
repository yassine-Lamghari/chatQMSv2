import type { ReactNode } from "react";
import Link from "next/link";

type PageHeaderProps = {
  title: string;
  backHref: string;
  backLabel: string;
  meta?: ReactNode;
};

export default function PageHeader({ title, backHref, backLabel, meta }: PageHeaderProps) {
  return (
    <header className="page-header page-header-mobile">
      <Link href={backHref} className="page-header-back">
        {backLabel}
      </Link>
      <div className="page-header-divider" />
      <h1 className="page-header-title">{title}</h1>
      {meta && <div className="page-header-meta">{meta}</div>}
    </header>
  );
}
