/**
 * Debugger Events
 * Event creation logic using reusable templates
 */

import { getSourceMarkerSummary } from './debugger-utils.js';
import { MatchedStepTemplates, WaitingStepTemplates, OrphanStepTemplates } from './debugger-templates.js';

export function createWaitingEvent(source, debugContext) {
    const baseMarker = source.marker.split('-')[0];
    const index = parseInt(source.marker.split('-')[1]);
    const timestamp = new Date().toLocaleTimeString();

    // Calculate metrics
    const waitTime = debugContext.generationStartTime 
        ? Math.floor((Date.now() - debugContext.generationStartTime) / 1000) 
        : 0;

    const totalSources = debugContext.sourceSegments.length;
    const matchedCount = debugContext.targetSegments.filter(t =>
        debugContext.sourceSegments.find(s => s.marker === t.marker)
    ).length;
    const progressPercent = Math.floor((matchedCount / totalSources) * 100);

    const sourceIndex = debugContext.sourceSegments.findIndex(s => s.marker === source.marker);
    const isSkipped = matchedCount > 0 && sourceIndex < matchedCount;

    // Determine severity
    let severity, severityReason;
    if (waitTime > 60) {
        severity = 'warning';
        severityReason = 'Long wait time (>60s)';
    } else if (isSkipped) {
        severity = 'warning';
        severityReason = 'AI skipped this segment';
    } else {
        severity = 'info';
        severityReason = 'Normal - awaiting AI response';
    }

    const jsonPair = { marker: source.marker, source: source.text, target: '⏳ PENDING...' };

    // Get same base marker segments
    const sameBaseSegments = debugContext.sourceSegments.filter(s => s.marker.startsWith(baseMarker + '-'));
    const sameBaseMatched = sameBaseSegments.filter(s =>
        debugContext.targetSegments.find(t => t.marker === s.marker)
    ).length;

    // Build steps using templates
    const steps = [
        WaitingStepTemplates.sourceLoaded(
            source.marker,
            source.text.length,
            sourceIndex + 1,
            totalSources,
            debugContext.generationStartTime ? new Date(debugContext.generationStartTime).toLocaleTimeString() : 'N/A'
        ),
        WaitingStepTemplates.parseMarker(source.marker, baseMarker, index),
        WaitingStepTemplates.displaySourceText(source.text),
        WaitingStepTemplates.waitingAnalysis(source.marker, totalSources, matchedCount, progressPercent, waitTime, severity),
        WaitingStepTemplates.progressTracking(matchedCount, totalSources),
        WaitingStepTemplates.checkAiStream(source.marker, severity),
        WaitingStepTemplates.baseMarkerAnalysis(
            baseMarker,
            sameBaseSegments.length,
            sameBaseMatched,
            sameBaseSegments.length - sameBaseMatched,
            index,
            sameBaseSegments.map(s => s.marker).join(', ')
        ),
        WaitingStepTemplates.positionAnalysis(sourceIndex + 1, matchedCount, isSkipped),
        WaitingStepTemplates.prepareJsonStructure(source.marker, source.text),
        WaitingStepTemplates.expectedBehavior(baseMarker, source.marker),
        WaitingStepTemplates.diagnosticChecklist(
            progressPercent,
            sourceIndex + 1,
            totalSources,
            sameBaseMatched,
            sameBaseSegments.length,
            baseMarker,
            waitTime,
            sourceIndex >= matchedCount
        ),
        WaitingStepTemplates.currentJsonState(jsonPair),
        WaitingStepTemplates.whenMatched(),
        WaitingStepTemplates.possibleOutcomes(source.marker, baseMarker, waitTime),
        WaitingStepTemplates.recommendations(severity, waitTime, progressPercent, sourceIndex + 1, totalSources)
    ];

    return {
        type: 'waiting',
        severity: severity,
        number: debugContext.eventCount + 1,
        timestamp,
        marker: source.marker,
        jsonPair,
        severityLabel: severity === 'warning' ? '⚠ WARNING' : 'ℹ INFO',
        statusText: `Status: WAITING - ${severityReason}`,
        statusIcon: '⏳',
        steps
    };
}

export function createMatchedEvent(target, source, timestamp, debugContext) {
    const baseMarker = target.marker.split('-')[0];
    const index = parseInt(target.marker.split('-')[1]);
    const jsonPair = { marker: target.marker, source: source.text, target: target.text };

    // Build steps using templates
    const steps = [
        MatchedStepTemplates.receivedSegment(target.marker, target.text.length, timestamp),
        MatchedStepTemplates.parseMarker(target.marker, baseMarker, index),
        MatchedStepTemplates.displayTargetText(target.text),
        MatchedStepTemplates.searchSourceMap(target.marker, debugContext.sourceSegments.length),
        MatchedStepTemplates.retrievedSource(source.marker, source.text, source.text.length),
        MatchedStepTemplates.compareSourceTarget(source.text, target.text),
        MatchedStepTemplates.initializeJson(),
        MatchedStepTemplates.addMarkerField(target.marker),
        MatchedStepTemplates.addSourceField(target.marker, source.text),
        MatchedStepTemplates.addTargetField(target.marker, source.text, target.text),
        MatchedStepTemplates.finalJsonPair(jsonPair),
        MatchedStepTemplates.classificationResult(),
        MatchedStepTemplates.addToMapper()
    ];

    return {
        type: 'matched',
        severity: 'success',
        number: debugContext.eventCount,
        timestamp,
        marker: target.marker,
        jsonPair,
        severityLabel: '✓ SUCCESS',
        statusText: '', // Set to empty string to prevent the redundant summary text
        statusIcon: '✅',
        steps
    };
}

