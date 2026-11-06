import type { ReactNode } from "react";
import { CollaborationCredit } from "@/components/marketplace/collaboration-credit";
import { getAppBySlug } from "@/lib/data/apps";
import { collaboratorNamesByApp } from "@/lib/data/collaborations";

export default async function CorbinEmailGuruLayout({ children }: { children: ReactNode }) {
  const app = await getAppBySlug("corbin-email-guru");
  const collaborators = app ? await collaboratorNamesByApp([app.id]) : new Map<string, string[]>();
  const names = app ? (collaborators.get(app.id) ?? []) : [];

  return (
    <>
      {names.length > 0 ? (
        <div className="bg-slate-50 px-6 pt-6">
          <CollaborationCredit names={names} />
        </div>
      ) : null}
      {children}
    </>
  );
}
