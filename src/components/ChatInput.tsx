import React from 'react'
import { ArrowUp } from 'lucide-react'

type ChatInputProps = {
    userInput: string
    setUserInput: (val: string) => void
    handleMessage: (e: React.FormEvent) => void
    isTyping: boolean
    awaitingHuman?: boolean
}

export const ChatInput = ({ userInput, setUserInput, isTyping, awaitingHuman, handleMessage }: ChatInputProps) => {
    return (
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
                    disabled={!userInput.trim() || (isTyping && !awaitingHuman)}
                    className={`rounded-full p-2 text-white ${userInput.trim().length > 0 && !(isTyping && !awaitingHuman)
                        ? 'bg-blue-900'
                        : 'bg-blue-900/40'
                        }`}
                >
                    <ArrowUp size={24} />
                </button>
            </div>
        </form>
    )
}
