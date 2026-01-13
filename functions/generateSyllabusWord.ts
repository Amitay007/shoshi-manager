import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType } from "npm:docx@8.5.0";
import { Buffer } from "node:buffer";

// Yoya Brand Colors
const COLORS = {
    PURPLE: "6B46C1",
    DARK: "2D1B69",
    CYAN: "00D4FF",
    BLACK: "000000",
    GRAY: "666666"
};

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

        // 2. Build Content
        const sections = [];

        // Title
        sections.push(
            new Paragraph({
                text: syllabus.title || "הצעת תוכן - סילבוס VR",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { after: 400 },
                run: {
                    color: COLORS.DARK,
                    font: "Assistant"
                }
            }),
            new Paragraph({ text: "", spacing: { after: 200 } })
        );

        // General Details
        if (options.general) {
            sections.push(
                new Paragraph({
                    text: "פרטים כלליים",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 200, after: 200 },
                    run: { color: COLORS.PURPLE, font: "Assistant" },
                    border: { bottom: { color: COLORS.CYAN, space: 1, style: BorderStyle.SINGLE, size: 6 } }
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
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: item.label + " ", bold: true, size: 24, font: "Assistant", color: COLORS.DARK }),
                                new TextRun({ text: item.value, size: 24, font: "Assistant" })
                            ],
                            bidirectional: true,
                            spacing: { after: 120 }
                        })
                    );
                }
            });
        }

        // Gifts
        if (options.gifts) {
            sections.push(
                new Paragraph({
                    text: "מתנות הלמידה",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 400, after: 200 },
                    run: { color: COLORS.PURPLE, font: "Assistant" },
                    border: { bottom: { color: COLORS.CYAN, space: 1, style: BorderStyle.SINGLE, size: 6 } }
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
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: "• " + item.label + " ", bold: true, size: 24, font: "Assistant", color: COLORS.DARK }),
                                new TextRun({ text: item.value, size: 24, font: "Assistant" })
                            ],
                            bidirectional: true,
                            spacing: { after: 120 }
                        })
                    );
                }
            });
        }

        // Sessions
        if (options.sessions && options.sessions.length > 0) {
            sections.push(
                new Paragraph({
                    text: "פירוט המפגשים",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 400, after: 300 },
                    run: { color: COLORS.PURPLE, font: "Assistant" },
                    border: { bottom: { color: COLORS.CYAN, space: 1, style: BorderStyle.SINGLE, size: 6 } }
                })
            );

            const selectedSessions = (syllabus.sessions || [])
                .filter((_, index) => options.sessions.includes(index))
                .sort((a, b) => a.number - b.number);

            selectedSessions.forEach((session) => {
                // Session Header
                sections.push(
                    new Paragraph({
                        text: `מפגש ${session.number}: ${session.topic || "ללא נושא"}`,
                        heading: HeadingLevel.HEADING_2,
                        bidirectional: true,
                        spacing: { before: 300, after: 150 },
                        run: { color: COLORS.DARK, font: "Assistant" },
                        shading: { fill: "F8F9FA", color: "auto" }
                    })
                );

                // Apps
                if (options.sessionContent?.apps && session.app_ids?.length > 0) {
                    const appNames = session.app_ids.map(id => appMap[id] || "Unknown App").join(", ");
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: "אפליקציות: ", bold: true, font: "Assistant", size: 22, color: COLORS.PURPLE }),
                                new TextRun({ text: appNames, font: "Assistant", size: 22 })
                            ],
                            bidirectional: true,
                            spacing: { after: 100 },
                            indent: { start: 300 }
                        })
                    );
                }

                // Experiences
                if (options.sessionContent?.experiences && session.experience_ids?.length > 0) {
                    const expNames = session.experience_ids.map(id => appMap[id] || "Unknown Experience").join(", ");
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: "חוויות: ", bold: true, font: "Assistant", size: 22, color: COLORS.PURPLE }),
                                new TextRun({ text: expNames, font: "Assistant", size: 22 })
                            ],
                            bidirectional: true,
                            spacing: { after: 100 },
                            indent: { start: 300 }
                        })
                    );
                }

                // Steps
                if (options.sessionContent?.steps && session.steps?.length > 0) {
                    sections.push(
                        new Paragraph({
                            text: "מהלך השיעור:",
                            bold: true,
                            font: "Assistant",
                            size: 22,
                            color: COLORS.DARK,
                            bidirectional: true,
                            spacing: { before: 100, after: 50 },
                            indent: { start: 300 }
                        })
                    );
                    
                    session.steps.forEach((step, idx) => {
                        sections.push(
                            new Paragraph({
                                text: `${idx + 1}. ${step}`,
                                font: "Assistant",
                                size: 22,
                                bidirectional: true,
                                indent: { start: 600 },
                                spacing: { after: 50 }
                            })
                        );
                    });
                }

                // Worksheets
                if (options.sessionContent?.worksheets && session.worksheet_urls?.length > 0) {
                     sections.push(
                        new Paragraph({
                            text: "דפי עבודה:",
                            bold: true,
                            font: "Assistant",
                            size: 22,
                            color: COLORS.DARK,
                            bidirectional: true,
                            spacing: { before: 100, after: 50 },
                            indent: { start: 300 }
                        })
                    );
                    session.worksheet_urls.forEach(ws => {
                        sections.push(
                            new Paragraph({
                                text: `• ${ws.name || "קובץ"} - ${ws.url}`,
                                font: "Assistant",
                                size: 20,
                                color: "0000FF",
                                bidirectional: true,
                                indent: { start: 600 }
                            })
                        );
                    });
                }
            });
        }

        // Generate Doc
        const doc = new Document({
            sections: [{
                properties: {},
                children: sections,
            }],
        });

        // Pack
        const buffer = await Packer.toBuffer(doc);
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