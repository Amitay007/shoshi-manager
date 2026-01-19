import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to extract links from text
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s"'`]+)/g;
    return text.match(urlRegex) || [];
}

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Note: In a serverless environment, access to source files (./pages) might be restricted 
        // or the structure might differ. We attempt to read './pages'.
        // If this fails, we return a clear message.
        
        const results = [];
        const pagesDir = './pages'; // Adjust if the deployment structure is different

        try {
            for await (const dirEntry of Deno.readDir(pagesDir)) {
                if (dirEntry.isFile && (dirEntry.name.endsWith('.js') || dirEntry.name.endsWith('.jsx'))) {
                    const content = await Deno.readTextFile(`${pagesDir}/${dirEntry.name}`);
                    const links = extractLinks(content);
                    
                    if (links.length > 0) {
                        // Check each link status
                        const linkStatuses = await Promise.all(links.map(async (url) => {
                            try {
                                const res = await fetch(url, { method: 'HEAD' });
                                return { url, status: res.status, ok: res.ok };
                            } catch (e) {
                                return { url, status: 'error', error: e.message };
                            }
                        }));

                        results.push({
                            page: dirEntry.name,
                            links: linkStatuses
                        });
                    }
                }
            }
        } catch (fsError) {
             // Fallback/Simulated for demo if FS access is blocked
             console.error("FS Access Error:", fsError);
             return Response.json({ 
                 error: "Cannot access source files directly in this environment.", 
                 details: fsError.message 
             });
        }

        // Save results to SystemDiagnostics
        if (results.length > 0) {
             const diagEntry = {
                type: 'Info',
                source: 'LinkScanner',
                message: `Scanned ${results.length} pages. Found broken links in some.`,
                data: JSON.stringify(results.filter(r => r.links.some(l => !l.ok))),
                timestamp: new Date().toISOString()
            };
            // We use the service role to ensure we can write to diagnostics if RLS prevents it (though agent usually has permissions)
             await base44.asServiceRole.entities.SystemDiagnostics.create(diagEntry);
        }

        return Response.json({ 
            success: true, 
            scanned_pages_count: results.length,
            issues_found: results.filter(r => r.links.some(l => !l.ok)).length,
            results 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});