/**
 * Translation Redistributor
 * Redistributes translations across merged markers
 */

import { splitTextIntoWords, countWordsConsistent } from './word-splitter.js';
import { adjustAllBoundaries, extractAdjustedSegments } from './boundary-adjuster.js';
import { mergeVietnameseCompounds } from '../../languages/vietnamese/compound-merger.js';
import { fixCompoundBoundaries } from '../../languages/vietnamese/boundary-fixer.js';

/**
 * Translation Redistributor class
 */
export class TranslationRedistributor {
  /**
   * Create redistributor
   * @param {string} targetLang - Target language (default: 'vi')
   */
  constructor(targetLang = 'vi') {
    this.targetLang = targetLang;
  }
  
  /**
   * Redistribute translations for all markers
   * @param {Object} sourceJSON - Source JSON with markers
   */
  redistribute(sourceJSON) {
    console.log('\n🧮 Smart redistribution...');
    
    Object.values(sourceJSON.markers || {}).forEach(instances => {
      instances.forEach(instance => {
        if (this.shouldRedistribute(instance)) {
          this.redistributeInstance(instance);
        }
      });
    });
  }
  
  /**
   * Check if instance should be redistributed
   * @private
   */
  shouldRedistribute(instance) {
    return instance.status === 'MATCHED' &&
           instance.mergedOrphans &&
           instance.mergedOrphans.length > 0 &&
           instance.utteranceCount > 0;
  }
  
  /**
   * Redistribute single instance
   * @private
   */
  redistributeInstance(instance) {
    console.log(`\n🔄 Redistributing ${instance.domainIndex}`);
    
    const forwardMerged = instance.mergedOrphans.filter(o => o.mergeDirection === 'FORWARD');
    const backwardMerged = instance.mergedOrphans.filter(o => o.mergeDirection === 'BACKWARD');
    
    if (forwardMerged.length > 0) {
      console.log(`   ⬅️ Forward: ${forwardMerged.map(o => o.domainIndex).join(', ')}`);
    }
    console.log(`   📍 Matched: ${instance.domainIndex}`);
    if (backwardMerged.length > 0) {
      console.log(`   ➡️ Backward: ${backwardMerged.map(o => o.domainIndex).join(', ')}`);
    }
    
    // Calculate lengths
    const forwardLength = forwardMerged.reduce((sum, o) => sum + o.contentLength, 0);
    const matchedLength = instance.contentLength;
    const backwardLength = backwardMerged.reduce((sum, o) => sum + o.contentLength, 0);
    const totalLength = forwardLength + matchedLength + backwardLength;
    
    console.log(`   📏 ${forwardLength} + ${matchedLength} + ${backwardLength} = ${totalLength}`);
    
    if (totalLength === 0) {
      console.warn(`   ⚠️ Zero length, skip`);
      return;
    }
    
    const overallTranslation = instance.overallTranslation || '';
    if (!overallTranslation.trim()) {
      console.warn(`   ⚠️ Empty translation, skip`);
      return;
    }
    
    // Merge Vietnamese compounds
    const mergedTranslation = mergeVietnameseCompounds(overallTranslation);
    instance.overallTranslationWithCompounds = mergedTranslation;
    
    // Split into words (compound-aware)
    const translationWords = splitTextIntoWords(mergedTranslation, this.targetLang);
    const totalWords = translationWords.length;
    
    // Calculate word allocation
    const allocation = this.calculateAllocation(
      forwardLength,
      matchedLength,
      backwardLength,
      totalLength,
      totalWords
    );
    
    console.log(`   📝 ${allocation.forward} + ${allocation.matched} + ${allocation.backward} = ${totalWords} words`);
    
    // Split translation
    const segments = this.splitTranslation(
      translationWords,
      allocation,
      forwardMerged.length > 0,
      backwardMerged.length > 0
    );
    
    // Get utterance groups
    const utteranceGroups = this.groupUtterances(instance, forwardMerged, backwardMerged);
    
    // Distribute to utterances
    this.distributeToUtterances(segments, utteranceGroups);
    
    console.log(`   ✨ Done\n`);
  }
  
  /**
   * Calculate word allocation
   * @private
   */
  calculateAllocation(forwardLength, matchedLength, backwardLength, totalLength, totalWords) {
    const forwardRatio = forwardLength / totalLength;
    const matchedRatio = matchedLength / totalLength;
    
    const forwardWords = Math.round(totalWords * forwardRatio);
    const matchedWords = Math.round(totalWords * matchedRatio);
    const backwardWords = totalWords - forwardWords - matchedWords;
    
    return {
      forward: forwardWords,
      matched: matchedWords,
      backward: backwardWords
    };
  }
  
