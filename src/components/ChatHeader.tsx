import { X, EllipsisVertical } from 'lucide-react'
import logo from '../assets/dtc-infotech-icon.png'

type ChatHeaderProps = {
    isSupportConnected: boolean
    agentName?: string
    isTyping: boolean
    closeChat: () => void
}

export const ChatHeader = ({ isSupportConnected, agentName, isTyping, closeChat }: ChatHeaderProps) => {
    return (
        <header className="flex items-center justify-between bg-gradient-to-tr from-blue-800 to-[#071a3c] p-4 text-white">
            <div className="flex items-center gap-3">
                <div className="max-w-10 max-h-10">
                    <img src={logo} alt="DTCi" />
                </div>

                <div className="leading-tight">
                    <p className="font-semibold">{isSupportConnected ? (agentName || 'Support Agent') : 'Bot'}</p>
                    {(isTyping || isSupportConnected) && (
                        <p className="text-[10px] text-blue-100">
                            {isTyping ? 'typing...' : 'online'}
                        </p>
                    )}
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
    )
}
