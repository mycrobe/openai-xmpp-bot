import { SaxesParser } from 'saxes';

const parse = (messageString) => {
    const parser = new SaxesParser({
        xmlns: true,
    });

    parser.messages = [];

    parser.on('opentag', (node) => {
        let message = parser.messages[parser.messages.length - 1];
        if (node.name === 'message') {
            message = {
                from: node.attributes.from.value,
                to: node.attributes.to.value,
                type: node.attributes.type ? node.attributes.type.value : 'composing',
                body: '',
                composing: false,
            };
            parser.messages.push(message);  
        } else if (message && node.name === 'body') {
            parser.on('text', (text) => {
                if (!message.body) {
                    message.body = text;
                }
            });
        } else if (message && node.name === 'composing') {
            message.composing = true;
        }
    });
    
    parser.on('error', (error) => {
        console.error('Parsing error:', error, messageString);
    });

    parser.write(messageString);
    return parser;
};

const parseMessages = (messageString) => {
    const parser = parse(messageString);
    return parser.messages;
}

export default parseMessages;