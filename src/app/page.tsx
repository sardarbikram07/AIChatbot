"use client";
import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Bot, User, Sparkles, FileText } from "lucide-react";

const cn = (...classes: (string | undefined | null | boolean)[]) =>
  classes.filter(Boolean).join(" ");

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
}

const TypingIndicator = () => (
  <div className="flex items-center justify-start mb-4">
    <div className="flex items-center space-x-3 px-6 py-4 bg-gradient-to-r from-emerald-100/90 to-teal-100/90 rounded-3xl shadow-xl border border-emerald-200/50 backdrop-blur-sm max-w-xs">
      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full shadow-lg">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium text-emerald-800">AI is thinking</span>
        <div className="flex space-x-1 ml-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  </div>
);

export default function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [parsedPdfText, setParsedPdfText] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const GEMINI_API_KEY = "USE YOUR API KEY";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);
      const pdfjsLib = (window as any).pdfjsLib;

      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      setParsedPdfText(fullText);
    };
    reader.readAsArrayBuffer(file);
  };

  const buildGeminiPayload = (history: Message[], latestUserMsg: string) => {
    const contents = history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text.replace(/<br>/g, "\n") }],
    }));

    const fullUserText = parsedPdfText
      ? `${latestUserMsg}\n\n[PDF Content]\n${parsedPdfText}`
      : latestUserMsg;

    contents.push({
      role: "user",
      parts: [{ text: fullUserText }],
    });

    return { contents };
  };

  const callGeminiAPI = async (history: Message[], latestInput: string): Promise<string> => {
    const payload = buildGeminiPayload(history, latestInput);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        let responseText = data.candidates[0].content.parts[0].text;

        responseText = responseText
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/\n\*/g, "\n•")
          .replace(/^\*/g, "•")
          .replace(/\n\n/g, "\n")
          .replace(/\n/g, "<br>");

        return responseText;
      }

      return "Sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API error:", error);
      return "Sorry, an error occurred while processing your request.";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const aiResponse = await callGeminiAPI([...messages, userMessage], input);

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: "ai",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 text-white relative">
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-cyan-500/40 via-blue-500/40 to-indigo-600/40 backdrop-blur-md border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-white/25 rounded-full backdrop-blur-sm border border-white/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">ExpAI</h1>
          <span className="text-cyan-100 text-xs">Powered by Bikram</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-24 pb-40 px-4 space-y-6 z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <div className="text-white/95 space-y-3">
              <h3 className="text-2xl font-bold mb-3">Welcome to ExpAI!</h3>
              <p className="text-base text-white/80 max-w-md">
                Start a conversation and experience the power of AI. Ask me anything!
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-end space-x-3 animate-fade-in",
              msg.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.sender === "ai" && (
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex-shrink-0 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] px-6 py-4 rounded-3xl shadow-xl text-sm leading-relaxed",
                msg.sender === "user"
                  ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 rounded-br-lg"
                  : "bg-white/95 text-gray-800 border border-white/30 rounded-bl-lg"
              )}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
            {msg.sender === "user" && (
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex-shrink-0 shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900/90 via-blue-900/70 to-transparent backdrop-blur-xl border-t border-white/10 z-20">
        <div className="relative max-w-4xl mx-auto">
          <div className="relative flex items-center space-x-3 bg-white/95 rounded-2xl p-2 shadow-xl border border-cyan-400/30">
            <label htmlFor="file-upload" className="flex items-center space-x-2 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium">
              <FileText className="w-4 h-4" />
              <span>{uploadedFileName || 'Upload PDF'}</span>
              <input
                id="file-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="w-full bg-transparent border-0 text-gray-800 placeholder-gray-500 focus:ring-0 focus:outline-none px-4 py-3 text-sm font-medium"
                disabled={isTyping}
              />
            </div>
            <Button
              onClick={handleSend}
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white rounded-full p-3 shadow-lg border border-cyan-400/30"
              disabled={isTyping || !input.trim()}
            >
              <SendHorizonal className="h-5 w-5" />
            </Button>
          </div>

          {isTyping && (
            <div className="flex items-center justify-center mt-3 text-white/80 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                <span>AI is generating response...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
