/**
 * Debugger Templates
 * Reusable step templates for event generation
 */

import { truncate } from './debugger-utils.js';

/**
 * Template builder for common step types
 */
export const StepTemplates = {
    // Basic info step with data table
    info(title, content, data) {
        return {
            title,
            content,
            severity: 'info',
            data
        };
    },

    // Success step
    success(title, content, data = null) {
        return {
            title,
            content,
            severity: 'success',
            ...(data && { data })
        };
    },

    // Warning step
    warning(title, content, alert = null) {
        return {
            title,
            content,
            severity: 'warning',
            ...(alert && { alert })
        };
    },

    // Error step
    error(title, content, diagnostic = null) {
        return {
            title,
            content,
            severity: 'error',
            ...(diagnostic && { diagnostic })
        };
    },

    // Step with code display
    codeDisplay(title, content, code, severity = 'info') {
        return {
            title,
            content,
            severity,
            code
        };
    },

    // Step with process flow
    flowStep(title, content, flow, severity = 'info') {
        return {
            title,
            content,
            severity,
            flow
        };
    },

    // Step with comparison
    comparisonStep(title, content, sourceText, targetText, severity = 'info') {
        return {
            title,
            content,
            severity,
            comparison: { source: sourceText, target: targetText }
        };
    },

    // Step with JSON display
    jsonStep(title, content, jsonObject, severity = 'info') {
        return {
            title,
            content,
            severity,
            json: jsonObject
        };
    },

    // Step with progress bar
    progressStep(title, content, current, total) {
        return {
            title,
            content,
            severity: 'info',
            progress: {
                current,
                total,
                percent: Math.floor((current / total) * 100)
            }
        };
    },

    // Step with alert
    alertStep(title, content, alertType, alertMessage, severity = 'info') {
        return {
            title,
            content,
            severity,
            alert: {
                type: alertType,
                message: alertMessage
            }
        };
    },

    // Combined step with data and alert
    diagnosticStep(title, content, data, diagnostic, severity = 'warning') {
        return {
            title,
            content,
            severity,
            data,
            diagnostic
        };
    }
};

/**
 * Matched Event Step Templates
 */
export const MatchedStepTemplates = {
    receivedSegment(marker, textLength, timestamp) {
        return StepTemplates.info(
            '📥 Received Raw Segment from AI Stream',
            'A new segment has been parsed from the AI response stream.',
            {
                'Raw Marker': marker,
                'Text Length': `${textLength} characters`,
                'Timestamp': timestamp
            }
        );
    },

    parseMarker(marker, baseMarker, index) {
        return StepTemplates.info(
            '🔍 Parse Marker Components',
            'Breaking down the marker into base letter and index number.',
            {
                'Full Marker': marker,
                'Base Marker': baseMarker,
                'Index Number': index,
                'Pattern': `(${baseMarker}) → ${baseMarker}-${index}`
            }
        );
    },

    displayTargetText(text) {
        return StepTemplates.codeDisplay(
            '📋 Display Target Segment Text',
            'The actual text content received from AI:',
            text,
            'info'
        );
    },

    searchSourceMap(marker, totalSegments) {
        return StepTemplates.flowStep(
            '🗂️ Search Source Map',
            `Looking up marker <span class="marker-tag">${marker}</span> in source segments map.`,
            [
                { icon: '📊', text: `Total source segments: ${totalSegments}`, type: 'info' },
                { icon: '🔑', text: `Searching for key: "${marker}"`, type: 'info' },
                { icon: '✅', text: 'Match found in source map!', type: 'success' }
            ],
            'info'
        );
    },

    retrievedSource(marker, sourceText, textLength) {
        return StepTemplates.success(
            '📄 Retrieved Source Segment',
            'Found matching source segment with same marker:',
            {
                'Source Marker': marker,
                'Source Text': sourceText.substring(0, 100) + (sourceText.length > 100 ? '...' : ''),
                'Text Length': `${textLength} characters`
            }
        );
    },

    compareSourceTarget(sourceText, targetText) {
        return StepTemplates.comparisonStep(
            '🔄 Compare Source and Target',
            'Side-by-side comparison of matched segments:',
            sourceText,
            targetText,
            'info'
        );
    },

    initializeJson() {
        return StepTemplates.codeDisplay(
            '🏗️ Initialize JSON Pair Object',
            'Creating empty pair object structure:',
            '{}',
            'info'
        );
    },

    addMarkerField(marker) {
        return StepTemplates.codeDisplay(
            '🔧 Add "marker" Field',
            'Setting the marker field:',
            `{\n  "marker": "${marker}"\n}`,
            'info'
        );
    },

    addSourceField(marker, sourceText) {
        return StepTemplates.codeDisplay(
            '🔧 Add "source" Field',
            'Adding source text to the pair:',
            `{\n  "marker": "${marker}",\n  "source": "${truncate(sourceText, 50)}"\n}`,
            'info'
        );
    },

    addTargetField(marker, sourceText, targetText) {
        return StepTemplates.codeDisplay(
            '🔧 Add "target" Field',
            'Adding target text to complete the pair:',
            `{\n  "marker": "${marker}",\n  "source": "${truncate(sourceText, 50)}",\n  "target": "${truncate(targetText, 50)}"\n}`,
            'info'
        );
    },

    finalJsonPair(jsonPair) {
        return StepTemplates.jsonStep(
            '📦 Final JSON Pair Object',
            'Complete pair object ready for mapping:',
            jsonPair,
            'success'
        );
    },

    classificationResult() {
        return StepTemplates.flowStep(
            '✅ Classification Result',
            'Determining final status based on matching result:',
            [
                { icon: '✓', text: 'Source exists: YES', type: 'success' },
                { icon: '✓', text: 'Markers match: YES', type: 'success' },
                { icon: '✓', text: 'Status: MATCHED', type: 'success' }
            ],
            'success'
        );
    },

    addToMapper() {
        return StepTemplates.alertStep(
            '🎯 Add to Mapper',
            'This pair will be added to the main mapping display.',
            'success',
            '✅ SUCCESS: This segment is MATCHED. The JSON pair will be displayed in the main view with both source and target text properly mapped.',
            'success'
        );
    }
};

