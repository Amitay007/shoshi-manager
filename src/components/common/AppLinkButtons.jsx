import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Building2, CreditCard, ExternalLink } from "lucide-react";

function ExternalLinkButton({ label, icon, href, size = "default", stopPropagation = true }) {
  const disabled = !href || String(href).trim() === "";
  const onAnchorClick = (e) => {
    if (stopPropagation) e.stopPropagation();
  };
  if (disabled) {
    return (
      <Button variant="outline" disabled size={size} className="gap-2 opacity-60">
        {icon}
        {label}
      </Button>);

  }
  const safeHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <Button asChild size={size} className="gap-2">
      <a href={safeHref} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick} className="bg-primary text-primary-foreground px-1 text-xs font-medium rounded-none inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-8 gap-2">
        {icon}
        {label}
        <ExternalLink className="w-4 h-4 opacity-70" />
      </a>
    </Button>);

}

export default function AppLinkButtons({
  storeLink,
  websiteLink,
  subscriptionLink,
  compact = false,
  className = "",
  stopPropagation = true
}) {
  const size = compact ? "sm" : "default";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <ExternalLinkButton
        label="מנוי"
        icon={<CreditCard className="w-4 h-4" />}
        href={subscriptionLink}
        size={size}
        stopPropagation={stopPropagation} />

      <ExternalLinkButton
        label="חנות"
        icon={<ShoppingBag className="w-4 h-4" />}
        href={storeLink}
        size={size}
        stopPropagation={stopPropagation} />

      <ExternalLinkButton
        label="חברה"
        icon={<Building2 className="w-4 h-4" />}
        href={websiteLink}
        size={size}
        stopPropagation={stopPropagation} />

    </div>);

}