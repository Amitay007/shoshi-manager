import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from "npm:docx@8.5.0";

// שימוש בשיטה המובנית של Deno להמרת Base64 כדי למנוע תקלות Buffer
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// שים לב: שיניתי את השם ל-generateSyllabusWord כדי שיתאים לקריאה מהפרונטנד
export const generateSyllabusWord = async (req) => {
    try {
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        const base44 = createClientFromRequest(req);
        const { syllabusId, options } = await req.json();

        // 1. שליפת הנתונים
        const syllabus = await base44.entities.Syllabus.get(syllabusId);
        if (!syllabus) {
            return new Response(JSON.stringify({ error: 'Syllabus not found' }), { status: 404 });
        }

        // מיפוי אפליקציות לשמות
        let appMap = {};
        try {
            const apps = await base44.entities.VRApp.list();
            apps.forEach(app => {
                appMap[app.id] = app.name;
            });
        } catch (e) {
            console.error("Could not fetch apps, continuing without names");
        }

        // 2. בניית תוכן המסמך
        const children = [];

        // כותרת ראשית
        children.push(
            new Paragraph({
                text: syllabus.title || "הצעת תוכן - סילבוס VR",
                heading: HeadingLevel.TITLE,
                alignment: "center",
                bidirectional: true, // תמיכה בעברית
            }),
            new Paragraph({ text: "" })
        );

        // פרטים כלליים
        if (options.general) {
            children.push(
                new Paragraph({
                    text: "פרטים כלליים",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 400, after: 200 }
                })
            );

            const details = [
                { label: "שם המורה:", value: syllabus.teacher_name },
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
                                new TextRun({ text: item.label + " ", bold: true, size: 24 }),
                                new TextRun({ text: String(item.value), size: 24 })
                            ],
                            bidirectional: true,
                            spacing: { after: 120 }
                        })
                    );
                }
            });
        }

        // מפגשים
        if (options.sessions && options.sessions.length > 0) {
            children.push(
                new Paragraph({
                    text: "פירוט המפגשים",
                    heading: HeadingLevel.HEADING_1,
                    bidirectional: true,
                    spacing: { before: 600, after: 300 }
                })
            );

            const selectedSessions = (syllabus.sessions || [])
                .filter((_, index) => options.sessions.includes(index))
                .sort((a, b) => (a.number || 0) - (b.number || 0));

            selectedSessions.forEach(session => {
                children.push(
                    new Paragraph({
                        text: `מפגש ${session.number || ''}: ${session.topic || "ללא נושא"}`,
                        heading: HeadingLevel.HEADING_2,
                        bidirectional: true,
                        spacing: { before: 300, after: 150 },
                    })
                );

                if (options.sessionContent?.steps && session.steps?.length > 0) {
                    children.push(new Paragraph({ text: "מהלך השיעור:", bold: true, bidirectional: true }));
                    session.steps.forEach((step, idx) => {
                        children.push(
                            new Paragraph({
                                text: `${idx + 1}. ${step}`,
                                bidirectional: true,
                                indent: { start: 400 },
                                spacing: { after: 80 }
                            })
                        );
                    });
                }
            });
        }

        // 3. יצירת הקובץ
        const doc = new Document({
            sections: [{
                properties: {
                    type: "nextPage",
                    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
                },
                children: children,
            }],
        });

        // 4. אריזה והחזרה
        const buffer = await Packer.toUint8Array(doc); // שימוש ב-Uint8Array עבור Deno
        const base64 = arrayBufferToBase64(buffer);

        return new Response(JSON.stringify({ 
            file_base64: base64,
            filename: `Syllabus_${syllabusId}.docx`
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        return new Response(JSON.stringify({ 
            error: error.message,
            stack: error.stack 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

// חובה ב-Base44: לרשום את הפונקציה לשירות
Deno.serve(async (req) => {
  return await generateSyllabusWord(req);
});