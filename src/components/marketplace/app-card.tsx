import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MarketplaceAppCardProps {
  title: string;
  description: string;
  category: string;
  creator?: string;
  price: string;
  href: string;
  tags?: string[];
}

export function MarketplaceAppCard({ title, description, category, creator, price, href, tags = [] }: MarketplaceAppCardProps) {
  return (
    <Card className="flex h-full flex-col border-slate-200">
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
