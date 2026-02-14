import React, { useState, useEffect, useRef } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { AiIcon } from './icons/AiIcon';

export type CoEditorMessage = {
    id: string;
    sender: 'user' | 'bot';
    text: string;
};

interface CoEditorChatProps {
    messages: CoEditorMessage[];
    isTyping: boolean;
    onSendMessage: (message: string) => void;
}

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="currentColor" {...props}><path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"></path></svg>);
const TypingIndicator: React.FC = () => ( <div className="flex items-end gap-2 justify-start"> <div className="flex items-center gap-1.5 p-3 rounded-full bg-slate-200 dark:bg-slate-700"> <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span> <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span> <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span> </div> </div>);
function parseMarkdownToHTML(text: string) { let html = text.trim().replace(/`([^`]+)`/g, '<code>$1</code>'); html = html.replace(/\n/g, '<br />'); return html; }

const CoEditorChat: React.FC<CoEditorChatProps> = ({ messages, isTyping, onSendMessage }) => {
    const [userInput, setUserInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);
    
    const handleSubmit = () => {
        if (userInput.trim() && !isTyping) {
            onSendMessage(userInput);
            setUserInput('');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto chat-scrollbar">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'bot' && <AiIcon className="w-6 h-6 text-indigo-500 rounded-full flex-shrink-0" />}
                        <div 
                           className={`px-4 py-2 rounded-2xl max-w-xs text-sm break-words ${msg.sender === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}
                            dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(msg.text) }}
                        />
                    </div>
                ))}
                {isTyping && <TypingIndicator />}
                 <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t dark:border-slate-700">
                <div className="relative">
                    <input 
                        type="text"
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="e.g., Make Q2 harder"
                        disabled={isTyping}
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <button onClick={handleSubmit} disabled={isTyping || !userInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoEditorChat;
