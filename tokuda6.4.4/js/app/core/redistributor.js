/**
 * Translation Redistributor - TWO-PHASE redistribution
 */

import { splitIntoWords, countWords } from '../lib/text.js';
import { splitTranslationByWordRatio } from '../lib/text.js';
import { safelyMergeCompounds, fixCompoundBoundaries } from '../lib/compounds.js';
import { validateWordCountConsistency } from '../lib/compounds.js';
import { findInstanceByDomainIndex } from '../lib/json-utils.js';

export const redistributeMergedTranslations = (sourceJSON) => {
  const targetLang = 'vi';
  const sourceLang = sourceJSON.sourceLanguage || 'en';

  console.log(`\n🌍 Redistribution: ${sourceLang} → ${targetLang}`);
  console.log(`   Using pre-calculated overallLength from JSON`);

  Object.values(sourceJSON.markers).forEach((instances) => {
    instances.forEach((instance) => {
      if (instance.status === 'MATCHED' && instance.mergedOrphans?.length > 0) {
        redistributeMatchedWithOrphans(instance, sourceJSON, targetLang);
      } else if (instance.status === 'ORPHAN_GROUP') {
        markOrphanGroupUtterances(instance);
      }
    });
  });
};

// ===== MATCHED Instance with Merged Orphans =====
const redistributeMatchedWithOrphans = (instance, sourceJSON, targetLang) => {
  if (!instance.utterances?.length) {
    console.warn(`⚠️ Skip ${instance.domainIndex} - no utterances`);
    return;
  }

  try {
    const groups = categorizeOrphans(instance);
    logRedistribution(instance.domainIndex, groups);

    const lengths = calculateLengths(instance, groups);
    const translation = prepareTranslation(instance);

    if (!translation) return;

    // Store full translation for reference
    instance.fullTranslation = translation;
    instance.fullTranslationWithCompounds = translation;
    console.log(`   💾 Stored full translation (${countWords(translation, targetLang)} words)`);

    // PHASE 1: Split by overall length ratio
    const phase1Segments = splitByOverallLength(translation, lengths, targetLang);

    // Store segments to their respective instances
    storeSegments(instance, groups, phase1Segments, sourceJSON);

    // PHASE 2: Split each segment by utterance ratios
    splitByUtteranceRatios(instance, groups, phase1Segments, targetLang);

    cleanupMergeMetadata(instance);

    console.log(`\n✨ Redistribution complete for ${instance.domainIndex}\n`);
  } catch (error) {
    console.error(`❌ Error redistributing ${instance.domainIndex}:`, error);
  }
};

// ===== Helper Functions =====
const categorizeOrphans = (instance) => ({
  forward: instance.mergedOrphans.filter((o) => o.mergeDirection === 'FORWARD'),
  backward: instance.mergedOrphans.filter((o) => o.mergeDirection === 'BACKWARD')
});

const logRedistribution = (domainIndex, { forward, backward }) => {
  console.log(`\n🔄 TWO-PHASE Redistribution for ${domainIndex}`);
  if (forward.length)
    console.log(`   ⬅️ Forward: ${forward.map((o) => o.domainIndex).join(', ')}`);
  console.log(`   📍 Matched: ${domainIndex}`);
  if (backward.length)
    console.log(`   ➡️ Backward: ${backward.map((o) => o.domainIndex).join(', ')}`);
};

const calculateLengths = (instance, { forward, backward }) => {
  const forwardLength = forward.reduce((sum, o) => sum + (o.overallLength || 0), 0);
  const backwardLength = backward.reduce((sum, o) => sum + (o.overallLength || 0), 0);
  const matchedLength = instance.utterances
    .filter((u) => !u._mergedFrom)
    .reduce((sum, u) => sum + (u.wordLength || 0), 0);

  const total = forwardLength + matchedLength + backwardLength;

  console.log(`\n📏 PHASE 1: Overall length distribution:`);
  console.log(`   Forward:  ${forwardLength} (${percentage(forwardLength, total)})`);
  console.log(`   Matched:  ${matchedLength} (${percentage(matchedLength, total)})`);
  console.log(`   Backward: ${backwardLength} (${percentage(backwardLength, total)})`);
  console.log(`   Total:    ${total}`);

  if (total === 0) {
    console.warn(`   ⚠️ Zero total length, skip`);
  }

  return { forward: forwardLength, matched: matchedLength, backward: backwardLength, total };
};

const prepareTranslation = (instance) => {
  let translation = instance.overallTranslationWithCompounds;

  if (!translation) {
    const raw = instance.overallTranslation || '';
    if (!raw.trim()) {
      console.warn(`   ⚠️ Empty translation, skip`);
      return null;
    }
    translation = safelyMergeCompounds(raw);
    instance.overallTranslationWithCompounds = translation;
    instance._compoundsMerged = true;
  } else if (!instance._compoundsMerged) {
    translation = safelyMergeCompounds(translation);
    instance.overallTranslationWithCompounds = translation;
    instance._compoundsMerged = true;
  }

  return translation;
};

