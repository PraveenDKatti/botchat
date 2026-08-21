import type { Message } from '../types/chat'

export type BotState = 'WELCOME' | 'SERVICES' | 'CONSULTING' | 'CAREERS' | 'DATA_NAME' | 'DATA_CONTACT' | 'SERVICES_DATA_NAME' | 'SERVICES_DATA_CONTACT' | 'CONSULTING_DATA_NAME' | 'CONSULTING_DATA_CONTACT' | 'CAREERS_DATA_NAME' | 'CAREERS_DATA_CONTACT' | 'HANDOFF'

const generateReply = (text: string): Message => ({
    sender: 'bot',
    text,
    time: ''
})

export const getBotResponse = (currentState: BotState, userInput: string): { reply: Message, nextState: BotState, capturedData?: { name?: string, contact?: string } } => {
    const input = userInput.toLowerCase().trim()

    if (input.includes('main menu') || input === 'hi' || input === 'hello') {
        return {
            reply: generateReply('Welcome to DTC Infotech! How can we help you today?'),
            nextState: 'WELCOME'
        }
    }

    if (input.includes('help') || input.includes('expert') || input === 'care' || input.includes('support') || input.includes('human')) {
        return {
            reply: generateReply('I will connect you to an expert. First, please provide your full name:'),
            nextState: 'DATA_NAME'
        }
    }

    switch (currentState) {
        case 'WELCOME':
            if (input.includes('service')) {
                return {
                    reply: generateReply('We offer a wide range of services including App Development, AI Solutions, and Cloud Architecture. Would you like to speak with an expert?'),
                    nextState: 'SERVICES'
                }
            } else if (input.includes('consult')) {
                return {
                    reply: generateReply('Our consulting division specializes in enterprise technical transformation. Would you like to book a consultation?'),
                    nextState: 'CONSULTING'
                }
            } else if (input.includes('career')) {
                return {
                    reply: generateReply('We are always looking for top talent! Please leave your contact details so our HR team can reach out.'),
                    nextState: 'CAREERS'
                }
            } else {
                return {
                    reply: generateReply('Please select an option below:'),
                    nextState: 'WELCOME'
                }
            }

        case 'SERVICES':
            return {
                reply: generateReply('Please provide your full name:'),
                nextState: 'SERVICES_DATA_NAME'
            }

        case 'CONSULTING':
            return {
                reply: generateReply('Please provide your full name:'),
                nextState: 'CONSULTING_DATA_NAME'
            }

        case 'CAREERS':
            return {
                reply: generateReply('Please provide your full name:'),
                nextState: 'CAREERS_DATA_NAME'
            }

        case 'DATA_NAME':
            return {
                reply: generateReply('Please provide a valid email or phone number:'),
                nextState: 'DATA_CONTACT',
                capturedData: { name: userInput }
            }

        case 'SERVICES_DATA_NAME':
        case 'CONSULTING_DATA_NAME':
        case 'CAREERS_DATA_NAME':
            return {
                reply: generateReply('Please provide a valid email or phone number:'),
                nextState: currentState === 'SERVICES_DATA_NAME'
                    ? 'SERVICES_DATA_CONTACT'
                    : currentState === 'CONSULTING_DATA_NAME' ? 'CONSULTING_DATA_CONTACT' : 'CAREERS_DATA_CONTACT',
                capturedData: { name: userInput }
            }

        case 'DATA_CONTACT':
        case 'SERVICES_DATA_CONTACT':
        case 'CONSULTING_DATA_CONTACT':
        case 'CAREERS_DATA_CONTACT': {
            const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (phoneRegex.test(input) || emailRegex.test(input)) {
                const isDetailsOnlyFlow = currentState !== 'DATA_CONTACT'
                return {
                    reply: generateReply(isDetailsOnlyFlow
                        ? 'Thank you for sharing your details. How else can we help you?'
                        : '[REQUEST_HUMAN_ASSISTANCE]'),
                    nextState: isDetailsOnlyFlow ? 'WELCOME' : 'HANDOFF',
                    capturedData: { contact: userInput }
                }
            } else {
                return {
                    reply: generateReply('Invalid detail. Please provide a valid email or phone number:'),
                    nextState: currentState
                }
            }
        }

        case 'HANDOFF':
            return {
                reply: generateReply('[REQUEST_HUMAN_ASSISTANCE]'),
                nextState: 'HANDOFF'
            }

        default:
            return {
                reply: generateReply('__UI_WELCOME__'),
                nextState: 'WELCOME'
            }
    }
}
