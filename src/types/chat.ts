export type Message = {
    sender: 'bot' | 'visitor' | 'agent'
    text: string
    time: string
    agent_name?: string
    quickReplies?: string[]
    widgets?: ('services' | 'consulting' | 'careers')[]
}
