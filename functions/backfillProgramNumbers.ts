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
        
        // Collect existing numbers to ensure uniqueness
        const usedNumbers = new Set();
        syllabi.forEach(s => {
            if (s.program_number) {
                usedNumbers.add(s.program_number);
            }
        });

        const updates = [];
        
        for (const syllabus of syllabi) {
            // If program_number is missing, generate one
            if (!syllabus.program_number) {
                let randomNum;
                let retries = 0;
                do {
                    randomNum = Math.floor(1000 + Math.random() * 9000).toString();
                    retries++;
                } while (usedNumbers.has(randomNum) && retries < 100);
                
                if (!usedNumbers.has(randomNum)) {
                    usedNumbers.add(randomNum);
                    updates.push(base44.entities.Syllabus.update(syllabus.id, { program_number: randomNum }));
                }
            }
        }
        
        await Promise.all(updates);

        return Response.json({ 
            message: `Updated ${updates.length} syllabi with unique program numbers`,
            total_programs: syllabi.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});