/**
 * Waiting Event Step Templates
 */
export const WaitingStepTemplates = {
    sourceLoaded(marker, textLength, position, total, loadedTime) {
        return StepTemplates.info(
            '📋 Step 1: Source Segment Loaded',
            `This segment was successfully parsed from your source input with marker <span class="marker-tag waiting">${marker}</span>`,
            {
                'Marker': marker,
                'Source Text Length': `${textLength} characters`,
                'Position in Source': `${position} of ${total}`,
                'Loaded At': loadedTime
            }
        );
    },

    parseMarker(marker, baseMarker, index) {
        return StepTemplates.info(
            '🔍 Step 2: Parse Source Marker',
            'Breaking down the source marker components:',
            {
                'Full Marker': marker,
                'Base Marker': `(${baseMarker})`,
                'Index Number': index,
                'Pattern': `(${baseMarker}) → ${baseMarker}-${index}`,
                'Marker Type': 'SOURCE (awaiting target match)'
            }
        );
    },

    displaySourceText(text) {
        return StepTemplates.codeDisplay(
            '📄 Step 3: Display Source Text',
            'This is the source text waiting to be matched with AI translation:',
            text,
            'info'
        );
    },

    waitingAnalysis(marker, totalSources, matchedCount, progressPercent, waitTime, severity) {
        return StepTemplates.flowStep(
            '⏱️ Step 4: Waiting Status Analysis',
            `Analyzing current waiting state for <span class="marker-tag waiting">${marker}</span>:`,
            [
                { icon: '📊', text: `Total sources: ${totalSources}`, type: 'info' },
                { icon: '✅', text: `Matched so far: ${matchedCount} (${progressPercent}%)`, type: matchedCount > 0 ? 'success' : 'info' },
                { icon: '⏳', text: `Still waiting: ${totalSources - matchedCount}`, type: 'warning' },
                { icon: '⏱️', text: `Wait time: ${waitTime}s`, type: waitTime > 60 ? 'warning' : 'info' }
            ],
            severity
        );
    },

    progressTracking(matchedCount, totalSources) {
        return StepTemplates.progressStep(
            '📈 Step 5: Progress Tracking',
            'Overall AI generation progress:',
            matchedCount,
            totalSources
        );
    },

    checkAiStream(marker, severity) {
        return StepTemplates.flowStep(
            '🔍 Step 6: Check AI Response Stream',
            'Monitoring the AI stream for this marker:',
            [
                { icon: '📡', text: 'AI stream status: ACTIVE', type: 'info' },
                { icon: '🔍', text: `Looking for marker: ${marker}`, type: 'info' },
                { icon: '❌', text: 'NOT YET RECEIVED from AI', type: 'warning' },
                { icon: '⏳', text: 'Waiting for AI to generate this segment...', type: 'warning' }
            ],
            severity
        );
    },

    baseMarkerAnalysis(baseMarker, totalCount, matched, waiting, index, allMarkers) {
        return StepTemplates.info(
            '📊 Step 7: Base Marker Group Analysis',
            `Analyzing all (${baseMarker}) markers to see if others in the same group have been matched:`,
            {
                'Base Marker': `(${baseMarker})`,
                'Total Count': totalCount,
                'Matched': matched,
                'Waiting': waiting,
                'This Marker Index': index,
                'All Markers': allMarkers
            }
        );
    },

    positionAnalysis(position, lastMatched, isSkipped) {
        return {
            title: '🎯 Step 8: Position Analysis',
            content: 'Analyzing this segment\'s position relative to matched segments:',
            severity: isSkipped ? 'warning' : 'info',
            data: {
                'This Segment Position': position,
                'Last Matched Position': lastMatched,
                'Status': isSkipped ? '⚠️ SKIPPED (AI passed this segment)' : '✓ NORMAL (AI hasn\'t reached this yet)',
                'Expected Behavior': isSkipped ? 'This should have been matched already' : 'AI will process this in sequence'
            },
            alert: isSkipped ? {
                type: 'warning',
                message: `⚠️ POTENTIAL ISSUE: This segment is at position ${position}, but ${lastMatched} segments have already been matched.\n\nThis suggests the AI may have skipped this segment. Possible causes:\n1. AI didn't preserve the marker in its output\n2. AI reordered the segments\n3. AI is processing non-sequentially\n\nRecommended: Continue waiting, but monitor for orphans with different markers.`
            } : null
        };
    },

    prepareJsonStructure(marker, sourceText) {
        return StepTemplates.codeDisplay(
            '🏗️ Step 9: Prepare JSON Pair Structure',
            'Pre-building the pair structure (target will be added when received):',
            `{\n  "marker": "${marker}",\n  "source": "${truncate(sourceText, 50)}",\n  "target": null  // ⏳ WAITING FOR AI\n}`,
            'info'
        );
    },

    expectedBehavior(baseMarker, marker) {
        return StepTemplates.flowStep(
            '⏳ Step 10: Expected AI Behavior',
            'What we expect from the AI:',
            [
                { icon: '✓', text: `AI should generate a segment with marker: (${baseMarker})`, type: 'info' },
                { icon: '✓', text: `System will parse it as: ${marker}`, type: 'info' },
                { icon: '✓', text: 'Index should match this source segment', type: 'info' },
                { icon: '✓', text: 'Then it will be automatically matched', type: 'success' }
            ],
            'info'
        );
    },

    diagnosticChecklist(progressPercent, position, total, matched, totalBase, baseMarker, waitTime, isNormalPosition) {
        return {
            title: '🔬 Step 11: Diagnostic Checklist',
            content: 'What could be causing the wait:',
            severity: 'info',
            diagnostic: [
                `AI is still processing (${progressPercent}% complete)`,
                `This segment is at position ${position}/${total}`,
                `${matched}/${totalBase} (${baseMarker}) segments have been matched`,
                waitTime < 30 ? 'Wait time is normal (< 30s)' : waitTime < 60 ? 'Wait time is moderate (30-60s)' : 'Wait time is long (> 60s)',
                isNormalPosition ? 'Position is normal (AI hasn\'t reached it yet)' : 'Position suggests AI may have skipped it'
            ]
        };
    },

    currentJsonState(jsonPair) {
        return StepTemplates.jsonStep(
            '📦 Step 12: Current JSON State',
            '⏳ Incomplete pair (waiting for target):',
            jsonPair,
            'warning'
        );
    },

    whenMatched() {
        return StepTemplates.flowStep(
            '✅ Step 13: What Happens When Matched',
            'Once AI generates the matching segment, the following will occur:',
            [
                { icon: '1️⃣', text: 'AI generates segment with matching marker', type: 'info' },
                { icon: '2️⃣', text: 'System detects marker match', type: 'success' },
                { icon: '3️⃣', text: 'Target text is extracted from AI response', type: 'success' },
                { icon: '4️⃣', text: 'JSON pair is completed with target field', type: 'success' },
                { icon: '5️⃣', text: 'Status changes from WAITING → MATCHED', type: 'success' },
                { icon: '6️⃣', text: 'Pair is displayed in main view', type: 'success' }
            ],
            'success'
        );
    },

    possibleOutcomes(marker, baseMarker, waitTime) {
        return {
            title: '⚠️ Step 14: Possible Outcomes',
            content: 'Potential final states for this segment:',
            severity: 'info',
            diagnostic: [
                `✅ BEST CASE: AI generates ${marker} → Status: MATCHED`,
                `⚠️ ORPHAN CASE: AI generates different ${baseMarker} index → Status: GAP (source without target)`,
                `🔴 WORST CASE: AI never generates (${baseMarker}) marker → Status: PERMANENT GAP`,
                `📊 CURRENT: Status is WAITING with ${waitTime}s elapsed`
            ]
        };
    },

    recommendations(severity, waitTime, progressPercent, position, total) {
        const isWarning = severity === 'warning';
        return StepTemplates.alertStep(
            '💡 Step 15: Recommendations',
            'Actions and expectations:',
            isWarning ? 'warning' : 'info',
            isWarning
                ? `⚠️ ACTION RECOMMENDED:\n\n1. Continue monitoring - AI may still generate this segment\n2. If wait time exceeds 120s, consider:\n   • Checking if AI is still responding\n   • Verifying prompt includes all markers\n   • Looking for orphan segments with similar content\n3. Current wait: ${waitTime}s\n4. Progress: ${progressPercent}%\n\n⏳ Waiting segments are normal during generation. This will auto-resolve when AI generates the matching segment.`
                : `ℹ️ NORMAL STATUS:\n\n✓ This segment is waiting normally for AI response\n✓ Current progress: ${progressPercent}%\n✓ Wait time: ${waitTime}s (acceptable)\n✓ Position: ${position}/${total}\n\n⏳ Expected behavior: AI will generate this segment in sequence. Once received, it will automatically match and status will change to MATCHED.\n\nNo action needed - continue monitoring.`,
            severity
        );
    }
};

