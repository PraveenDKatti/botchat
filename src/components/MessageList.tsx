import { useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import type { Message } from '../types/chat'

type MessageListProps = {
    visibleMessages: Message[]
    isTyping: boolean
    awaitingHuman: boolean
    isSupportConnected: boolean
    isOOO: boolean
    sendSystemAction: (actionText: string) => void
    handleMessage: (e?: React.FormEvent, textOverride?: string) => void
}

const WIDGET_MAPPINGS: Record<string, string[]> = {
    '__UI_WELCOME__': ['Services', 'Consulting', 'Careers'],
    'Welcome to DTC Infotech! How can we help you today?': ['Services', 'Consulting', 'Careers'],
    'We offer a wide range of services including App Development, AI Solutions, and Cloud Architecture. Would you like to speak with an expert?': ['Yes, talk to expert', 'Main menu'],
    'Our consulting division specializes in enterprise technical transformation. Would you like to book a consultation?': ['Book a consultation', 'Main menu'],
    'We are always looking for top talent! Please leave your contact details so our HR team can reach out.': ['Leave contact details', 'Main menu'],
    'Thank you for sharing your details. How else can we help you?': ['Services', 'Consulting', 'Careers'],
    'Please select an option below:': ['Services', 'Consulting', 'Careers']
}

export const MessageList = ({
    visibleMessages,
    isTyping,
    awaitingHuman,
    isSupportConnected,
    isOOO,
    sendSystemAction,
    handleMessage
}: MessageListProps) => {
    const chatEndRef = useRef<HTMLDivElement | null>(null)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        })
    }

    useEffect(() => {
        scrollToBottom()
    }, [visibleMessages, isTyping])

    return (
        <main className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
                {visibleMessages.map((msg, index) => {
                    const dynamicQuickReplies = msg.quickReplies || WIDGET_MAPPINGS[msg.text]

                    return (
                        <div
                            key={`${msg.sender}-${index}`}
                            className={`flex w-full ${msg.sender === 'bot' || msg.sender === 'agent' ? 'justify-start' : 'justify-end'
                                }`}
                        >
                            <div
                                className={`flex max-w-[82%] flex-col ${msg.sender === 'bot' || msg.sender === 'agent' ? 'items-start' : 'items-end'
                                    }`}
                            >
                                {msg.text && (
                                    <div
                                        className={`rounded-2xl px-3 py-2 text-sm leading-6 ${msg.sender === 'bot' || msg.sender === 'agent'
                                            ? 'rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md bg-slate-200/60'
                                            : 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md bg-emerald-200/60'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                )}

                                {index !== 0 && (
                                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <span>
                                            {msg.sender === 'bot' ? 'Bot' : msg.sender === 'agent' ? (msg.agent_name || 'Support Agent') : 'You'}
                                        </span>
                                        {msg.sender === 'agent' && (
                                            <>
                                                <span>•</span>
                                                <span>{msg.time}</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                {dynamicQuickReplies && dynamicQuickReplies.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {dynamicQuickReplies.map((reply, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleMessage(undefined, reply)}
                                                className="text-[11px] whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-full px-3 py-1.5 transition shadow-sm font-medium"
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {isTyping && (
                    <div className="flex w-full justify-start">
                        <div className="flex max-w-[82%] flex-col items-start">
                            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-slate-200 px-3 py-2">
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                    <Bot size={10} />
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500"></span>
                                    <span
                                        className="h-2 w-2 animate-pulse rounded-full bg-slate-500"
                                        style={{ animationDelay: '150ms' }}
                                    ></span>
                                    <span
                                        className="h-2 w-2 animate-pulse rounded-full bg-slate-500"
                                        style={{ animationDelay: '300ms' }}
                                    ></span>
                                </div>
                            </div>

                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                    <Bot size={10} />
                                </div>
                                <span>Bot</span>
                                <span>•</span>
                                <span>typing...</span>
                            </div>
                        </div>
                    </div>
                )}

                {awaitingHuman && !isSupportConnected && isOOO && (
                    <div className="flex justify-center gap-3 mt-4 mb-2">
                        <button type="button" onClick={() => sendSystemAction('[TICKET_RAISED]')} className="text-xs font-semibold bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 shadow-sm transition">Raise Ticket</button>
                        <button type="button" onClick={() => sendSystemAction('[CONVERSATION_ENDED]')} className="text-xs font-semibold bg-slate-100 text-slate-700 px-4 py-2 rounded-full hover:bg-slate-200 shadow-sm transition">End Conversation</button>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>
        </main>
    )
}
