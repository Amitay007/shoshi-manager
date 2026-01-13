import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export const logDiagnostic = async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);
        const { type, source, message, duration } = await req.json();

        await base44.entities.SystemDiagnostics.create({
            type: type || 'Info',
            source: source || 'Unknown',
            message: message || '',
            duration: Number(duration) || 0,
            timestamp: new Date().toISOString()
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

Deno.serve(logDiagnostic);