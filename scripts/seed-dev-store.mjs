#!/usr/bin/env node
/**
 * Offline-only validator/planner for preserved legacy demo catalog payloads.
 * --apply is deliberately blocked pending a separately reviewed native
 * Shopify Admin/GraphQL migration workflow.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LEGACY_STATUS = 'legacy-unverified-not-for-active-seeding';
export const MAX_CATALOG_BYTES = 65_536;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA = path.join(
  SCRIPT_DIR,
  'data',
  'legacy-demo-products.json',
);

function usage() {
  return 'Usage: node scripts/seed-dev-store.mjs [--apply]';
}

function parseArgs(args) {
  const parsed = { apply: false, help: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--apply') {
      if (parsed.apply) throw new Error('--apply may only be supplied once.');
      parsed.apply = true;
    } else {
      throw new Error('Unknown argument. ' + usage());
    }
  }

  return parsed;
}

export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('Catalog input must be a JSON object.');
  }
  if (catalog.status !== LEGACY_STATUS) {
    throw new Error('Catalog status must be "' + LEGACY_STATUS + '".');
  }
  if (typeof catalog.notice !== 'string' || catalog.notice.trim().length < 20) {
    throw new Error('Catalog input must include a clear legacy/unverified notice.');
  }
  if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
    throw new Error('Catalog input must include at least one preserved reference entry.');
  }

  const handles = new Set();
  for (const [index, product] of catalog.products.entries()) {
    const label = 'Reference entry ' + (index + 1);
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      throw new Error(label + ' must be a JSON object.');
    }
    if (typeof product.handle !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.handle)) {
      throw new Error(label + ' has an invalid handle.');
    }
    if (handles.has(product.handle)) throw new Error(label + ' duplicates a handle.');
    handles.add(product.handle);
    if (typeof product.title !== 'string' || product.title.trim() === '') {
      throw new Error(label + ' is missing a title.');
    }
    if (typeof product.body_html !== 'string' || product.body_html.trim() === '') {
      throw new Error(label + ' is missing preserved source description text.');
    }
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      throw new Error(label + ' must retain at least one variant record.');
    }
    for (const variant of product.variants) {
      if (!variant || typeof variant.price !== 'string' || !/^\d+\.\d{2}$/.test(variant.price)) {
        throw new Error(label + ' has an invalid preserved price field.');
      }
    }
  }
}

function assertFixedCatalogFile() {
  const dataDirectory = path.dirname(DEFAULT_DATA);
  let scriptStats;
  let directoryStats;
  let fileStats;
  try {
    scriptStats = fs.lstatSync(SCRIPT_DIR);
    directoryStats = fs.lstatSync(dataDirectory);
    fileStats = fs.lstatSync(DEFAULT_DATA);
  } catch {
    throw new Error('The fixed local legacy catalog is unavailable.');
  }
  validateCatalogMetadata(scriptStats, directoryStats, fileStats);
}

export function validateCatalogMetadata(scriptStats, directoryStats, fileStats) {
  if (scriptStats.isSymbolicLink() || directoryStats.isSymbolicLink() || fileStats.isSymbolicLink()) {
    throw new Error('The fixed local legacy catalog path must not contain symlinks.');
  }
  if (!scriptStats.isDirectory() || !directoryStats.isDirectory() || !fileStats.isFile() || fileStats.nlink !== 1) {
    throw new Error('The fixed local legacy catalog path must resolve to a regular repository file.');
  }
  if (fileStats.size > MAX_CATALOG_BYTES) {
    throw new Error('The fixed local legacy catalog exceeds its size limit.');
  }
}

function loadCatalog() {
  assertFixedCatalogFile();
  let text;
  try {
    text = fs.readFileSync(DEFAULT_DATA, 'utf8');
  } catch {
    throw new Error('Could not read the local catalog JSON file.');
  }
  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch {
    throw new Error('Catalog input is not valid JSON.');
  }
  validateCatalog(catalog);
  return catalog;
}

function main(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    console.error(error.message + '\n' + usage());
    return 2;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (options.apply) {
    console.error(
      'Blocked: --apply is disabled. Product changes require a separately reviewed native Shopify Admin/GraphQL migration workflow.',
    );
    return 2;
  }

  try {
    const catalog = loadCatalog();
    console.log(
      'Offline plan only: validated ' + catalog.products.length +
      ' legacy reference entries. No Shopify changes are planned.',
    );
    return 0;
  } catch (error) {
    console.error('Offline plan rejected: ' + error.message);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
