import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  X,
  EllipsisVertical,
  ArrowUp,
  MessageCircleMore,
  Bot
} from 'lucide-react'
import logo from './assets/dtc-infotech-icon.png'
import { formatDistanceToNow } from 'date-fns'

type Message = {
  sender: 'bot' | 'user' | 'admin'
  text: string
  time: string
}

const initialMessages: Message[] = [
  {
    sender: 'bot',
    text: 'Hello! Welcome to DTC Infotech. How can I help you elevate your business today?',
    time: ''
  }
]

function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [userInput, setUserInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [awaitingHuman, setAwaitingHuman] = useState(false)
  const [userId, setUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem('chatUserId');
    return saved ? parseInt(saved, 10) : null;
  });
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    })
  }

  const openChat = () => setIsOpen(true)
  const closeChat = () => setIsOpen(false)

  // Derived state for header & flows
  const visibleMessages = messages.map(m => {
    if (m.text === '[CONVERSATION_ENDED]') {
      if (m.sender === 'user') {
        return { ...m, sender: 'bot' as const, text: `Thank you for reaching out! Feel free to ask if you need anything else.` };
      }
      return { ...m, sender: 'bot' as const, text: initialMessages[0].text };
    }
    return m;
  }).filter(m => !m.text.startsWith('['));
  const lastAdminMsg = [...messages].reverse().find(m => m.sender === 'admin');
  const isSupportConnected = lastAdminMsg && lastAdminMsg.text !== '[CONVERSATION_ENDED]';
  const isOOO = new Date().getHours() < 9 || new Date().getHours() >= 18;

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

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
          const formattedMessages: Message[] = data.messages.map((m: any) => ({
            sender: m.sender,
            text: m.message,
            time: formatDistanceToNow(new Date(m.created_at))
          }));

          // Prepend the initial welcome message from the bot
          // We always want to keep the initial bot greeting visually.
          const finalMessages = [initialMessages[0], ...formattedMessages];
          setMessages(finalMessages);
          setIsTyping(false);

          // Check if admin has replied to clear awaiting human state conceptually
          // We clear awaiting human if conversation ends or admin is in control
          const lastMsgServer = formattedMessages[formattedMessages.length - 1];
          if (lastMsgServer) {
            if (lastMsgServer.text === '[CONVERSATION_ENDED]') {
              setAwaitingHuman(false);
            } else if (lastMsgServer.sender === 'admin') {
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

  const handleMessage = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = userInput.trim()
    if (!trimmed || isTyping) return

    const customerMessage: Message = {
      sender: 'user',
      text: trimmed,
      time: formatDistanceToNow(new Date().toString())
    }

    // Attempting optimistic update
    setMessages((prev) => [...prev, customerMessage])
    setUserInput('')
    setIsTyping(true)

    try {
      const response = await fetch("http://localhost/botchat/messages.php", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          sender: 'user',
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

      // If we are awaiting human or admin connected, don't ask Gemini!
      if (!awaitingHuman && !isSupportConnected) {
        setIsTyping(true);
        // Call Gemini
        const geminiKey = "";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{
                text: `You are a helpful customer support agent for Example Company. 

About the company:
Example Company is an AI-first digital engineering organization bridging the gap between enterprise data and operational outcomes. We build, deploy, and maintain "production-grade" AI infrastructure (Agentic AI, Vision AI, Edge AI, Generative AI). 
Our proprietary tools include AppStudio, VisionStudio, and UnifyNow. 
Our Core Values: Customer-First, Responsible Innovation, Integrity & Transparency, Agility.

Answer user questions concisely based on this information. If the user explicitly asks for human assistance, a human agent, or real person, output EXPLICITLY the string '[REQUEST_HUMAN_ASSISTANCE]'. Do not say sorry just output the exact string.`
              }]
            },
            contents: [{ parts: [{ text: trimmed }] }]
          })
        });

        const gData = await geminiResponse.json();
        const rawAgentReply = gData.candidates?.[0]?.content?.parts?.[0]?.text || "I am having trouble connecting right now.";

        let finalBotReply = rawAgentReply;
        if (rawAgentReply.includes("[REQUEST_HUMAN_ASSISTANCE]")) {
          if (isOOO) {
            finalBotReply = "Our office is currently closed. Would you like to raise a ticket or end the conversation?";
          } else {
            finalBotReply = "Please wait while I connect you to our support team. A representative will be with you in approximately 1 minute.";
          }
          setAwaitingHuman(true);
        }

        // Send bot reply to PHP backend
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
        setIsTyping(false);
      }

    } catch (err) {
      console.error("Send error", err);
      setIsTyping(false);
    }
  }

  const sendSystemAction = async (actionText: string) => {
    if (actionText === '[CONVERSATION_ENDED]') setAwaitingHuman(false);

    // optimistically add
    setMessages(prev => [...prev, { sender: 'user', text: actionText, time: formatDistanceToNow(new Date().toString()) }]);

    try {
      await fetch("http://localhost/botchat/messages.php", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', sender: 'user', message: actionText, user_id: userId })
      });
    } catch (e) { console.error(e); }
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={openChat}
          className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-blue-900 text-white shadow-[0_10px_30px_rgba(37,99,235,0.5)] transition hover:scale-105"
          aria-label="Open chat"
        >
          <MessageCircleMore size={28} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-8 right-8 z-50 flex h-[72vh] w-[30vw] min-w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-lg shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
          <header className="flex items-center justify-between bg-gradient-to-tr from-blue-800 to-[#071a3c] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="max-w-10 max-h-10">
                <img src={logo} alt="DTCi" />
              </div>

              <div className="leading-tight">
                <p className="font-semibold">{isSupportConnected ? 'Support Agent' : 'AI Agent'}</p>
                <p className="text-[10px] text-blue-100">
                  {isTyping ? 'typing...' : 'online'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" aria-label="More options" className="opacity-90">
                <EllipsisVertical size={18} />
              </button>
              <button type="button" aria-label="Close chat" onClick={closeChat}>
                <X size={18} />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {visibleMessages.map((msg, index) => (
                <div
                  key={`${msg.sender}-${index}`}
                  className={`flex w-full ${msg.sender === 'bot' || msg.sender === 'admin' ? 'justify-start' : 'justify-end'
                    }`}
                >
                  <div
                    className={`flex max-w-[82%] flex-col ${msg.sender === 'bot' || msg.sender === 'admin' ? 'items-start' : 'items-end'
                      }`}
                  >
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm leading-6 ${msg.sender === 'bot' || msg.sender === 'admin'
                        ? 'rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md bg-slate-200/60'
                        : 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md bg-emerald-200/60'
                        }`}
                    >
                      {msg.text}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>
                        {msg.sender === 'bot' ? 'AI Agent' : msg.sender === 'admin' ? 'Support Agent' : 'You'}
                      </span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                  </div>
                </div>
              ))}

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
                      <span>AI Agent</span>
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

          <form onSubmit={handleMessage}>
            <div className="flex items-center justify-between gap-5 border-t border-gray-200 bg-white p-4 text-black">
              <input
                name="userInput"
                value={userInput}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-[16px] outline-none"
                type="text"
                placeholder="Type your requirement..."
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isTyping}
                className={`rounded-full p-2 text-white ${userInput.trim().length > 0 && !isTyping
                  ? 'bg-blue-900'
                  : 'bg-blue-900/40'
                  }`}
              >
                <ArrowUp size={24} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default App
