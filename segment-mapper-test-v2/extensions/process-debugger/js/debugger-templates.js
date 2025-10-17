/**
 * Debugger Templates - Streamlined for essential information
 */

import { truncate } from './debugger-utils.js';

// Simplified template builders
const step = (title, content, severity = 'info', extras = {}) => 
    ({ title, content, severity, ...extras });

export const MatchedStepTemplates = {
    receivedSegment: (marker, textLength, timestamp) => step(
        '📥 Received from AI',
        'New segment parsed from AI response stream.',
        'info',
        { data: { 'Marker': marker, 'Length': `${textLength} chars`, 'Time': timestamp }}
    ),

    parseMarker: (marker, baseMarker, index) => step(
        '🔍 Parse Marker',
        'Breaking down marker components.',
        'info',
        { data: { 'Full': marker, 'Base': baseMarker, 'Index': index }}
    ),

    displayTargetText: (text) => step(
        '📋 Target Text',
        'AI generated content:',
        'info',
        { code: text }
    ),

    searchSourceMap: (marker, totalSegments) => step(
        '🗂️ Search Source',
        `Looking up <span class="marker-tag">${marker}</span> in ${totalSegments} source segments.`,
        'info',
        { flow: [
            { icon: '🔍', text: `Searching for: ${marker}`, type: 'info' },
            { icon: '✅', text: 'Match found!', type: 'success' }
        ]}
    ),

    retrievedSource: (marker, sourceText, textLength) => step(
        '📄 Source Retrieved',
        'Found matching source segment.',
        'success',
        { data: { 'Marker': marker, 'Length': `${textLength} chars`, 'Preview': truncate(sourceText, 80) }}
    ),

    compareSourceTarget: (sourceText, targetText) => step(
        '🔄 Compare',
        'Side-by-side comparison:',
        'info',
        { comparison: { source: sourceText, target: targetText }}
    ),

    finalJsonPair: (jsonPair) => step(
        '📦 JSON Pair',
        'Complete mapping ready:',
        'success',
        { json: jsonPair }
    ),

    classificationResult: () => step(
        '✅ Result: MATCHED',
        'Source and target successfully paired.',
        'success',
        { flow: [
            { icon: '✔', text: 'Source exists: YES', type: 'success' },
            { icon: '✔', text: 'Markers match: YES', type: 'success' },
            { icon: '✔', text: 'Status: MATCHED', type: 'success' }
        ]}
    ),

    addToMapper: () => step(
        '🎯 Add to Mapper',
        'Pair added to main display.',
        'success',
        { alert: { type: 'success', message: '✅ SUCCESS: Segment matched and mapped.' }}
    )
};

export const WaitingStepTemplates = {
    sourceLoaded: (marker, textLength, position, total, loadedTime) => step(
        '📋 Source Loaded',
        `Segment <span class="marker-tag waiting">${marker}</span> is waiting for AI.`,
        'info',
        { data: { 'Marker': marker, 'Length': `${textLength} chars`, 'Position': `${position}/${total}`, 'Loaded': loadedTime }}
    ),

    parseMarker: (marker, baseMarker, index) => step(
        '🔍 Parse Marker',
        'Marker components:',
        'info',
        { data: { 'Full': marker, 'Base': `(${baseMarker})`, 'Index': index }}
    ),

    displaySourceText: (text) => step(
        '📄 Source Text',
        'Waiting to be translated:',
        'info',
        { code: text }
    ),

    waitingAnalysis: (marker, totalSources, matchedCount, progressPercent, waitTime, severity) => step(
        '⏱️ Wait Status',
        `Analyzing <span class="marker-tag waiting">${marker}</span>:`,
        severity,
        { flow: [
            { icon: '📊', text: `Total: ${totalSources}`, type: 'info' },
            { icon: '✅', text: `Matched: ${matchedCount} (${progressPercent}%)`, type: matchedCount > 0 ? 'success' : 'info' },
            { icon: '⏳', text: `Waiting: ${totalSources - matchedCount}`, type: 'warning' },
            { icon: '⏱️', text: `Time: ${waitTime}s`, type: waitTime > 60 ? 'warning' : 'info' }
        ]}
    ),

    progressTracking: (matchedCount, totalSources) => step(
        '📈 Progress',
        'Generation progress:',
        'info',
        { progress: { current: matchedCount, total: totalSources, percent: Math.floor((matchedCount / totalSources) * 100) }}
    ),

    checkAiStream: (marker, severity) => step(
        '🔍 AI Stream Status',
        'Monitoring for this marker:',
        severity,
        { flow: [
            { icon: '📡', text: 'Stream: ACTIVE', type: 'info' },
            { icon: '❌', text: `${marker}: NOT RECEIVED`, type: 'warning' }
        ]}
    ),

    baseMarkerAnalysis: (baseMarker, totalCount, matched, waiting, index, allMarkers) => step(
        '📊 Group Analysis',
        `All (${baseMarker}) markers:`,
        'info',
        { data: { 'Total': totalCount, 'Matched': matched, 'Waiting': waiting, 'This Index': index, 'All': allMarkers }}
    ),

    currentJsonState: (jsonPair) => step(
        '📦 Current State',
        '⏳ Incomplete (waiting for target):',
        'warning',
        { json: jsonPair }
    ),

    recommendations: (severity, waitTime, progressPercent) => step(
        '💡 Recommendations',
        'Status and actions:',
        severity,
        { alert: {
            type: severity === 'warning' ? 'warning' : 'info',
            message: severity === 'warning'
                ? `⚠️ Long wait (${waitTime}s). Continue monitoring or check AI stream.`
                : `ℹ️ Normal wait. Progress: ${progressPercent}%. AI will generate this segment.`
        }}
    )
};

