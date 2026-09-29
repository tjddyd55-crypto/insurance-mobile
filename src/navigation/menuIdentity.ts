import type { NativeMenuLink, NativeMenuSection } from './menuConfig';

/** React list key SSOT: menu link `id` must be unique within a section. */
export function uniqueNativeMenuLinksById(links: NativeMenuLink[]): NativeMenuLink[] {
  const seen = new Set<string>();
  const unique: NativeMenuLink[] = [];
  for (const link of links) {
    if (seen.has(link.id)) {
      continue;
    }
    seen.add(link.id);
    unique.push(link);
  }
  return unique;
}

export function normalizeNativeMenuSections(sections: NativeMenuSection[]): NativeMenuSection[] {
  return sections.map((section) => ({
    ...section,
    children: uniqueNativeMenuLinksById(section.children),
  }));
}

export function findDuplicateNativeMenuChildIds(
  sections: NativeMenuSection[],
): { sectionId: string; childId: string }[] {
  const duplicates: { sectionId: string; childId: string }[] = [];
  for (const section of sections) {
    const seen = new Set<string>();
    for (const child of section.children) {
      if (seen.has(child.id)) {
        duplicates.push({ sectionId: section.id, childId: child.id });
      }
      seen.add(child.id);
    }
  }
  return duplicates;
}
