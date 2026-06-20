import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const { url } = await req.json();
        
        if (!url) {
            return Response.json({ error: "URL is required" }, { status: 400 });
        }

        try {
            const response = await fetch(url, { method: 'HEAD' });
            return Response.json({ 
                url, 
                status: response.status, 
                ok: response.ok 
            });
        } catch (error) {
            return Response.json({ 
                url, 
                status: 'error', 
                error: error.message 
            });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});