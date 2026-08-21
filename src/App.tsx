import './App.css'
import { ChevronDown, MessageCircleMore } from 'lucide-react'
import { useChatLogic } from './hooks/useChatLogic'
import { ChatHeader } from './components/ChatHeader'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'

function App() {
  const {
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
  } = useChatLogic()

  return (
    <>
      <button
        type="button"
        onClick={isOpen ? closeChat : openChat}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-900 text-white shadow-[0_10px_30px_rgba(37,99,235,0.5)] transition hover:scale-105"
        aria-label="Open chat"
      >
        {isOpen ? <ChevronDown size={28} /> : <MessageCircleMore size={28} />}
      </button>

      {isOpen && (
        <div className="fixed md:bottom-24 md:right-8 z-50 flex h-[100vh] w-[100vw] md:h-[80vh] md:w-[34vw] min-w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-lg shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
          <ChatHeader
            closeChat={closeChat}
            isTyping={isTyping}
            isSupportConnected={isSupportConnected}
            agentName={lastAdminMsg?.agent_name}
          />

          <MessageList
            visibleMessages={visibleMessages}
            isTyping={isTyping}
            awaitingHuman={awaitingHuman}
            isSupportConnected={isSupportConnected}
            isOOO={isOOO}
            sendSystemAction={sendSystemAction}
            handleMessage={handleMessage}
          />

          <ChatInput
            handleMessage={handleMessage}
            isTyping={isTyping}
            setUserInput={setUserInput}
            userInput={userInput}
            awaitingHuman={awaitingHuman}
          />
        </div>
      )}
    </>
  )
}

export default App
