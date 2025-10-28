/**
 * Translation Redistributor - TWO-PHASE redistribution
 */

import {
  splitTextIntoWords,
  splitTranslationByWordRatio,
  countWordsConsistent,
} from "../../utils/text/word-splitter.js"; // ✅ CHANGED
import {
  safelyMergeCompounds,
  fixCompoundBoundaries,
} from "../../utils/compounds/merger.js"; // ✅ CHANGED
import { validateWordCountConsistency } from "../../utils/compounds/splitter.js"; // ✅ CHANGED
import { findInstanceByDomainIndex } from "../../utils/json-helpers.js";

export const redistributeMergedTranslations = (sourceJSON) => {
  const targetLang = "vi";
  const sourceLang = sourceJSON.sourceLanguage || "en";

  console.log(`\n🌍 Redistribution: ${sourceLang} → ${targetLang}`);
  console.log(`   Using pre-calculated overallLength from JSON`);

  Object.values(sourceJSON.markers).forEach((instances) => {
    instances.forEach((instance) => {
      if (instance.status === "MATCHED" && instance.mergedOrphans?.length > 0) {
        redistributeMatchedWithOrphans(
          instance,
          sourceJSON,
          targetLang,
          sourceLang
        );
      }

      if (instance.status === "ORPHAN_GROUP") {
        redistributeOrphanGroup(instance, sourceJSON);
      }
    });
  });
};

