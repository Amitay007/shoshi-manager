import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { entityName } = await req.json();

        if (!entityName) {
            return Response.json({ error: 'Entity name is required' }, { status: 400 });
        }

        // Sanitize entity name to prevent directory traversal
        const safeEntityName = entityName.replace(/[^a-zA-Z0-9_]/g, '');
        
        try {
            // Try to read the entity JSON schema file
            // In Deno Deploy / Base44 environment, we might not have direct file access to source files
            // But we can try common paths.
            // If this fails, we can return a basic schema based on the entity name (if we knew it)
            // OR we can use the SDK to get the schema if possible (but the frontend failed).
            // Actually, the SDK in backend MIGHT have .schema() working if the frontend one is stripped?
            // Let's try SDK first.
            
            // Dynamic access to entity in SDK
            // const entitySdk = base44.entities[safeEntityName];
            // if (entitySdk && typeof entitySdk.schema === 'function') {
            //    return Response.json(await entitySdk.schema());
            // }

            // If SDK method fails or doesn't exist, try reading file
            const schemaText = await Deno.readTextFile(`./entities/${safeEntityName}.json`);
            const schema = JSON.parse(schemaText);
            return Response.json(schema);
        } catch (err) {
            console.error(`Error fetching schema for ${safeEntityName}:`, err);
            
            // Fallback: return empty schema
            return Response.json({ 
                name: safeEntityName,
                type: "object",
                properties: {} 
            });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});