export function createOrphanEvent(target, timestamp, debugContext) {
    const baseMarker = target.marker.split('-')[0];
    const index = parseInt(target.marker.split('-')[1]);
    const sourceWithBase = debugContext.sourceSegments.filter(s => s.marker.startsWith(baseMarker + '-'));

    let reason, gapDetails, searchResult, severity, diagnostics;

    if (sourceWithBase.length === 0) {
        // CRITICAL: Base marker doesn't exist at all
        severity = 'critical';
        reason = `AI hallucinated base marker (${baseMarker})`;
        gapDetails = `🔴 CRITICAL ISSUE: The AI generated a marker with base "(${baseMarker})", but your source input doesn't contain ANY segments with this base marker.\n\nThis means the AI completely invented this marker category.`;
        searchResult = [
            { icon: '🔍', text: `Searching for base marker: (${baseMarker})`, type: 'info' },
            { icon: '❌', text: `NO (${baseMarker}) markers found in source`, type: 'error' },
            { icon: '📊', text: `Source has 0 segments with base "${baseMarker}"`, type: 'error' },
            { icon: '💥', text: 'AI HALLUCINATION DETECTED', type: 'error' }
        ];
        diagnostics = [
            'The AI invented a completely new marker category',
            `Your source does not use (${baseMarker}) markers at all`,
            'The AI was not following the source marker pattern',
            'This indicates poor prompt adherence or AI confusion'
        ];
    } else {
        // WARNING: Base marker exists but wrong index
        severity = 'warning';
        const available = sourceWithBase.map(s => s.marker).join(', ');
        const maxIndex = Math.max(...sourceWithBase.map(s => parseInt(s.marker.split('-')[1])));
        reason = `Index mismatch for base marker (${baseMarker})`;
        gapDetails = `⚠️ INDEX MISMATCH: Source contains ${sourceWithBase.length} segment(s) with base marker (${baseMarker}), but the AI generated index ${index} which doesn't exist.\n\nAvailable markers: ${available}`;
        searchResult = [
            { icon: '🔍', text: `Searching for: ${target.marker}`, type: 'info' },
            { icon: '✓', text: `Found ${sourceWithBase.length} source segment(s) with base "${baseMarker}"`, type: 'success' },
            { icon: '📋', text: `Available: ${available}`, type: 'info' },
            { icon: '❌', text: `Index ${index} NOT found (max index is ${maxIndex})`, type: 'error' },
            { icon: '⚠️', text: 'INDEX OUT OF RANGE', type: 'warning' }
        ];
        diagnostics = [
            `AI generated too many (${baseMarker}) segments`,
            `Source has ${sourceWithBase.length} (${baseMarker}) marker(s), AI generated at least ${index + 1}`,
            `Index ${index} exceeds available range (0-${maxIndex})`,
            'This could indicate AI duplication or incorrect segment counting'
        ];
    }

    const jsonPair = { marker: target.marker, source: null, target: target.text };

    // Build steps using templates
    const steps = [
        OrphanStepTemplates.receivedOrphan(target.marker, target.text.length, timestamp, baseMarker, index),
        OrphanStepTemplates.parseOrphanMarker(target.marker, baseMarker, index),
        OrphanStepTemplates.displayOrphanText(target.text),
        OrphanStepTemplates.searchForMatch(target.marker, debugContext.sourceSegments.length),
        OrphanStepTemplates.deepDiagnostic(target.marker, searchResult, severity),
        OrphanStepTemplates.rootCause(reason, gapDetails, diagnostics),
        OrphanStepTemplates.sourceInventory(getSourceMarkerSummary(debugContext.sourceSegments)),
        OrphanStepTemplates.compareExpectedActual(
            `Should match one of: ${sourceWithBase.length > 0 ? sourceWithBase.map(s => s.marker).join(', ') : 'N/A (no source markers with this base)'}`,
            target.marker,
            severity === 'critical' ? 'HALLUCINATED BASE MARKER' : 'INDEX OUT OF RANGE',
            `${sourceWithBase.length} segment(s) with base (${baseMarker})`,
            `Index ${index} (doesn't exist in source)`
        ),
        OrphanStepTemplates.initializeOrphanJson(),
        OrphanStepTemplates.addOrphanMarker(target.marker),
        OrphanStepTemplates.setSourceNull(target.marker),
        OrphanStepTemplates.addOrphanTarget(target.marker, target.text),
        OrphanStepTemplates.finalOrphanJson(jsonPair),
        OrphanStepTemplates.severityAssessment(severity),
        OrphanStepTemplates.addOrphanToMapper(target.marker, severity, reason, diagnostics)
    ];

    return {
        type: 'orphan',
        severity: severity,
        number: debugContext.eventCount,
        timestamp,
        marker: target.marker,
        jsonPair,
        severityLabel: severity === 'critical' ? '✖ CRITICAL' : '⚠ WARNING',
        statusText: 'Status: ORPHAN - ' + reason,
        statusIcon: severity === 'critical' ? '🔴' : '⚠️',
        steps
    };
}