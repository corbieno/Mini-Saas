import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import {
  GALLERY_LIMIT_ERROR,
  LISTING_IMAGE_EMPTY_ERROR,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_SIZE_ERROR,
  LISTING_IMAGE_TYPE_ERROR,
  extensionMatchesMime,
  isListingImagePath,
  listingImageRemotePatterns,
  normalizeListingImageUpdate,
  readListingWrite,
  supabaseStorageHostnames,
  validateListingImageBytes,
} from "../src/lib/listing-images.ts";

const require = createRequire(import.meta.url);
const { matchRemotePattern } = require("next/dist/shared/lib/match-remote-pattern.js");

const appId = "11111111-1111-4111-8111-111111111111";
const otherAppId = "33333333-3333-4333-8333-333333333333";
const fileId = "22222222-2222-4222-8222-222222222222";
const secondFileId = "44444444-4444-4444-8444-444444444444";

function pathFor(id, extension, owner = appId) {
  return `${owner}/${id}.${extension}`;
}

test("detects png, jpeg, gif, and webp from file headers", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const gif = Uint8Array.from("GIF89a", (char) => char.charCodeAt(0));
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

  assert.equal(validateListingImageBytes(png).mime, "image/png");
  assert.equal(validateListingImageBytes(jpeg).mime, "image/jpeg");
  assert.equal(validateListingImageBytes(gif).mime, "image/gif");
  assert.equal(validateListingImageBytes(webp).mime, "image/webp");
  assert.equal(extensionMatchesMime("photo.jpg", "image/jpeg"), true);
  assert.equal(extensionMatchesMime("photo.jpeg", "image/jpeg"), true);
  assert.equal(extensionMatchesMime("photo.png", "image/jpeg"), false);
});

test("rejects empty files, non-images, and files over 5 MB", () => {
  assert.equal(validateListingImageBytes(new Uint8Array()).error, LISTING_IMAGE_EMPTY_ERROR);
  const html = Uint8Array.from("<html>", (char) => char.charCodeAt(0));
  assert.equal(validateListingImageBytes(html).error, LISTING_IMAGE_TYPE_ERROR);

  const tooBig = new Uint8Array(LISTING_IMAGE_MAX_BYTES + 1);
  tooBig.set([0x89, 0x50, 0x4e, 0x47], 0);
  assert.equal(validateListingImageBytes(tooBig).error, LISTING_IMAGE_SIZE_ERROR);

  const maxSize = new Uint8Array(LISTING_IMAGE_MAX_BYTES);
  maxSize.set([0xff, 0xd8, 0xff], 0);
  assert.equal(validateListingImageBytes(maxSize).ok, true);
});

test("accepts one cover and up to five gallery paths owned by the listing", () => {
  const cover = pathFor(fileId, "png");
  const gallery = [pathFor(secondFileId, "webp")];
  const result = normalizeListingImageUpdate({ appId, cover, gallery });
  assert.equal(result.ok, true);
  assert.deepEqual(result, { ok: true, cover, gallery });
  assert.equal(normalizeListingImageUpdate({ appId, cover: null, gallery: [] }).ok, true);
  assert.equal(normalizeListingImageUpdate({ appId, cover: "", gallery: [] }).cover, null);
});

test("rejects paths outside the listing, duplicates, and a sixth gallery image", () => {
  const cover = pathFor(fileId, "png");
  assert.equal(isListingImagePath(appId, `../${fileId}.png`), false);
  assert.equal(normalizeListingImageUpdate({ appId, cover: pathFor(fileId, "png", otherAppId), gallery: [] }).ok, false);
  assert.equal(normalizeListingImageUpdate({ appId, cover, gallery: [cover] }).ok, false);
  assert.equal(normalizeListingImageUpdate({ appId, cover: `${appId}/${fileId}.svg`, gallery: [] }).ok, false);

  const gallery = Array.from({ length: 6 }, (_, index) => pathFor(`${"55555555-5555-4555-8555-55555555555"}${index}`, "gif"));
  const tooMany = normalizeListingImageUpdate({ appId, cover: null, gallery });
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.error, GALLERY_LIMIT_ERROR);
  assert.equal(normalizeListingImageUpdate({ appId, cover: null, gallery: "nope" }).ok, false);
});

test("listing text requires a title, category, and slug, and keeps price optional", () => {
  assert.equal(readListingWrite({ title: "Inbox Bot", category: "Inbox" }).value.slug, "inbox-bot");
  assert.equal(readListingWrite({ title: "Inbox Bot", category: "Inbox", price: "" }).value.price, null);
  assert.equal(readListingWrite({ title: "Inbox Bot", category: "Inbox", price: "12" }).value.price, 12);
  assert.equal(readListingWrite({ title: " ", category: "Inbox" }).error, "Title, category, and slug are required");
  assert.equal(readListingWrite({ title: "Inbox Bot", category: "Inbox", price: "abc" }).error, "Price must be a number");
  assert.equal(readListingWrite({ title: "Inbox Bot", category: "Inbox" }).value.pricingModel, "subscription");
  assert.equal(readListingWrite({ title: "Inbox Bot", category: "Inbox", description: "  plain text  " }).value.description, "plain text");
});

test("next/image remote patterns allow signed listing URLs for the Supabase project", () => {
  const patterns = listingImageRemotePatterns(supabaseStorageHostnames(undefined));
  const signed = new URL(
    `https://skpjpbhkxntmlcuzzjee.supabase.co/storage/v1/object/sign/listing-images/${appId}/${fileId}.png?token=abc`,
  );
  assert.equal(patterns.some((pattern) => matchRemotePattern(pattern, signed)), true);

  const otherProject = new URL(`https://other.supabase.co/storage/v1/object/sign/listing-images/${appId}/${fileId}.png?token=abc`);
  assert.equal(patterns.some((pattern) => matchRemotePattern(pattern, otherProject)), false);

  const publicObject = new URL(
    `https://skpjpbhkxntmlcuzzjee.supabase.co/storage/v1/object/public/listing-images/${appId}/${fileId}.png`,
  );
  assert.equal(patterns.some((pattern) => matchRemotePattern(pattern, publicObject)), false);

  const withEnv = supabaseStorageHostnames("https://preview-ref.supabase.co/rest/v1/");
  assert.deepEqual(withEnv.sort(), ["preview-ref.supabase.co", "skpjpbhkxntmlcuzzjee.supabase.co"].sort());
  assert.deepEqual(supabaseStorageHostnames("https://evil.example.com"), ["skpjpbhkxntmlcuzzjee.supabase.co"]);
  assert.deepEqual(supabaseStorageHostnames("not a url"), ["skpjpbhkxntmlcuzzjee.supabase.co"]);
});
