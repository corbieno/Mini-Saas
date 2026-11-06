import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadTs(relativePath) {
  const filename = join(root, relativePath);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
    fileName: filename,
  });
  const loaded = { exports: {} };
  vm.runInNewContext(outputText, { exports: loaded.exports, module: loaded, require, console }, { filename });
  return loaded.exports;
}

const similarity = loadTs("src/lib/collaboration/similarity.ts");
const format = loadTs("src/lib/format.ts");

function listing(overrides) {
  return {
    id: "app-a",
    creatorId: "creator-a",
    title: "Listing",
    category: "Operations",
    summary: "",
    description: "",
    tags: [],
    ...overrides,
  };
}

test("same category alone is not a match", () => {
  const result = similarity.assessListingSimilarity(
    listing({ category: "Sales Ops", title: "Pipeline Pulse" }),
    listing({ id: "app-b", creatorId: "creator-b", category: "Sales Ops", title: "Finance Sitter" }),
  );
  assert.equal(result.similar, false);
  assert.equal(result.sameCategory, true);
});

test("same category plus one overlapping word is a match", () => {
  const result = similarity.assessListingSimilarity(
    listing({
      category: "Sales Ops",
      title: "Outreach Cadence",
      summary: "Personalized outreach for account teams",
    }),
    listing({
      id: "app-b",
      creatorId: "creator-b",
      category: "sales ops",
      title: "Sequence Desk",
      description: "Build an outreach sequence your reps can send",
    }),
  );
  assert.equal(result.similar, true);
  assert.deepEqual([...result.sharedTerms], ["outreach"]);
  assert.ok(result.reasons.some((reason) => reason === "Same category: Sales Ops"));
  assert.equal(result.score, 4);
});

test("two shared tags match across categories", () => {
  const result = similarity.assessListingSimilarity(
    listing({ category: "Sales Ops", tags: ["Gmail", "Outlook"] }),
    listing({ id: "app-b", creatorId: "creator-b", category: "Inbox", tags: ["gmail", "outlook"] }),
  );
  assert.equal(result.similar, true);
  assert.deepEqual([...result.sharedTags], ["Gmail", "Outlook"]);
  assert.ok(result.reasons.some((reason) => reason.startsWith("Shared tags:")));
});

test("one shared tag in different categories is not enough", () => {
  const result = similarity.assessListingSimilarity(
    listing({ category: "Sales Ops", tags: ["Gmail"] }),
    listing({ id: "app-b", creatorId: "creator-b", category: "Inbox", tags: ["Gmail", "Slack"] }),
  );
  assert.equal(result.similar, false);
});

test("three overlapping words match without a shared category", () => {
  const result = similarity.assessListingSimilarity(
    listing({ title: "Daily inbox digest", description: "Morning update for founders" }),
    listing({
      id: "app-b",
      creatorId: "creator-b",
      category: "Inbox",
      title: "Founder inbox digest",
      description: "Daily checklist before standup",
    }),
  );
  assert.equal(result.similar, true);
  assert.deepEqual([...result.sharedTerms], ["daily", "inbox", "digest"]);
});

test("stop words and short words do not count as overlap", () => {
  const result = similarity.assessListingSimilarity(
    listing({ category: "Operations", title: "Alpha", description: "with your from there" }),
    listing({
      id: "app-b",
      creatorId: "creator-b",
      category: "Inbox",
      title: "Beta",
      description: "with your from there",
    }),
  );
  assert.equal(result.similar, false);
  assert.deepEqual([...result.sharedTerms], []);
});

test("a creator is not matched with their own listing", () => {
  const result = similarity.assessListingSimilarity(
    listing({ title: "Daily inbox digest briefing" }),
    listing({ id: "app-b", title: "Daily inbox digest briefing" }),
  );
  assert.equal(result.similar, false);
  assert.equal(result.score, 0);
});

test("the same listing is not a match", () => {
  const result = similarity.assessListingSimilarity(listing({ id: "same" }), listing({ id: "same", creatorId: "creator-b" }));
  assert.equal(result.similar, false);
});

test("stop words in SQL stay aligned with the TypeScript list", () => {
  const migration = readFileSync(join(root, "supabase/migrations/20261106151749_creator_collaborations.sql"), "utf8");
  const match = migration.match(/token <> all \(array\[([\s\S]*?)\]::text\[\]\)/);
  assert.ok(match, "SQL stop-word array not found");
  const sqlWords = [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  assert.deepEqual(sqlWords, [...similarity.COLLABORATION_STOP_WORDS]);
});

test("schema.sql includes the collaboration migration", () => {
  const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
  assert.match(schema, /create table if not exists public\.creator_collaboration_settings/);
  assert.match(schema, /private\.listings_are_similar/);
  assert.match(schema, /TODO\(revenue-sharing\)/);
});

test("formats one, two, and many collaborator names", () => {
  assert.equal(format.formatCollaboratorNames(["  Ada  ", "Ada", ""]), "Ada");
  assert.equal(format.formatCollaboratorNames(["Ada", "Grace"]), "Ada and Grace");
  assert.equal(format.formatCollaboratorNames(["Ada", "Grace", "Lin"]), "Ada, Grace, and Lin");
});