const splitByOverallLength = (translation, lengths, lang) => {
  const words = splitIntoWords(translation, lang);
  const totalWords = words.length;

  if (lengths.total === 0) return [];

  const forwardWords = Math.round(totalWords * (lengths.forward / lengths.total));
  const matchedWords = Math.round(totalWords * (lengths.matched / lengths.total));
  const backwardWords = totalWords - forwardWords - matchedWords;

  console.log(`\n✂️ PHASE 1 Split: By overall length ratio`);
  console.log(`   Forward:  ${forwardWords} words (${percentage(lengths.forward, lengths.total)})`);
  console.log(`   Matched:  ${matchedWords} words (${percentage(lengths.matched, lengths.total)})`);
  console.log(`   Backward: ${backwardWords} words (${percentage(lengths.backward, lengths.total)})`);

  let idx = 0;
  const segments = [
    words.slice(idx, (idx += forwardWords)).join(' '),
    words.slice(idx, (idx += matchedWords)).join(' '),
    words.slice(idx).join(' ')
  ].filter((s) => s.trim());

  // Fix compound boundaries
  const fixed = fixCompoundBoundaries(segments);

  console.log(`\n🔧 After compound boundary fix:`);
  fixed.forEach((seg, i) => {
    const label = ['Forward', 'Matched', 'Backward'][i];
    if (seg.trim()) console.log(`   ${label}: ${countWords(seg, lang)} words`);
  });

  return fixed;
};

const storeSegments = (instance, groups, segments, sourceJSON) => {
  const [forwardSeg, matchedSeg, backwardSeg] = segments;

  if (groups.forward.length && forwardSeg?.trim()) {
    groups.forward.forEach((orphan) => {
      const sourceInstance = findInstanceByDomainIndex(sourceJSON, orphan.domainIndex);
      if (sourceInstance) {
        sourceInstance.overallTranslation = forwardSeg;
        sourceInstance.overallTranslationWithCompounds = forwardSeg;
        sourceInstance._compoundsMerged = true;
        sourceInstance.fullTranslation = instance.fullTranslation;
        sourceInstance.fullTranslationWithCompounds = instance.fullTranslationWithCompounds;
      }
    });
    console.log(`   ✅ Stored forward portion to orphan instances`);
  }

  if (matchedSeg?.trim()) {
    instance.overallTranslation = matchedSeg;
    instance.overallTranslationWithCompounds = matchedSeg;
    instance._compoundsMerged = true;
    console.log(`   ✅ Stored matched portion to ${instance.domainIndex}`);
  }

  if (groups.backward.length && backwardSeg?.trim()) {
    groups.backward.forEach((orphan) => {
      const sourceInstance = findInstanceByDomainIndex(sourceJSON, orphan.domainIndex);
      if (sourceInstance) {
        sourceInstance.overallTranslation = backwardSeg;
        sourceInstance.overallTranslationWithCompounds = backwardSeg;
        sourceInstance._compoundsMerged = true;
        sourceInstance.fullTranslation = instance.fullTranslation;
        sourceInstance.fullTranslationWithCompounds = instance.fullTranslationWithCompounds;
      }
    });
    console.log(`   ✅ Stored backward portion to orphan instances`);
  }
};

const splitByUtteranceRatios = (instance, groups, segments, lang) => {
  console.log(`\n✂️ PHASE 2 Split: By utterance word ratios within each instance`);

  const forwardUtterances = instance.utterances.filter((u) =>
    groups.forward.some((o) => u._mergedFrom === o.domainIndex)
  );
  const matchedUtterances = instance.utterances.filter((u) => !u._mergedFrom);
  const backwardUtterances = instance.utterances.filter((u) =>
    groups.backward.some((o) => u._mergedFrom === o.domainIndex)
  );

  const [forwardSeg, matchedSeg, backwardSeg] = segments;

  if (forwardUtterances.length && forwardSeg?.trim()) {
    console.log(`   Forward: ${forwardUtterances.length} utterances`);
    const translations = splitTranslationByWordRatio(forwardSeg, forwardUtterances, lang);
    forwardUtterances.forEach((utt, i) => (utt.elementTranslation = translations[i] || ''));
  }

  if (matchedUtterances.length && matchedSeg?.trim()) {
    console.log(`   Matched: ${matchedUtterances.length} utterances`);
    const translations = splitTranslationByWordRatio(matchedSeg, matchedUtterances, lang);
    matchedUtterances.forEach((utt, i) => (utt.elementTranslation = translations[i] || ''));
  }

  if (backwardUtterances.length && backwardSeg?.trim()) {
    console.log(`   Backward: ${backwardUtterances.length} utterances`);
    const translations = splitTranslationByWordRatio(backwardSeg, backwardUtterances, lang);
    backwardUtterances.forEach((utt, i) => (utt.elementTranslation = translations[i] || ''));
  }
};

const cleanupMergeMetadata = (instance) => {
  instance.utterances.forEach((utt) => {
    if (utt._mergedFrom) {
      utt.mergedSource = utt._mergedFrom;
      delete utt._mergedFrom;
    }
  });
};

const markOrphanGroupUtterances = (leader) => {
  console.log(`\n📦 Processing orphan group ${leader.domainIndex} (${leader.orphanGroupType})`);

  if (!leader.utterances?.length) {
    console.warn(`⚠️ No utterances in orphan group`);
    return;
  }

  leader.utterances.forEach((utt) => {
    if (utt._mergedFrom) {
      utt.mergedSource = utt._mergedFrom;
      delete utt._mergedFrom;
    }
  });

  console.log(`  ℹ️ Orphan group remains untranslated (${leader.utterances.length} utterances)`);
};

const percentage = (value, total) => (total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%');