export const OrphanStepTemplates = {
    receivedOrphan: (marker, textLength, timestamp, baseMarker, index) => step(
        '📥 Orphan Received',
        `Segment <span class="marker-tag orphan">${marker}</span> has no source match.`,
        'warning',
        { data: { 'Marker': marker, 'Base': baseMarker, 'Index': index, 'Length': `${textLength} chars`, 'Time': timestamp }}
    ),

    parseOrphanMarker: (marker, baseMarker, index) => step(
        '🔍 Parse Orphan',
        'Analyzing orphan marker:',
        'info',
        { data: { 'Full': marker, 'Base': `(${baseMarker})`, 'Index': index }}
    ),

    displayOrphanText: (text) => step(
        '📋 Orphan Text',
        '⚠️ AI generated without matching source:',
        'warning',
        { code: text }
    ),

    searchForMatch: (marker, totalSegments) => step(
        '🗂️ Search Attempted',
        `Searching for <span class="marker-tag orphan">${marker}</span>...`,
        'warning',
        { flow: [
            { icon: '📊', text: `Total sources: ${totalSegments}`, type: 'info' },
            { icon: '❌', text: 'NO MATCH FOUND', type: 'error' }
        ]}
    ),

    deepDiagnostic: (marker, searchResult, severity) => step(
        '🔬 Deep Analysis',
        `Why <span class="marker-tag orphan">${marker}</span> wasn't found:`,
        severity,
        { flow: searchResult }
    ),

    rootCause: (reason, gapDetails, diagnostics) => step(
        '❌ Root Cause',
        `<strong>${reason}</strong>`,
        'error',
        { alert: { type: 'error', message: gapDetails }, diagnostic: diagnostics }
    ),

    sourceInventory: (sourceMarkerSummary) => step(
        '📊 Source Inventory',
        'All source segments by base marker:',
        'info',
        { data: sourceMarkerSummary }
    ),

    finalOrphanJson: (jsonPair) => step(
        '📦 Orphan JSON',
        '⚠️ Orphan pair (source: null):',
        'warning',
        { json: jsonPair }
    ),

    severityAssessment: (severity) => step(
        '⚠️ Classification',
        'Final status:',
        severity,
        { flow: [
            { icon: '❌', text: 'Source: NO', type: 'error' },
            { icon: '❌', text: 'Match: NO', type: 'error' },
            { icon: severity === 'critical' ? '🔴' : '⚠️', text: `Severity: ${severity.toUpperCase()}`, type: severity === 'critical' ? 'error' : 'warning' },
            { icon: '📋', text: 'Status: ORPHAN', type: 'warning' }
        ]}
    ),

    addOrphanToMapper: (marker, severity, reason, diagnostics) => step(
        '🎯 Add Orphan',
        'Orphan will be flagged in display.',
        'error',
        { alert: {
            type: 'error',
            message: `🚨 ORPHAN: "${marker}"\n\n${severity === 'critical' ? '🔴 CRITICAL' : '⚠️ WARNING'}: ${reason}\n\n📋 Analysis:\n${diagnostics.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
        }}
    )
};