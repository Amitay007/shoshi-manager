import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all syllabi
        const syllabi = await base44.entities.Syllabus.list();
        
        const updates = [];
        
        for (const syllabus of syllabi) {
            // If program_number is missing, generate one
            if (!syllabus.program_number) {
                const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
                updates.push(base44.entities.Syllabus.update(syllabus.id, { program_number: randomNum }));
            }
        }
        
        await Promise.all(updates);

        return Response.json({ message: `Updated ${updates.length} syllabi with program numbers` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});