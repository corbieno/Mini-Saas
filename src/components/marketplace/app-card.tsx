import Link from "next/link";
import { ListingImage } from "@/components/marketplace/listing-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MarketplaceAppCardProps {
  title: string;
  description: string;
  category: string;
  creator?: string;
  price: string;
  href: string;
  tags?: string[];
  imageUrl?: string | null;
  showImage?: boolean;
}

export function MarketplaceAppCard({
  title,
  description,
  category,
  creator,
  price,
  href,
  tags = [],
  imageUrl = null,
  showImage = false,
}: MarketplaceAppCardProps) {
  const showFrame = showImage || Boolean(imageUrl);
  return (
    <Card className={cn("flex h-full flex-col border-slate-200", showFrame && "pt-0")}>
      {showFrame ? (
        <div className="relative aspect-[16/10] border-b border-slate-200">
          <ListingImage
            src={imageUrl}
            alt={imageUrl ? `${title} cover` : ""}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
      ) : null}
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline">{category}</Badge>
          <span className="text-xs text-slate-500">{creator ?? "—"}</span>
        </div>
        <CardTitle className="text-xl font-semibold text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-600">{description}</p>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Starting at</p>
            <p className="text-lg font-semibold text-slate-900">{price}</p>
          </div>
          <Button asChild>
            <Link href={href}>View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
