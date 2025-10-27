/**
 * Translation Redistributor - Redistribute merged translations
 */

import { splitTextIntoWords, splitTranslationByWordRatio } from '../../utils/text/index.js';
import { mergeVietnameseCompounds, fixCompoundBoundaries } from '../../utils/compounds/index.js';

export const redistributeMergedTranslations = (sourceJSON) => {
  const targetLang = 'vi';
  
  Object.values(sourceJSON.markers).forEach(instances => {
    instances.forEach(instance => {
      if (instance.status !== 'MATCHED' || !instance.mergedOrphans || instance.mergedOrphans.length === 0) {
        return;
      }
      
      if (!instance.utterances || instance.utterances.length === 0) {
        console.warn(`⚠️ Skip ${instance.domainIndex} - no utterances`);
        return;
      }
      
      try {
        const forwardMerged = instance.mergedOrphans.filter(o => o.mergeDirection === 'FORWARD');
        const backwardMerged = instance.mergedOrphans.filter(o => o.mergeDirection === 'BACKWARD');
        
        console.log(`\n🔄 Redistributing ${instance.domainIndex}`);
        if (forwardMerged.length > 0) console.log(`   ⬅️ Forward: ${forwardMerged.map(o => o.domainIndex).join(', ')}`);
        console.log(`   📍 Matched: ${instance.domainIndex}`);
        if (backwardMerged.length > 0) console.log(`   ➡️ Backward: ${backwardMerged.map(o => o.domainIndex).join(', ')}`);
        
        const forwardLength = forwardMerged.reduce((sum, o) => sum + (o.content?.length || 0), 0);
        const matchedLength = instance.content?.length || 0;
        const backwardLength = backwardMerged.reduce((sum, o) => sum + (o.content?.length || 0), 0);
        const totalLength = forwardLength + matchedLength + backwardLength;
        
        console.log(`   📏 ${forwardLength} + ${matchedLength} + ${backwardLength} = ${totalLength}`);
        
        if (totalLength === 0) {
          console.warn(`   ⚠️ Zero length, skip`);
          return;
        }
        
        // ✅ FIX: Use the ALREADY MERGED translation (don't merge again!)
        let mergedTranslation = instance.overallTranslationWithCompounds;
        
        // ✅ If it doesn't exist (shouldn't happen), merge now
        if (!mergedTranslation) {
          const overallTranslation = instance.overallTranslation || '';
          if (!overallTranslation.trim()) {
            console.warn(`   ⚠️ Empty translation, skip`);
            return;
          }
          mergedTranslation = mergeVietnameseCompounds(overallTranslation);
          instance.overallTranslationWithCompounds = mergedTranslation;
        }
        
        const translationWords = splitTextIntoWords(mergedTranslation, targetLang);
        const totalWords = translationWords.length;
        
        const forwardWords = Math.round(totalWords * (forwardLength / totalLength));
        const matchedWords = Math.round(totalWords * (matchedLength / totalLength));
        const backwardWords = totalWords - forwardWords - matchedWords;
        
        console.log(`   📝 ${forwardWords} + ${matchedWords} + ${backwardWords} = ${totalWords} words (with compounds)`);
        
        let idx = 0;
        let forwardTranslation = translationWords.slice(idx, idx + forwardWords).join(' ');
        idx += forwardWords;
        
        let matchedTranslation = translationWords.slice(idx, idx + matchedWords).join(' ');
        idx += matchedWords;
        
        let backwardTranslation = translationWords.slice(idx).join(' ');
        
        const segments = [forwardTranslation, matchedTranslation, backwardTranslation].filter(s => s.trim());
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
        
        const matchedUtterances = instance.utterances.filter(u => !u._mergedFrom);
        const forwardUtterances = instance.utterances.filter(u => 
          forwardMerged.some(o => u._mergedFrom === o.domainIndex)
        );
        const backwardUtterances = instance.utterances.filter(u => 
          backwardMerged.some(o => u._mergedFrom === o.domainIndex)
        );
        
        if (forwardUtterances.length > 0 && forwardTranslation.trim()) {
          const translations = splitTranslationByWordRatio(forwardTranslation, forwardUtterances, targetLang);
          forwardUtterances.forEach((utt, i) => {
            utt.elementTranslation = translations[i] || '';
          });
          console.log(`   ✅ ${forwardUtterances.length} forward utterances redistributed`);
        }
        
        if (matchedUtterances.length > 0 && matchedTranslation.trim()) {
          const translations = splitTranslationByWordRatio(matchedTranslation, matchedUtterances, targetLang);
          matchedUtterances.forEach((utt, i) => {
            utt.elementTranslation = translations[i] || '';
          });
          console.log(`   ✅ ${matchedUtterances.length} matched utterances redistributed`);
        }
        
        if (backwardUtterances.length > 0 && backwardTranslation.trim()) {
          const translations = splitTranslationByWordRatio(backwardTranslation, backwardUtterances, targetLang);
          backwardUtterances.forEach((utt, i) => {
            utt.elementTranslation = translations[i] || '';
          });
          console.log(`   ✅ ${backwardUtterances.length} backward utterances redistributed`);
        }
        
        instance.utterances.forEach(utt => {
          if (utt._mergedFrom) {
            utt.mergedSource = utt._mergedFrom;
            delete utt._mergedFrom;
          }
        });
        
        console.log(`   ✨ Done\n`);
        
      } catch (error) {
        console.error(`❌ Error redistributing ${instance.domainIndex}:`, error);
      }
    });
  });
};