const redistributeMatchedWithOrphans = (
  instance,
  sourceJSON,
  targetLang,
  sourceLang
) => {
  if (!instance.utterances || instance.utterances.length === 0) {
    console.warn(`⚠️ Skip ${instance.domainIndex} - no utterances`);
    return;
  }

  try {
    const forwardMerged = instance.mergedOrphans.filter(
      (o) => o.mergeDirection === "FORWARD"
    );
    const backwardMerged = instance.mergedOrphans.filter(
      (o) => o.mergeDirection === "BACKWARD"
    );

    console.log(`\n🔄 TWO-PHASE Redistribution for ${instance.domainIndex}`);
    if (forwardMerged.length > 0)
      console.log(
        `   ⬅️ Forward: ${forwardMerged.map((o) => o.domainIndex).join(", ")}`
      );
    console.log(`   📍 Matched: ${instance.domainIndex}`);
    if (backwardMerged.length > 0)
      console.log(
        `   ➡️ Backward: ${backwardMerged.map((o) => o.domainIndex).join(", ")}`
      );

    const forwardLength = forwardMerged.reduce(
      (sum, o) => sum + (o.overallLength || 0),
      0
    );
    const backwardLength = backwardMerged.reduce(
      (sum, o) => sum + (o.overallLength || 0),
      0
    );

    const matchedUtterances = instance.utterances.filter((u) => !u._mergedFrom);
    const matchedLength = matchedUtterances.reduce(
      (sum, u) => sum + (u.wordLength || 0),
      0
    );

    const totalLength = forwardLength + matchedLength + backwardLength;

    console.log(`\n📏 PHASE 1: Overall length (from overallLength property):`);
    console.log(
      `   Forward:  ${forwardLength} (${(
        (forwardLength / totalLength) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   Matched:  ${matchedLength} (${(
        (matchedLength / totalLength) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   Backward: ${backwardLength} (${(
        (backwardLength / totalLength) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`   Total:    ${totalLength}`);

    if (totalLength === 0) {
      console.warn(`   ⚠️ Zero total length, skip`);
      return;
    }

    let mergedTranslation = instance.overallTranslationWithCompounds;

    if (!mergedTranslation) {
      const overallTranslation = instance.overallTranslation || "";
      if (!overallTranslation.trim()) {
        console.warn(`   ⚠️ Empty translation, skip`);
        return;
      }
      mergedTranslation = safelyMergeCompounds(overallTranslation);
      instance.overallTranslationWithCompounds = mergedTranslation;
      instance._compoundsMerged = true;
    } else {
      if (!instance._compoundsMerged) {
        mergedTranslation = safelyMergeCompounds(mergedTranslation);
        instance.overallTranslationWithCompounds = mergedTranslation;
        instance._compoundsMerged = true;
      }
    }

    instance.fullTranslation = mergedTranslation;
    instance.fullTranslationWithCompounds = mergedTranslation;
    console.log(
      `   💾 Stored full translation (${countWordsConsistent(
        mergedTranslation,
        targetLang
      )} words)`
    );

    const translationWords = splitTextIntoWords(mergedTranslation, targetLang);
    const totalTranslationWords = translationWords.length;

    const expectedCount = countWordsConsistent(mergedTranslation, targetLang);
    if (totalTranslationWords !== expectedCount) {
      console.error(`❌ Word count mismatch in ${instance.domainIndex}:`, {
        split: totalTranslationWords,
        count: expectedCount,
      });
    }

    if (targetLang === "vi") {
      const isConsistent = validateWordCountConsistency(mergedTranslation);
      if (!isConsistent) {
        console.error(`❌ Compound word counting inconsistent`);
      }
    }

    console.log(
      `\n📊 Translation: ${totalTranslationWords} words total (${targetLang})`
    );

    const forwardTransWords = Math.round(
      totalTranslationWords * (forwardLength / totalLength)
    );
    const matchedTransWords = Math.round(
      totalTranslationWords * (matchedLength / totalLength)
    );
    const backwardTransWords =
      totalTranslationWords - forwardTransWords - matchedTransWords;

    console.log(`\n✂️ PHASE 1 Split: By overall length ratio`);
    console.log(
      `   Forward:  ${forwardTransWords} words (${(
        (forwardLength / totalLength) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   Matched:  ${matchedTransWords} words (${(
        (matchedLength / totalLength) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   Backward: ${backwardTransWords} words (${(
        (backwardLength / totalLength) *
        100
      ).toFixed(1)}%)`
    );

    let idx = 0;
    let forwardTranslation = translationWords
      .slice(idx, idx + forwardTransWords)
      .join(" ");
    idx += forwardTransWords;

    let matchedTranslation = translationWords
      .slice(idx, idx + matchedTransWords)
      .join(" ");
    idx += matchedTransWords;

    let backwardTranslation = translationWords.slice(idx).join(" ");

    const segments = [
      forwardTranslation,
      matchedTranslation,
      backwardTranslation,
    ].filter((s) => s.trim());
    const fixedSegments = fixCompoundBoundaries(segments);

    let segIdx = 0;
    if (forwardTranslation.trim()) {
      forwardTranslation = fixedSegments[segIdx++] || forwardTranslation;
    }
    if (matchedTranslation.trim()) {
      matchedTranslation = fixedSegments[segIdx++] || matchedTranslation;
    }
    if (backwardTranslation.trim()) {
      backwardTranslation = fixedSegments[segIdx++] || backwardTranslation;
    }

    console.log(`\n🔧 After compound boundary fix:`);
    if (forwardTranslation.trim()) {
      console.log(
        `   Forward:  ${countWordsConsistent(
          forwardTranslation,
          targetLang
        )} words`
      );
    }
    if (matchedTranslation.trim()) {
      console.log(
        `   Matched:  ${countWordsConsistent(
          matchedTranslation,
          targetLang
        )} words`
      );
    }
    if (backwardTranslation.trim()) {
      console.log(
        `   Backward: ${countWordsConsistent(
          backwardTranslation,
          targetLang
        )} words`
      );
    }

    if (forwardMerged.length > 0 && forwardTranslation.trim()) {
      forwardMerged.forEach((orphan) => {
        const sourceInstance = findInstanceByDomainIndex(
          sourceJSON,
          orphan.domainIndex
        );
        if (sourceInstance) {
          sourceInstance.overallTranslation = forwardTranslation;
          sourceInstance.overallTranslationWithCompounds = forwardTranslation;
          sourceInstance._compoundsMerged = true;

          sourceInstance.fullTranslation = instance.fullTranslation;
          sourceInstance.fullTranslationWithCompounds =
            instance.fullTranslationWithCompounds;
        }
      });
      console.log(`   ✅ Stored forward portion to orphan instances`);
    }

    if (matchedTranslation.trim()) {
      instance.overallTranslation = matchedTranslation;
      instance.overallTranslationWithCompounds = matchedTranslation;
      instance._compoundsMerged = true;
      console.log(`   ✅ Stored matched portion to ${instance.domainIndex}`);
    }

    if (backwardMerged.length > 0 && backwardTranslation.trim()) {
      backwardMerged.forEach((orphan) => {
        const sourceInstance = findInstanceByDomainIndex(
          sourceJSON,
          orphan.domainIndex
        );
        if (sourceInstance) {
          sourceInstance.overallTranslation = backwardTranslation;
          sourceInstance.overallTranslationWithCompounds = backwardTranslation;
          sourceInstance._compoundsMerged = true;

          sourceInstance.fullTranslation = instance.fullTranslation;
          sourceInstance.fullTranslationWithCompounds =
            instance.fullTranslationWithCompounds;
        }
      });
      console.log(`   ✅ Stored backward portion to orphan instances`);
    }

    console.log(
      `\n✂️ PHASE 2 Split: By utterance word ratios within each instance`
    );

    const forwardUtterances = instance.utterances.filter((u) =>
      forwardMerged.some((o) => u._mergedFrom === o.domainIndex)
    );
    const backwardUtterances = instance.utterances.filter((u) =>
      backwardMerged.some((o) => u._mergedFrom === o.domainIndex)
    );

    if (forwardUtterances.length > 0 && forwardTranslation.trim()) {
      console.log(`   Forward: ${forwardUtterances.length} utterances`);
      const translations = splitTranslationByWordRatio(
        forwardTranslation,
        forwardUtterances,
        targetLang
      );
      forwardUtterances.forEach((utt, i) => {
        utt.elementTranslation = translations[i] || "";
      });
    }

    if (matchedUtterances.length > 0 && matchedTranslation.trim()) {
      console.log(`   Matched: ${matchedUtterances.length} utterances`);
      const translations = splitTranslationByWordRatio(
        matchedTranslation,
        matchedUtterances,
        targetLang
      );
      matchedUtterances.forEach((utt, i) => {
        utt.elementTranslation = translations[i] || "";
      });
    }

    if (backwardUtterances.length > 0 && backwardTranslation.trim()) {
      console.log(`   Backward: ${backwardUtterances.length} utterances`);
      const translations = splitTranslationByWordRatio(
        backwardTranslation,
        backwardUtterances,
        targetLang
      );
      backwardUtterances.forEach((utt, i) => {
        utt.elementTranslation = translations[i] || "";
      });
    }

    instance.utterances.forEach((utt) => {
      if (utt._mergedFrom) {
        utt.mergedSource = utt._mergedFrom;
        delete utt._mergedFrom;
      }
    });

    console.log(`\n✨ Redistribution complete for ${instance.domainIndex}\n`);
  } catch (error) {
    console.error(`❌ Error redistributing ${instance.domainIndex}:`, error);
  }
};

const redistributeOrphanGroup = (leader, sourceJSON) => {
  console.log(
    `\n📦 Processing orphan group ${leader.domainIndex} (${leader.orphanGroupType})`
  );

  if (!leader.utterances || leader.utterances.length === 0) {
    console.warn(`⚠️ No utterances in orphan group`);
    return;
  }

  leader.utterances.forEach((utt) => {
    if (utt._mergedFrom) {
      utt.mergedSource = utt._mergedFrom;
      delete utt._mergedFrom;
    }
  });

  console.log(
    `  ℹ️ Orphan group remains untranslated (${leader.utterances.length} utterances)`
  );
};
