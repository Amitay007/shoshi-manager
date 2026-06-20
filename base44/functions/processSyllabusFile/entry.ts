import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

export default Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    // Diagnostic helper
    const logDiag = async (type, message, duration = 0, metadata = {}) => {
        try {
            await base44.functions.invoke('logDiagnostic', {
                type,
                source: 'processSyllabusFile',
                message,
                duration,
                metadata
            });
        } catch (e) {
            console.error("Failed to log diagnostic", e);
        }
    };

    const startTime = performance.now();

    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url } = await req.json();

        if (!file_url) {
            await logDiag('Error', 'Missing file_url');
            return Response.json({ error: 'Missing file_url' }, { status: 400 });
        }

        await logDiag('Info', 'Starting syllabus processing from file');

        // 1. Get Syllabus Schema for reference (simplified)
        // We want the AI to match this structure
        const syllabusStructure = {
            teacher_name: "string",
            course_topic: "string",
            subject: "string",
            target_audience: ["string (e.g. 'כיתה ז', 'תיכון')"],
            activity_type: "string",
            sessions: [
                {
                    number: "number",
                    topic: "string",
                    steps: ["string"]
                }
            ],
            purposes: "string (educational goals)",
            technology_tools: ["string"],
            status: "draft"
        };

        // 2. Call LLM to analyze the file
        const llmStart = performance.now();
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `
            You are an expert curriculum developer. 
            Analyze the attached syllabus file and extract the data into a JSON object matching the following structure exactly.
            
            Structure:
            ${JSON.stringify(syllabusStructure, null, 2)}
            
            Instructions:
            1. Extract the teacher's name if available.
            2. Infer the course topic and subject.
            3. Break down the content into sessions with topics and steps.
            4. Identify the target audience and activity type.
            5. Map technology tools mentioned.
            6. Return ONLY the JSON object.
            7. Ensure the response is valid JSON.
            8. Content is likely in Hebrew, preserve the Hebrew text.
            `,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    teacher_name: { type: "string" },
                    course_topic: { type: "string" },
                    subject: { type: "string" },
                    target_audience: { type: "array", items: { type: "string" } },
                    activity_type: { type: "string" },
                    purposes: { type: "string" },
                    technology_tools: { type: "array", items: { type: "string" } },
                    sessions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                number: { type: "number" },
                                topic: { type: "string" },
                                steps: { type: "array", items: { type: "string" } }
                            },
                            required: ["number", "topic"]
                        }
                    }
                },
                required: ["course_topic", "sessions"]
            }
        });
        
        const llmDuration = performance.now() - llmStart;
        await logDiag('Performance', 'LLM Analysis complete', llmDuration);

        const syllabusData = llmResponse; // InvokeLLM returns the object directly when schema is provided

        // 3. Create the Syllabus entity
        const createStart = performance.now();
        const newSyllabus = await base44.entities.Syllabus.create({
            ...syllabusData,
            status: "draft", // Always start as draft
            created_by: user.email
        });
        const createDuration = performance.now() - createStart;

        const totalDuration = performance.now() - startTime;
        
        await logDiag('Info', `Syllabus created successfully: ${newSyllabus.id}`, totalDuration, { syllabusId: newSyllabus.id });

        return Response.json({ success: true, syllabus: newSyllabus });

    } catch (error) {
        const totalDuration = performance.now() - startTime;
        await logDiag('Error', `Process failed: ${error.message}`, totalDuration, { error: error.toString() });
        return Response.json({ error: error.message }, { status: 500 });
    }
});