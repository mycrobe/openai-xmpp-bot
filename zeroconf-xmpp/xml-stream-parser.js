const SaxesParser = require('saxes').SaxesParser;

const parser = new SaxesParser({
  xmlns: true,
});

let currentMessage = null;

parser.on('opentag', (node) => {
  if (node.name === 'stream:stream') {
    stream = {
      from: node.attributes.from.value,
      to: node.attributes.to.value,
    }
  } else if (node.name === 'message') {
    currentMessage = {
      from: node.attributes.from.value,
      to: node.attributes.to.value,
      type: node.attributes.type ? node.attributes.type.value : 'composing',
      body: '',
      html: '',
      composing: false,
    };
  } else if (currentMessage && node.name === 'body') {
    parser.on('text', (text) => {
      currentMessage.body += text;
    });
  } else if (currentMessage && node.name === 'html') {
    parser.on('text', (text) => {
      currentMessage.html += text;
    });
  } else if (currentMessage && node.name === 'composing') {
    currentMessage.composing = true;
  }
});

parser.on('closetag', (node) => {
  if (node.name === 'message') {
    if (currentMessage.body) {
      console.log(`Received message from ${currentMessage.from}: ${currentMessage.body.trim()}`);
    } else if (currentMessage.composing) {
      console.log(`${currentMessage.from} is typing...`);
    } else {
      console.log(`${currentMessage.from} stopped typing.`);
    }
  }
});

parser.on('error', (error) => {
  console.error('Parsing error:', error);
  parser.resume(); // Continue parsing after encountering an error
});

const checkExamples = () => {
  // Your example XMLs
  const exampleXMLs = [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<stream:stream to="Test XMPP Server" from="mulvaney@Arch" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">',
    '<message from="mulvaney@Arch" type="chat" to="Test XMPP Server"><body>yo</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div>yo</div></body></html></message>',
    '<message from="mulvaney@Arch" to="Test XMPP Server"><body></body><html xmlns="http://www.w3.org/1999/xhtml"></html><x xmlns="jabber:x:event"><id></id></x></message>',
    '<message from="mulvaney@Arch" type="chat" to="Test XMPP Server"><body>yo</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div>yo</div></body></html></message>',
    '<message from="mulvaney@Arch" to="Test XMPP Server"><body></body><html xmlns="http://www.w3.org/1999/xhtml"></html><x xmlns="jabber:x:event"><composing></composing><id></id></x></message>',
    '<message from="mulvaney@Arch" to="Test XMPP Server"><body></body><html xmlns="http://www.w3.org/1999/xhtml"></html><x xmlns="jabber:x:event"><id></id></x></message>',
  ];

  // Parse the example XMLs
  for (const xml of exampleXMLs) {
    console.dir(parseMessage(xml));
  }
}

const parseMessage = (messageString) => {
  currentMessage = null;
  stream = null;
  parser.write(messageString);
  return {
    message: currentMessage,
    stream: stream,
  };
}

exports.parseMessage = parseMessage;