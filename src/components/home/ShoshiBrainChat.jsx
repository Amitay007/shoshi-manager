import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, Bot } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function ShoshiBrainChat() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const scrollRef = useRef(null);

    // Initialize conversation
    useEffect(() => {
        const initChat = async () => {
            try {
                // Try to find existing conversation or create new one
                const conversations = await base44.agents.listConversations({ agent_name: "qa_expert" });
                let convId;
                
                if (conversations && conversations.length > 0) {
                    // Use the most recent conversation
                    convId = conversations[0].id;
                    setMessages(conversations[0].messages || []);
                } else {
                    // Create new
                    const newConv = await base44.agents.createConversation({
                        agent_name: "qa_expert",
                        metadata: { name: "Shoshi Brain Chat" }
                    });
                    convId = newConv.id;
                    // Add greeting if new
                    setMessages([{
                        role: "assistant",
                        content: "היי פרופסור, כאן מומחה ה-QA והביצועים שלך. אני מנטר את SystemDiagnostics ואת כלל ישויות המערכת באופן שוטף. שלח לי לוג או תרחיש, ואנתח אותו מיד."
                    }]);
                }
                
                setConversationId(convId);
            } catch (error) {
                console.error("Failed to init chat:", error);
            }
        };

        initChat();
    }, []);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!conversationId) return;

        const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
            if (data && data.messages) {
                setMessages(data.messages);
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [conversationId]);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim() || !conversationId) return;

        const content = inputValue;
        setInputValue("");
        setIsLoading(true);

        // Optimistic update
        setMessages(prev => [...prev, { role: "user", content }]);

        try {
            await base44.agents.addMessage(
                { id: conversationId },
                { role: "user", content }
            );
        } catch (error) {
            console.error("Failed to send message:", error);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b bg-gradient-to-r from-purple-50 to-white flex items-center gap-2">
                <div className="bg-purple-100 p-1.5 rounded-full">
                    <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-slate-800">ערוץ תקשורת ישיר</h3>
                    <p className="text-xs text-slate-500">מחובר לסוכן QA Expert</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden relative">
                <div 
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                            <Sparkles className="w-12 h-12 mb-4 opacity-50 text-purple-300" />
                            <p>המוח של שושי מוכן לפעולה.</p>
                            <p className="text-sm">שאל אותי על תקלות, עומסים או נתונים במערכת.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <MessageBubble key={idx} message={msg} />
                        ))
                    )}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs px-4">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            שושי חושבת...
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-50 border-t">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="הקלד הודעה לניתוח..."
                        className="bg-white border-slate-200 focus-visible:ring-purple-500"
                        dir="rtl"
                    />
                    <Button 
                        onClick={handleSend} 
                        disabled={isLoading || !inputValue.trim()}
                        size="icon"
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shrink-0"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}