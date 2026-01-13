import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "npm:docx@8.5.0";
import { Buffer } from "node:buffer";

export const generateSyllabusDocx = async (req) => {
    try {
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        const base44 = createClientFromRequest(req);
        const { syllabusId, options } = await req.json();

        // 1. Fetch Data
        const syllabus = await base44.entities.Syllabus.get(syllabusId);
        if (!syllabus) {
            return new Response('Syllabus not found', { status: 404 });
        }

        // Fetch related apps for names if needed
        let appMap = {};
        if (options.sessionContent?.apps || options.sessionContent?.experiences) {
            const apps = await base44.entities.VRApp.list();
            apps.forEach(app => {
                appMap[app.id] = app.name;
            });
        }

        // 2. Build Document Sections
        const children = [];

        // --- Header / Title ---
        children.push(
            new Paragraph({
                text: syllabus.title || "הצעת תוכן - סילבוס VR",
                heading: HeadingLevel.TITLE,
                alignment: "center",
                bidirectional: true,
            }),
            new Paragraph({ text: "", spacing: { after: 200 } })
        );

        // --- General Info (Opening) ---
        if (options.general) {
            children.push(
                new Paragraph({
                    text: "פרטים כלליים",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 200, after: 100 }
                })
            );

            const details = [
                { label: "שם המורה/מחבר:", value: syllabus.teacher_name },
                { label: "נושא הקורס:", value: syllabus.course_topic },
                { label: "תחום דעת:", value: syllabus.subject },
                { label: "קהל יעד:", value: (syllabus.target_audience || []).join(", ") },
                { label: "סוג פעילות:", value: syllabus.activity_type }
            ];

            details.forEach(item => {
                if (item.value) {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: item.label + " ", bold: true, size: 24, font: "Arial" }),
                                new TextRun({ text: item.value, size: 24, font: "Arial" })
                            ],
                            bidirectional: true,
                            spacing: { after: 100 }
                        })
                    );
                }
            });
        }

        // --- Learning Gifts ---
        if (options.gifts) {
            children.push(
                new Paragraph({
                    text: "מתנות הלמידה",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 400, after: 100 }
                })
            );

            const gifts = [
                { label: "ידע:", value: syllabus.gift_knowledge },
                { label: "מיומנות:", value: syllabus.gift_skill },
                { label: "הבנה:", value: syllabus.gift_understanding },
                { label: "תוצר סופי:", value: syllabus.final_product }
            ];

            gifts.forEach(item => {
                if (item.value) {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: "• " + item.label + " ", bold: true, size: 24, font: "Arial" }),
                                new TextRun({ text: item.value, size: 24, font: "Arial" })
                            ],
                            bidirectional: true,
                            spacing: { after: 100 }
                        })
                    );
                }
            });
        }

        // --- Sessions ---
        if (options.sessions && options.sessions.length > 0) {
            children.push(
                new Paragraph({
                    text: "פירוט המפגשים",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 400, after: 200 }
                })
            );

            const selectedSessions = (syllabus.sessions || [])
                .filter((_, index) => options.sessions.includes(index))
                .sort((a, b) => a.number - b.number);

            selectedSessions.forEach(session => {
                // Session Header
                children.push(
                    new Paragraph({
                        text: `מפגש ${session.number}: ${session.topic || "ללא נושא"}`,
                        heading: HeadingLevel.HEADING_2,
                        bidirectional: true,
                        spacing: { before: 300, after: 100 },
                        border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } }
                    })
                );

                // Session Content
                
                // Apps
                if (options.sessionContent?.apps && session.app_ids?.length > 0) {
                    const appNames = session.app_ids.map(id => appMap[id] || "Unknown App").join(", ");
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: "אפליקציות: ", bold: true, font: "Arial", size: 22 }),
                                new TextRun({ text: appNames, font: "Arial", size: 22 })
                            ],
                            bidirectional: true,
                            spacing: { after: 100 }
                        })
                    );
                }

                // Experiences
                if (options.sessionContent?.experiences && session.experience_ids?.length > 0) {
                    const expNames = session.experience_ids.map(id => appMap[id] || "Unknown Experience").join(", ");
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: "חוויות: ", bold: true, font: "Arial", size: 22 }),
                                new TextRun({ text: expNames, font: "Arial", size: 22 })
                            ],
                            bidirectional: true,
                            spacing: { after: 100 }
                        })
                    );
                }

                // Steps (Mahlach)
                if (options.sessionContent?.steps && session.steps?.length > 0) {
                    children.push(
                        new Paragraph({
                            text: "מהלך השיעור:",
                            bold: true,
                            font: "Arial",
                            size: 22,
                            bidirectional: true,
                            spacing: { before: 100 }
                        })
                    );
                    
                    session.steps.forEach((step, idx) => {
                        children.push(
                            new Paragraph({
                                text: `${idx + 1}. ${step}`,
                                font: "Arial",
                                size: 22,
                                bidirectional: true,
                                indent: { start: 300 },
                                spacing: { after: 50 }
                            })
                        );
                    });
                }

                // Worksheets
                if (options.sessionContent?.worksheets && session.worksheet_urls?.length > 0) {
                     children.push(
                        new Paragraph({
                            text: "דפי עבודה:",
                            bold: true,
                            font: "Arial",
                            size: 22,
                            bidirectional: true,
                            spacing: { before: 100 }
                        })
                    );
                    session.worksheet_urls.forEach(ws => {
                        children.push(
                            new Paragraph({
                                text: `• ${ws.name || "קובץ"}: ${ws.url}`,
                                font: "Arial",
                                size: 20,
                                color: "0000FF",
                                bidirectional: true,
                                indent: { start: 300 }
                            })
                        );
                    });
                }
            });
        }

        // 3. Create Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        // 4. Pack and Return
        const buffer = await Packer.toBuffer(doc);
        
        // Convert to Base64 using Buffer (more efficient)
        const base64 = Buffer.from(buffer).toString('base64');

        return Response.json({ 
            file_base64: base64,
            filename: `Syllabus_Proposal_${(syllabus.title || "draft").replace(/[^a-z0-9\u0590-\u05FF]/gi, "_")}.docx`
        });

    } catch (error) {
        console.error("Error generating DOCX:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

Deno.serve(generateSyllabusDocx);