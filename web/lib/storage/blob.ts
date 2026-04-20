import { BlobNotFoundError, del, get, list, put } from "@vercel/blob";
import type { ZodType } from "zod";

/**
 * Low-level typed JSON wrappers over @vercel/blob.
 *
 * Uses a private store — blobs require the R/W token to read. Pathnames are
 * stable (addRandomSuffix: false, allowOverwrite: true) so the pathname *is*
 * the lookup key. Blob has no native If-Match; for the single-user-per-account
 * shape of this product we accept last-write-wins.
 */

const JSON_CONTENT_TYPE = "application/json";

function assertTokenPresent(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set — configure the Vercel Blob token before using storage.",
    );
  }
}

/**
 * Read a JSON blob at `pathname`. Returns null if the blob does not exist.
 * Throws if the blob exists but fails schema validation (a bug we want to see).
 */
export async function getJson<T>(
  pathname: string,
  schema: ZodType<T>,
): Promise<T | null> {
  assertTokenPresent();

  let result;
  try {
    result = await get(pathname, { access: "private" });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
  if (!result || !result.stream) return null;

  const raw: unknown = await new Response(result.stream).json();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Blob at ${pathname} failed schema validation: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

/** Write a JSON blob with a stable pathname. Overwrites in place. */
export async function putJson<T>(pathname: string, value: T): Promise<void> {
  assertTokenPresent();
  await put(pathname, JSON.stringify(value), {
    access: "private",
    contentType: JSON_CONTENT_TYPE,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Delete a blob by pathname. No-op if it does not exist. */
export async function deleteByKey(pathname: string): Promise<void> {
  assertTokenPresent();
  try {
    await del(pathname);
  } catch (err) {
    if (err instanceof BlobNotFoundError) return;
    throw err;
  }
}

/** List blob pathnames under a prefix. */
export async function listUnderPrefix(prefix: string): Promise<string[]> {
  assertTokenPresent();
  const result = await list({ prefix });
  return result.blobs.map((b) => b.pathname);
}
