import React, { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Message } from '../types/chat'
import { getBotResponse, type BotState } from '../utils/botLogic'

const initialMessages: Message[] = [
    {
        sender: 'bot',
        text: 'Welcome to DTC Infotech! How can we help you today?',
        time: ''
    }
]

export const useChatLogic = () => {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [userInput, setUserInput] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [awaitingHuman, setAwaitingHuman] = useState(false)
    const visitorDetailsRef = useRef<{ name?: string, contact?: string }>({})
    const [userId, setUserId] = useState<number | null>(() => {
        const saved = localStorage.getItem('chatUserId');
        return saved ? parseInt(saved, 10) : null;
    });
    const [botState, setBotState] = useState<BotState>('WELCOME')

    const lastAdminMsg = [...messages].reverse().find(m => m.sender === 'agent');
    const isSupportConnected = Boolean(lastAdminMsg && lastAdminMsg.text !== '[CONVERSATION_ENDED]');
    const isOOO = new Date().getHours() < 9 || new Date().getHours() >= 18;

    // Support Availability Timer
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (awaitingHuman && !isSupportConnected) {
            setIsTyping(true); // Spoofs active typing immediately
            timeout = setTimeout(async () => {
                setIsTyping(false);
                const genericMsg = 'We are currently experiencing high volume. Support agents are currently unavailable, but we have noted your request! We will reach out soon.';
                setMessages(prev => [...prev, { sender: 'bot', text: genericMsg, time: formatDistanceToNow(new Date()) }]);
                setAwaitingHuman(false);
                if (userId) {
                    await fetch("http://localhost/botchat/messages.php", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'send', sender: 'bot', message: genericMsg, user_id: userId })
                    });
                }
            }, 60000);
        } else if (isSupportConnected) {
            setIsTyping(false);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [awaitingHuman, isSupportConnected, userId]);

    const openChat = () => setIsOpen(true)
    const closeChat = () => setIsOpen(false)

    // Derived state for header & flows
    const visibleMessages = messages.map(m => {
        if (m.text === '[CONVERSATION_ENDED]') {
            if (m.sender === 'visitor') {
                return { ...m, sender: 'bot' as const, text: `Thank you for reaching out! Feel free to ask if you need anything else.` };
            }
            return { ...m, sender: 'bot' as const, text: initialMessages[0].text };
        }
        return m;
    }).filter(m => m.text !== '[REQUEST_HUMAN_ASSISTANCE]' && m.text !== '[CONVERSATION_ENDED]');

    // Polling for messages
    useEffect(() => {
        if (!userId || !isOpen) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch("http://localhost/botchat/messages.php", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fetch', user_id: userId })
                });
                const data = await response.json();

                if (data.status === 'success' && data.messages) {
                    setMessages(prevMessages => {
                        const formattedMessages: Message[] = data.messages.map((m: any, i: number) => {
                            const offsetFromEnd = data.messages.length - 1 - i;
                            const localIndex = prevMessages.length - 1 - offsetFromEnd;
                            const localMsg = prevMessages[localIndex];

                            const preserve = localMsg && localMsg.sender === m.sender && localMsg.text === m.message;

                            return {
                                sender: m.sender,
                                text: m.message,
                                time: formatDistanceToNow(new Date(m.created_at)),
                                agent_name: m.agent_name,
                                quickReplies: preserve ? localMsg.quickReplies : undefined,
                                widgets: preserve ? localMsg.widgets : undefined
                            };
                        });

                        const finalMessages = [initialMessages[0], ...formattedMessages];
                        return finalMessages;
                    });

                    // Don't turn off typing if we are waiting for a human
                    setIsTyping(prev => {
                        // We check the latest state using functional state to avoid stale closure
                        const latestMessages = data.messages;
                        const latestIsEnded = latestMessages[latestMessages.length - 1]?.message === '[CONVERSATION_ENDED]';
                        const latestIsAgent = latestMessages[latestMessages.length - 1]?.sender === 'agent';

                        // We shouldn't turn it off if it was turned on specifically to spoof agent typing during wait
                        // We will rely on setAwaitingHuman(true/false) to handle the spoofing
                        return prev;
                    });

                    const lastMsgServer = data.messages[data.messages.length - 1];
                    if (lastMsgServer) {
                        if (lastMsgServer.text === '[CONVERSATION_ENDED]') {
                            setAwaitingHuman(false);
                        } else if (lastMsgServer.sender === 'agent') {
                            setAwaitingHuman(false);
                        }
                    }
                }
            } catch (err) {
                console.error("Poll error", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [userId, isOpen]);

    const handleMessage = async (event?: React.FormEvent, textOverride?: string) => {
        if (event) event.preventDefault()

        const trimmed = (textOverride !== undefined ? textOverride : userInput).trim()
        if (!trimmed || (isTyping && !awaitingHuman)) return

        const customerMessage: Message = {
            sender: 'visitor',
            text: trimmed,
            time: formatDistanceToNow(new Date().toString())
        }

        setMessages((prev) => [...prev, customerMessage])
        setUserInput('')

        const shouldBotProcess = !awaitingHuman && !isSupportConnected;
        if (shouldBotProcess) setIsTyping(true);

        try {
            const response = await fetch("http://localhost/botchat/messages.php", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    sender: 'visitor',
                    message: trimmed,
                    user_id: userId
                })
            });

            const data = await response.json();

            let currentUserId = userId;

            if (data.status === 'success' && data.user_id) {
                if (!userId) {
                    setUserId(data.user_id);
                    currentUserId = data.user_id;
                    localStorage.setItem('chatUserId', data.user_id.toString());
                }
            }

            if (shouldBotProcess) {
                // Simulate network latency for bot
                await new Promise(r => setTimeout(r, 800));

                const { reply, nextState, capturedData } = getBotResponse(botState, trimmed);
                setBotState(nextState);

                if (capturedData) {
                    visitorDetailsRef.current = { ...visitorDetailsRef.current, ...capturedData }
                    fetch("http://localhost/botchat/conversations.php", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'update_visitor_details',
                            user_id: currentUserId,
                            visitor_name: visitorDetailsRef.current.name,
                            visitor_email: visitorDetailsRef.current.contact,
                            visitor_phone: visitorDetailsRef.current.contact
                        })
                    }).catch(e => console.error(e));
                }

                let finalBotReply = reply.text;
                const requestedHumanAssistance = finalBotReply === '[REQUEST_HUMAN_ASSISTANCE]';

                if (requestedHumanAssistance) {
                    finalBotReply = isOOO
                        ? "Our office is currently closed. Would you like to raise a ticket or end the conversation?"
                        : "Please wait while I connect you to our support team. A representative will be with you in a moment.";
                }

                reply.text = finalBotReply;
                reply.time = formatDistanceToNow(new Date());

                setMessages(prev => [...prev, reply]);

                await fetch("http://localhost/botchat/messages.php", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send',
                        sender: 'bot',
                        message: finalBotReply,
                        user_id: currentUserId
                    })
                });

                if (requestedHumanAssistance) {
                    await fetch("http://localhost/botchat/messages.php", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'send',
                            sender: 'bot',
                            message: '[REQUEST_HUMAN_ASSISTANCE]',
                            user_id: currentUserId
                        })
                    });
                }

                setIsTyping(false);

                // Do this extremely last so it triggers the useEffect spoof without being overridden!
                if (requestedHumanAssistance) {
                    setAwaitingHuman(true);
                }
            }

        } catch (err) {
            console.error("Send error", err);
            setIsTyping(false);
        }
    }

    const sendSystemAction = async (actionText: string) => {
        if (actionText === '[CONVERSATION_ENDED]') setAwaitingHuman(false);

        setMessages(prev => [...prev, { sender: 'visitor', text: actionText, time: formatDistanceToNow(new Date().toString()) }]);

        try {
            await fetch("http://localhost/botchat/messages.php", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', sender: 'visitor', message: actionText, user_id: userId })
            });
        } catch (e) { console.error(e); }
    }

    return {
        messages,
        visibleMessages,
        userInput,
        setUserInput,
        isOpen,
        isTyping,
        awaitingHuman,
        isSupportConnected,
        isOOO,
        lastAdminMsg,
        openChat,
        closeChat,
        handleMessage,
        sendSystemAction
    }
}