  /**
   * Split translation into segments
   * @private
   */
  splitTranslation(words, allocation, hasForward, hasBackward) {
    let idx = 0;
    
    const segments = {
      forward: '',
      matched: '',
      backward: ''
    };
    
    // Forward segment
    if (hasForward) {
      segments.forward = words.slice(idx, idx + allocation.forward).join(' ');
      idx += allocation.forward;
    }
    
    // Matched segment
    segments.matched = words.slice(idx, idx + allocation.matched).join(' ');
    idx += allocation.matched;
    
    // Backward segment
    if (hasBackward) {
      segments.backward = words.slice(idx).join(' ');
    }
    
    // Fix compound boundaries between segments
    const textSegments = [segments.forward, segments.matched, segments.backward]
      .filter(s => s.trim());
    
    if (textSegments.length > 1) {
      const fixed = fixCompoundBoundaries(textSegments);
      
      let fixedIdx = 0;
      if (segments.forward.trim()) {
        segments.forward = fixed[fixedIdx++] || segments.forward;
      }
      if (segments.matched.trim()) {
        segments.matched = fixed[fixedIdx++] || segments.matched;
      }
      if (segments.backward.trim()) {
        segments.backward = fixed[fixedIdx++] || segments.backward;
      }
    }
    
    return segments;
  }
  
  /**
   * Group utterances by source
   * @private
   */
  groupUtterances(instance, forwardMerged, backwardMerged) {
    return {
      forward: instance.utterances.filter(u =>
        forwardMerged.some(o => u._mergedFrom === o.domainIndex)
      ),
      matched: instance.utterances.filter(u => !u._mergedFrom),
      backward: instance.utterances.filter(u =>
        backwardMerged.some(o => u._mergedFrom === o.domainIndex)
      )
    };
  }
  
  /**
   * Distribute translation to utterances
   * @private
   */
  distributeToUtterances(segments, utteranceGroups) {
    // Forward utterances
    if (utteranceGroups.forward.length > 0 && segments.forward.trim()) {
      const translations = this.splitByWordRatio(
        segments.forward,
        utteranceGroups.forward
      );
      utteranceGroups.forward.forEach((utt, i) => {
        utt.elementTranslation = translations[i] || '';
      });
      console.log(`   ✅ ${utteranceGroups.forward.length} forward utterances`);
    }
    
    // Matched utterances
    if (utteranceGroups.matched.length > 0 && segments.matched.trim()) {
      const translations = this.splitByWordRatio(
        segments.matched,
        utteranceGroups.matched
      );
      utteranceGroups.matched.forEach((utt, i) => {
        utt.elementTranslation = translations[i] || '';
      });
      console.log(`   ✅ ${utteranceGroups.matched.length} matched utterances`);
    }
    
    // Backward utterances
    if (utteranceGroups.backward.length > 0 && segments.backward.trim()) {
      const translations = this.splitByWordRatio(
        segments.backward,
        utteranceGroups.backward
      );
      utteranceGroups.backward.forEach((utt, i) => {
        utt.elementTranslation = translations[i] || '';
      });
      console.log(`   ✅ ${utteranceGroups.backward.length} backward utterances`);
    }
    
    // Mark merged utterances
    [...utteranceGroups.forward, ...utteranceGroups.backward].forEach(utt => {
      if (utt._mergedFrom) {
        utt.mergedSource = utt._mergedFrom;
        delete utt._mergedFrom;
      }
    });
  }
  
  /**
   * Split translation by word ratio
   * @private
   */
  splitByWordRatio(translationText, utterances) {
    if (!translationText || !utterances || utterances.length === 0) {
      return utterances.map(() => '');
    }
    
    const totalOriginalWords = utterances.reduce(
      (sum, utt) => sum + (utt.wordLength || 0),
      0
    );
    
    if (totalOriginalWords === 0) {
      return utterances.map(() => '');
    }
    
    // Split translation (compound-aware)
    const translationWords = splitTextIntoWords(translationText, this.targetLang);
    const totalTranslationWords = translationWords.length;
    
    if (totalTranslationWords === 0) {
      return utterances.map(() => '');
    }
    
    // Calculate allocations
    const allocations = utterances.map((utt, idx) => {
      const ratio = utt.wordLength / totalOriginalWords;
      let wordCount = Math.round(totalTranslationWords * ratio);
      
      // Ensure at least 1 word if words available
      if (wordCount === 0 && translationWords.length > 0) {
        wordCount = 1;
      }
      
      return {
        utterance: utt,
        wordCount,
        ratio,
        isLast: idx === utterances.length - 1
      };
    });
    
    // Adjust boundaries
    const adjusted = adjustAllBoundaries(allocations, translationWords, this.targetLang);
    
    // Extract segments
    return extractAdjustedSegments(adjusted, translationWords);
  }
}