/**
 * Orphan Event Step Templates
 */
export const OrphanStepTemplates = {
    receivedOrphan(marker, textLength, timestamp, baseMarker, index) {
        return {
            title: '📥 Step 1: Received Orphan Segment from AI',
            content: `A new segment has been parsed from the AI response stream with marker <span class="marker-tag orphan">${marker}</span>`,
            severity: 'warning',
            data: {
                'Raw Marker': marker,
                'Text Length': `${textLength} characters`,
                'Timestamp': timestamp,
                'Base Marker': baseMarker,
                'Index': index
            }
        };
    },

    parseOrphanMarker(marker, baseMarker, index) {
        return StepTemplates.info(
            '🔍 Step 2: Parse Marker Components',
            'Breaking down the orphan marker into base letter and index number to understand what AI generated:',
            {
                'Full Marker': marker,
                'Base Marker': `(${baseMarker})`,
                'Index Number': index,
                'Pattern': `(${baseMarker}) → ${baseMarker}-${index}`,
                'Expected Pattern': 'Must match source segment markers'
            }
        );
    },

    displayOrphanText(text) {
        return StepTemplates.codeDisplay(
            '📋 Step 3: Display Orphan Target Text',
            '⚠️ This is the text content that the AI generated WITHOUT a matching source:',
            text,
            'warning'
        );
    },

    searchForMatch(marker, totalSegments) {
        return StepTemplates.flowStep(
            '🗂️ Step 4: Search Source Map for Match',
            `Attempting to find marker <span class="marker-tag orphan">${marker}</span> in the source segments map...`,
            [
                { icon: '📊', text: `Total source segments loaded: ${totalSegments}`, type: 'info' },
                { icon: '🔑', text: `Looking for exact key: "${marker}"`, type: 'info' },
                { icon: '❌', text: '❌ NO MATCH FOUND in source map!', type: 'error' }
            ],
            'warning'
        );
    },

    deepDiagnostic(marker, searchResult, severity) {
        return StepTemplates.flowStep(
            '🔍 Step 5: Deep Diagnostic Analysis',
            `Analyzing WHY <span class="marker-tag orphan">${marker}</span> was not found in source:`,
            searchResult,
            severity
        );
    },

    rootCause(reason, gapDetails, diagnostics) {
        return {
            title: '❌ Step 6: Root Cause Identification',
            content: `<strong>Problem Identified: ${reason}</strong>`,
            severity: 'error',
            alert: { type: 'error', message: gapDetails },
            diagnostic: diagnostics
        };
    },

    sourceInventory(sourceMarkerSummary) {
        return StepTemplates.info(
            '📊 Step 7: Source Segments Inventory',
            'Complete breakdown of all source segments by base marker category:',
            sourceMarkerSummary
        );
    },

    compareExpectedActual(expected, actual, mismatchType, sourceCount, aiGenerated) {
        return {
            title: '🔬 Step 8: Compare Expected vs Actual',
            content: 'Detailed comparison showing the mismatch:',
            severity: 'warning',
            data: {
                'Expected': expected,
                'Actual AI Output': actual,
                'Mismatch Type': mismatchType,
                'Source Count': sourceCount,
                'AI Generated': aiGenerated
            }
        };
    },

    initializeOrphanJson() {
        return StepTemplates.codeDisplay(
            '🏗️ Step 9: Initialize Orphan JSON Object',
            '⚠️ Creating orphan pair object (source will be NULL):',
            '{}',
            'warning'
        );
    },

    addOrphanMarker(marker) {
        return StepTemplates.codeDisplay(
            '🔧 Step 10: Add "marker" Field',
            'Setting the orphan marker field:',
            `{\n  "marker": "${marker}"\n}`,
            'info'
        );
    },

    setSourceNull(marker) {
        return {
            title: '🔧 Step 11: Set "source" to NULL',
            content: '❌ Source MUST be NULL because no matching source segment exists:',
            severity: 'error',
            code: `{\n  "marker": "${marker}",\n  "source": null  // ⚠️ NO SOURCE MATCH\n}`,
            alert: {
                type: 'warning',
                message: 'The source field is set to NULL because this is an orphan segment with no corresponding source marker.'
            }
        };
    },

    addOrphanTarget(marker, targetText) {
        return StepTemplates.codeDisplay(
            '🔧 Step 12: Add "target" Field with AI Text',
            'Adding the AI-generated target text (even though it has no source):',
            `{\n  "marker": "${marker}",\n  "source": null,\n  "target": "${truncate(targetText, 50)}"\n}`,
            'warning'
        );
    },

    finalOrphanJson(jsonPair) {
        return StepTemplates.jsonStep(
            '📦 Step 13: Final Orphan JSON Pair',
            '⚠️ Complete orphan pair object with NULL source (this will be flagged in the UI):',
            jsonPair,
            'warning'
        );
    },

    severityAssessment(severity) {
        return StepTemplates.flowStep(
            '⚠️ Step 14: Classification & Severity Assessment',
            'Final status determination and severity classification:',
            [
                { icon: '❌', text: 'Source exists: NO', type: 'error' },
                { icon: '❌', text: 'Markers match: NO', type: 'error' },
                { icon: severity === 'critical' ? '🔴' : '⚠️', text: `Severity: ${severity.toUpperCase()}`, type: severity === 'critical' ? 'error' : 'warning' },
                { icon: '📋', text: `Status: ORPHAN (${severity === 'critical' ? 'Hallucinated' : 'Index Mismatch'})`, type: 'warning' }
            ],
            severity
        );
    },

    addOrphanToMapper(marker, severity, reason, diagnostics) {
        return StepTemplates.alertStep(
            '🎯 Step 15: Add to Mapper with Orphan Flag',
            'This orphan will be added to the mapping display with clear warning indicators:',
            'error',
            `🚨 ORPHAN DETECTED: Marker "${marker}" generated by AI but NOT found in source.\n\n${severity === 'critical' ? '🔴 CRITICAL' : '⚠️ WARNING'}: ${reason}\n\n📋 Root Cause Analysis:\n${diagnostics.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n💡 Recommended Actions:\n1. Review your prompt to ensure AI preserves exact marker counts\n2. Check if AI is duplicating or inventing markers\n3. Verify source segment parsing is correct\n4. Consider adjusting AI temperature/parameters for better adherence`,
            severity
        );
    }
};