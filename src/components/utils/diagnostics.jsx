import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook to measure page load time (Mount -> Data Ready)
 * @param {string} source - Page name
 * @param {boolean} isLoading - Loading state variable
 */
export const usePerformanceTracker = (source, isLoading) => {
    const startRef = useRef(performance.now());
    const loggedRef = useRef(false);

    useEffect(() => {
        // Reset if loading starts again (optional, depending on if we want to track refetches)
        if (isLoading) {
            startRef.current = performance.now();
            loggedRef.current = false;
        } else if (!isLoading && !loggedRef.current) {
            const duration = performance.now() - startRef.current;
            base44.functions.invoke('logDiagnostic', {
                type: 'Performance',
                source,
                message: 'Page Load & Data Fetch',
                duration
            }).catch(e => console.error("Diag Log Error", e));
            loggedRef.current = true;
        }
    }, [isLoading, source]);
};

/**
 * Wrapper to measure specific heavy async operations
 * @param {string} source - Component/Page name
 * @param {string} operationName - Description of the operation
 * @param {Function} asyncFn - The async function to execute
 */
export const measureAsync = async (source, operationName, asyncFn) => {
    const start = performance.now();
    try {
        const result = await asyncFn();
        const duration = performance.now() - start;
        
        // Log performance
        base44.functions.invoke('logDiagnostic', {
            type: 'Performance',
            source,
            message: `Query: ${operationName}`,
            duration
        }).catch(e => console.error("Diag Log Error", e));

        return result;
    } catch (error) {
        // Log error
        base44.functions.invoke('logDiagnostic', {
            type: 'Error',
            source,
            message: `Error in ${operationName}: ${error.message}`,
            duration: performance.now() - start
        }).catch(e => console.error("Diag Log Error", e));
        
        throw error; // Re-throw to handle in UI
    }
};